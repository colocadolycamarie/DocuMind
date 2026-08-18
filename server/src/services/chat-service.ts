import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { conversations, messages } from "../db/schema.js";
import { openai } from "../lib/openai.js";
import { env } from "../env.js";
import { retrieveRelevantChunks } from "./retrieval-service.js";
import { markDocumentQueried } from "./document-service.js";
import type {
  AskQuestionRequest,
  AskQuestionResponse,
  Conversation,
  Message,
  SourceChunk,
} from "@docu-mind/shared";

const answerSchema = z.object({
  answer: z.string(),
  confident: z.boolean(),
  citedChunkIds: z.array(z.string()),
});

export async function listConversations(): Promise<Conversation[]> {
  const rows = await db.query.conversations.findMany({
    orderBy: [desc(conversations.updatedAt)],
  });
  const counts = await getMessageCounts();
  return rows.map((row) => toConversationDto(row, counts.get(row.id) ?? 0));
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const rows = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [messages.createdAt],
  });

  const results: Message[] = [];
  for (const row of rows) {
    results.push(await toMessageDto(row));
  }
  return results;
}

export async function togglePinConversation(id: string, pinned: boolean) {
  await db.update(conversations).set({ pinned, updatedAt: new Date() }).where(eq(conversations.id, id));
}

/**
 * Core RAG loop: retrieve relevant chunks, ask the model to answer strictly
 * from them, and persist both the question and the grounded answer.
 */
export async function askQuestion(input: AskQuestionRequest): Promise<AskQuestionResponse> {
  const conversation = await getOrCreateConversation(input);

  const [userMessageRow] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      role: "user",
      content: input.question,
    })
    .returning();

  const relevantChunks = await retrieveRelevantChunks(input.question, {
    documentId: input.scope === "single-document" ? input.documentId ?? null : null,
  });

  const { answer, lowConfidence, citations } = await generateGroundedAnswer(
    input.question,
    relevantChunks,
  );

  const [assistantMessageRow] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      role: "assistant",
      content: answer,
      lowConfidence,
      citationChunkIds: citations.map((chunk) => chunk.id),
    })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  const uniqueDocumentIds = new Set(citations.map((chunk) => chunk.documentId));
  await Promise.all([...uniqueDocumentIds].map((id) => markDocumentQueried(id)));

  return {
    conversation: toConversationDto(
      { ...conversation, updatedAt: new Date() },
      (await getMessageCounts()).get(conversation.id) ?? 2,
    ),
    userMessage: {
      id: userMessageRow.id,
      conversationId: conversation.id,
      role: "user",
      content: input.question,
      lowConfidence: false,
      citations: [],
      createdAt: userMessageRow.createdAt.toISOString(),
    },
    assistantMessage: {
      id: assistantMessageRow.id,
      conversationId: conversation.id,
      role: "assistant",
      content: answer,
      lowConfidence,
      citations,
      createdAt: assistantMessageRow.createdAt.toISOString(),
    },
  };
}

async function generateGroundedAnswer(
  question: string,
  chunks: SourceChunk[],
): Promise<{ answer: string; lowConfidence: boolean; citations: SourceChunk[] }> {
  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't find a passage in the selected sources that directly addresses this question. Try rephrasing it, naming a document or clause, or uploading a source that covers this topic.",
      lowConfidence: true,
      citations: [],
    };
  }

  const context = chunks
    .map(
      (chunk) =>
        `[chunk_id=${chunk.id}] (source: "${chunk.documentName}"${chunk.page ? `, page ${chunk.page}` : ""})\n${chunk.content}`,
    )
    .join("\n\n---\n\n");

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are DocuMind, a careful research assistant. Answer ONLY using the provided source excerpts. " +
          "Never use outside knowledge. If the excerpts don't sufficiently answer the question, say so plainly " +
          'and set "confident" to false. Always list the chunk_id values you actually relied on in "citedChunkIds". ' +
          'Respond as JSON: {"answer": string, "confident": boolean, "citedChunkIds": string[]}.',
      },
      {
        role: "user",
        content: `Question: ${question}\n\nSource excerpts:\n\n${context}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = answerSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    return {
      answer: "I ran into an issue generating a grounded answer. Please try asking again.",
      lowConfidence: true,
      citations: [],
    };
  }

  const citedChunks = chunks.filter((chunk) => parsed.data.citedChunkIds.includes(chunk.id));

  return {
    answer: parsed.data.answer,
    lowConfidence: !parsed.data.confident || citedChunks.length === 0,
    citations: citedChunks.length > 0 ? citedChunks : chunks.slice(0, 1),
  };
}

async function getOrCreateConversation(
  input: AskQuestionRequest,
): Promise<typeof conversations.$inferSelect> {
  if (input.conversationId) {
    const existing = await db.query.conversations.findFirst({
      where: eq(conversations.id, input.conversationId),
    });
    if (existing) return existing;
  }

  const [created] = await db
    .insert(conversations)
    .values({
      title: input.question.slice(0, 120),
      documentId: input.documentId ?? null,
      scope: input.scope,
    })
    .returning();

  return created;
}

async function getMessageCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ conversationId: messages.conversationId, count: sql<number>`count(*)::int` })
    .from(messages)
    .groupBy(messages.conversationId);
  return new Map(rows.map((row) => [row.conversationId, row.count]));
}

async function toMessageDto(row: typeof messages.$inferSelect): Promise<Message> {
  const citations = row.citationChunkIds.length > 0 ? await resolveChunks(row.citationChunkIds) : [];
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    lowConfidence: row.lowConfidence,
    citations,
    createdAt: row.createdAt.toISOString(),
  };
}

async function resolveChunks(chunkIds: string[]): Promise<SourceChunk[]> {
  const { documentChunks, documents } = await import("../db/schema.js");
  const rows = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      documentName: documents.name,
      page: documentChunks.page,
      heading: documentChunks.heading,
      content: documentChunks.content,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(sql`${documentChunks.id} = ANY(${chunkIds})`);

  return rows.map((row) => ({
    ...row,
    contextBefore: null,
    contextAfter: null,
    similarity: 1,
  }));
}

function toConversationDto(
  row: typeof conversations.$inferSelect,
  messageCount: number,
): Conversation {
  return {
    id: row.id,
    title: row.title,
    documentId: row.documentId,
    scope: row.scope,
    pinned: row.pinned,
    messageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

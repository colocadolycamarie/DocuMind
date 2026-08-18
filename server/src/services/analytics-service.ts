import { sql, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents, messages, conversations } from "../db/schema.js";
import type { Analytics } from "@docu-mind/shared";

export async function getAnalytics(): Promise<Analytics> {
  const [documentCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      ready: sql<number>`count(*) filter (where ${documents.status} = 'ready')::int`,
    })
    .from(documents);

  const [conversationCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(conversations);

  const [questionStats] = await db
    .select({
      totalQuestions: sql<number>`count(*) filter (where ${messages.role} = 'assistant')::int`,
      lowConfidence: sql<number>`count(*) filter (where ${messages.role} = 'assistant' and ${messages.lowConfidence} = true)::int`,
    })
    .from(messages);

  const questionsPerDay = await db
    .select({
      date: sql<string>`to_char(${messages.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(eq(messages.role, "user"))
    .groupBy(sql`to_char(${messages.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${messages.createdAt}, 'YYYY-MM-DD')`)
    .limit(30);

  const topCited = await getTopCitedDocuments();

  return {
    totalDocuments: documentCounts?.total ?? 0,
    readyDocuments: documentCounts?.ready ?? 0,
    totalConversations: conversationCount?.total ?? 0,
    totalQuestions: questionStats?.totalQuestions ?? 0,
    lowConfidenceAnswers: questionStats?.lowConfidence ?? 0,
    questionsPerDay,
    topCitedDocuments: topCited,
  };
}

async function getTopCitedDocuments() {
  // citation_chunk_ids is a JSON array on each assistant message; expand it,
  // join back to the owning document, and rank by frequency.
  const result = await db.execute<{
    document_id: string;
    document_name: string;
    citation_count: number;
  }>(sql`
    SELECT d.id AS document_id, d.name AS document_name, count(*)::int AS citation_count
    FROM messages m
    CROSS JOIN LATERAL jsonb_array_elements_text(m.citation_chunk_ids) AS chunk_id
    JOIN document_chunks dc ON dc.id = chunk_id::uuid
    JOIN documents d ON d.id = dc.document_id
    WHERE m.role = 'assistant'
    GROUP BY d.id, d.name
    ORDER BY citation_count DESC
    LIMIT 5
  `);
  const rows = result.rows;

  const totalCitations = rows.reduce((sum, row) => sum + Number(row.citation_count), 0) || 1;

  return rows.map((row) => ({
    documentId: row.document_id,
    documentName: row.document_name,
    citationCount: Number(row.citation_count),
    sharePercent: Math.round((Number(row.citation_count) / totalCitations) * 1000) / 10,
  }));
}

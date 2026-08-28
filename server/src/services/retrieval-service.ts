import { sql, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { documentChunks, documents } from "../db/schema.js";
import type { SourceChunk } from "@docu-mind/shared";

const TOP_K = 8;

/**
 * Keyword-based retrieval (no embeddings / external API required). Scores
 * each chunk by how many distinct question keywords it contains, ranks
 * highest first, and falls back to the document's opening chunks when no
 * keyword overlap is found (e.g. broad requests like "summarize").
 */
export async function retrieveRelevantChunks(
  question: string,
  options: { documentId?: string | null } = {},
): Promise<SourceChunk[]> {
  const rows = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      documentName: documents.name,
      chunkIndex: documentChunks.chunkIndex,
      page: documentChunks.page,
      heading: documentChunks.heading,
      content: documentChunks.content,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(
      options.documentId
        ? sql`${documentChunks.documentId} = ${options.documentId} AND ${documents.status} = 'ready'`
        : sql`${documents.status} = 'ready'`,
    )
    .orderBy(documentChunks.chunkIndex);

  if (rows.length === 0) return [];

  const keywords = extractKeywords(question);
  const scored = rows.map((row) => ({ row, score: scoreChunk(row.content, keywords) }));
  const matched = scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
  const selected = matched.length > 0 ? matched.slice(0, TOP_K) : scored.slice(0, TOP_K);

  return selected.map(({ row, score }) => {
    const neighbors = getNeighborContext(rows, row.documentId, row.chunkIndex);
    return {
      id: row.id,
      documentId: row.documentId,
      documentName: row.documentName,
      page: row.page,
      heading: row.heading,
      content: row.content,
      contextBefore: neighbors.before,
      contextAfter: neighbors.after,
      similarity: matched.length > 0 ? Math.min(1, score / Math.max(keywords.length, 1)) : 0.5,
    } satisfies SourceChunk;
  });
}

function extractKeywords(question: string): string[] {
  const stopWords = new Set([
    "the","a","an","is","are","was","were","what","who","when","where","why","how",
    "do","does","did","of","in","on","at","to","for","and","or","this","that","it",
    "please","tell","me","about","summarize","summary",
  ]);
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word)),
    ),
  );
}

function scoreChunk(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const lowerContent = content.toLowerCase();
  return keywords.reduce((score, word) => (lowerContent.includes(word) ? score + 1 : score), 0);
}

function getNeighborContext(
  rows: { documentId: string; chunkIndex: number; content: string }[],
  documentId: string,
  chunkIndex: number,
) {
  const before = rows.find((r) => r.documentId === documentId && r.chunkIndex === chunkIndex - 1);
  const after = rows.find((r) => r.documentId === documentId && r.chunkIndex === chunkIndex + 1);
  return {
    before: before ? excerptTail(before.content) : null,
    after: after ? excerptHead(after.content) : null,
  };
}

function excerptTail(text: string, length = 140): string {
  return text.length > length ? `…${text.slice(-length)}` : text;
}

function excerptHead(text: string, length = 140): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

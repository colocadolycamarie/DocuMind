import { sql, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { documentChunks, documents } from "../db/schema.js";
import { embedText } from "../lib/openai.js";
import type { SourceChunk } from "@docu-mind/shared";

const TOP_K = 6;
const MIN_SIMILARITY = 0.2;

/**
 * Embeds the question and finds the most semantically similar chunks
 * using pgvector cosine distance (`<=>`). Cosine distance is converted to
 * similarity (1 - distance) so the UI can show an intuitive match score.
 */
export async function retrieveRelevantChunks(
  question: string,
  options: { documentId?: string | null } = {},
): Promise<SourceChunk[]> {
  const embedding = await embedText(question);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const distanceExpr = sql<number>`${documentChunks.embedding} <=> ${vectorLiteral}::vector`;

  const rows = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      documentName: documents.name,
      page: documentChunks.page,
      heading: documentChunks.heading,
      content: documentChunks.content,
      distance: distanceExpr,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(
      options.documentId
        ? sql`${documentChunks.documentId} = ${options.documentId} AND ${documents.status} = 'ready'`
        : sql`${documents.status} = 'ready'`,
    )
    .orderBy(distanceExpr)
    .limit(TOP_K);

  const withNeighbors = await Promise.all(
    rows.map(async (row) => {
      const similarity = 1 - row.distance;
      const neighbors = await getNeighborContext(row.documentId, row.id);
      return {
        id: row.id,
        documentId: row.documentId,
        documentName: row.documentName,
        page: row.page,
        heading: row.heading,
        content: row.content,
        contextBefore: neighbors.before,
        contextAfter: neighbors.after,
        similarity: Math.max(0, Math.round(similarity * 1000) / 1000),
      } satisfies SourceChunk;
    }),
  );

  return withNeighbors.filter((chunk) => chunk.similarity >= MIN_SIMILARITY);
}

async function getNeighborContext(documentId: string, chunkId: string) {
  const current = await db.query.documentChunks.findFirst({
    where: eq(documentChunks.id, chunkId),
  });
  if (!current) return { before: null, after: null };

  const [before, after] = await Promise.all([
    db.query.documentChunks.findFirst({
      where: sql`${documentChunks.documentId} = ${documentId} AND ${documentChunks.chunkIndex} = ${current.chunkIndex - 1}`,
    }),
    db.query.documentChunks.findFirst({
      where: sql`${documentChunks.documentId} = ${documentId} AND ${documentChunks.chunkIndex} = ${current.chunkIndex + 1}`,
    }),
  ]);

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

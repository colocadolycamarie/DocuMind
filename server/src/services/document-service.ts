import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents, documentChunks } from "../db/schema.js";
import { extractText } from "../lib/extract-text.js";
import { chunkPages } from "../lib/chunking.js";
import { embedTexts } from "../lib/embeddings.js";
import { storeFile, deleteFile, fetchFileBuffer } from "../lib/storage.js";
import { logger } from "../lib/logger.js";
import { ApiError } from "../middlewares/error-handler.js";
import type { Document } from "@docu-mind/shared";

export async function listDocuments(): Promise<Document[]> {
  const rows = await db.query.documents.findMany({
    orderBy: [desc(documents.createdAt)],
  });
  const chunkCounts = await getChunkCounts();
  return rows.map((row) => toDocumentDto(row, chunkCounts.get(row.id) ?? 0));
}

/**
 * Returns the raw database row (including storagePath) for internal use,
 * e.g. streaming the original file back to the client.
 */
export async function getDocumentRecordOrThrow(id: string) {
  const row = await db.query.documents.findFirst({ where: eq(documents.id, id) });
  if (!row) throw new ApiError(404, "Document not found");
  return row;
}

export async function getDocument(id: string): Promise<Document | null> {
  const row = await db.query.documents.findFirst({ where: eq(documents.id, id) });
  if (!row) return null;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id));
  return toDocumentDto(row, count);
}

export async function createDocumentRecord(input: {
  name: string;
  originalFileName: string;
  fileBuffer: Buffer;
  fileType: string;
  fileSizeBytes: number;
  collection: string;
  tags: string[];
  mimeType: string;
}) {
  const { fileBuffer, mimeType, ...rest } = input;
  const { url } = await storeFile(input.originalFileName, fileBuffer, mimeType);

  const [row] = await db
    .insert(documents)
    .values({ ...rest, storagePath: url, status: "queued" })
    .returning();
  return row;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const row = await db.query.documents.findFirst({ where: eq(documents.id, id) });
  if (!row) return false;

  await db.delete(documents).where(eq(documents.id, id));

  await deleteFile(row.storagePath).catch((error) => {
    logger.warn({ error, url: row.storagePath }, "Failed to remove stored file from blob storage");
  });

  return true;
}

export async function listCollections(): Promise<{ name: string; documentCount: number }[]> {
  const rows = await db
    .select({ collection: documents.collection, count: sql<number>`count(*)::int` })
    .from(documents)
    .groupBy(documents.collection);
  return rows.map((row) => ({ name: row.collection, documentCount: row.count }));
}

/**
 * Runs the full ingestion pipeline for a freshly uploaded document:
 * extract text -> chunk -> embed -> persist. Updates the document's
 * status as it progresses so the UI can reflect real state.
 */
export async function ingestDocument(documentId: string): Promise<void> {
  const row = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
  if (!row) throw new Error(`Document ${documentId} not found`);

  await setStatus(documentId, "processing");

  try {
    const fileBuffer = await fetchFileBuffer(row.storagePath);
    const pages = await extractText(fileBuffer, row.fileType);
    const chunks = chunkPages(pages);

    if (chunks.length === 0) {
      throw new Error("No extractable text was found in this document.");
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));

    await db.insert(documentChunks).values(
      chunks.map((chunk, index) => ({
        documentId,
        chunkIndex: index,
        content: chunk.content,
        page: chunk.page,
        heading: chunk.heading,
        embedding: embeddings[index],
      })),
    );

    await setStatus(documentId, "ready");
  } catch (error) {
    logger.error({ error, documentId }, "Document ingestion failed");
    await setStatus(
      documentId,
      "failed",
      error instanceof Error ? error.message : "Unknown ingestion error",
    );
  }
}

async function setStatus(id: string, status: Document["status"], errorMessage?: string) {
  await db
    .update(documents)
    .set({ status, errorMessage: errorMessage ?? null, updatedAt: new Date() })
    .where(eq(documents.id, id));
}

export async function markDocumentQueried(id: string) {
  await db.update(documents).set({ lastQueriedAt: new Date() }).where(eq(documents.id, id));
}

async function getChunkCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ documentId: documentChunks.documentId, count: sql<number>`count(*)::int` })
    .from(documentChunks)
    .groupBy(documentChunks.documentId);
  return new Map(rows.map((row) => [row.documentId, row.count]));
}

function toDocumentDto(row: typeof documents.$inferSelect, chunkCount: number): Document {
  return {
    id: row.id,
    name: row.name,
    originalFileName: row.originalFileName,
    fileType: row.fileType,
    fileSizeBytes: row.fileSizeBytes,
    collection: row.collection,
    tags: row.tags,
    status: row.status,
    errorMessage: row.errorMessage,
    chunkCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastQueriedAt: row.lastQueriedAt ? row.lastQueriedAt.toISOString() : null,
  };
}

import { put, del } from "@vercel/blob";
import { env } from "../env.js";

/**
 * All document files live in Vercel Blob rather than local disk, since
 * Vercel's serverless functions have an ephemeral, read-only filesystem.
 * This also means uploads work identically in local dev and production.
 */
export async function storeFile(
  fileName: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string }> {
  const blob = await put(fileName, buffer, {
    access: "public",
    contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
  });
  return { url: blob.url };
}

export async function deleteFile(url: string): Promise<void> {
  await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
}

export async function fetchFileBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch stored file (${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

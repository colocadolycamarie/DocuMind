import { env } from "../env.js";

/**
 * Embeddings via Google's Gemini API (gemini-embedding-001, truncated to
 * 768 output dimensions to match the DB schema). text-embedding-004 was
 * retired by Google on Jan 14, 2026 — gemini-embedding-001 is its replacement.
 * Groq does not offer an embeddings endpoint, so embeddings and chat
 * completions come from two different free providers.
 */
const GEMINI_MODEL = "gemini-embedding-001";
const GEMINI_OUTPUT_DIMENSIONALITY = 768;
const GEMINI_BATCH_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents`;

interface GeminiBatchEmbedResponse {
  embeddings: { values: number[] }[];
}

/**
 * Embeds a batch of text chunks. Gemini's batchEmbedContents accepts up to
 * 100 requests per call; we chunk defensively to stay under that limit.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await fetch(`${GEMINI_BATCH_EMBED_URL}?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: batch.map((text) => ({
          model: `models/${GEMINI_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: GEMINI_OUTPUT_DIMENSIONALITY,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini embedding request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as GeminiBatchEmbedResponse;
    for (const item of data.embeddings) {
      results.push(item.values);
    }
  }

  return results;
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

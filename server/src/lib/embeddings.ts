import { env } from "../env.js";

/**
 * Embeddings via Google's Gemini API (text-embedding-004, 768 dimensions).
 * Groq does not offer an embeddings endpoint, so embeddings and chat
 * completions come from two different free providers.
 */
const GEMINI_MODEL = "text-embedding-004";
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

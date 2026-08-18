import OpenAI from "openai";
import { env } from "../env.js";

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Embeds a batch of text chunks in one request. OpenAI allows up to 2048
 * inputs per request; we chunk defensively at 96 to keep payloads small
 * and requests fast.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const BATCH_SIZE = 96;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: batch,
    });
    for (const item of response.data) {
      results.push(item.embedding);
    }
  }

  return results;
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

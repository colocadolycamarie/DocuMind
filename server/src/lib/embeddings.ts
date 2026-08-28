import { pipeline, env as xenovaEnv } from "@xenova/transformers";

/**
 * Fully local embeddings via Transformers.js (all-MiniLM-L6-v2, 384 dims).
 * No external API, no API key, no quota — the model runs inside this
 * serverless function using ONNX Runtime. Model weights (~90MB) download
 * once per cold start from the Hugging Face CDN and are cached in /tmp,
 * the only writable directory on Vercel.
 */
xenovaEnv.cacheDir = "/tmp/transformers-cache";
xenovaEnv.allowLocalModels = false;

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

let extractorPromise: Promise<any> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_NAME);
  }
  return extractorPromise;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const results: number[][] = [];

  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }

  return results;
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

import OpenAI from "openai";
import { env } from "../env.js";

/**
 * Groq's API is OpenAI-compatible, so we reuse the official `openai` SDK
 * and simply point it at Groq's base URL with a Groq API key. Chat
 * completions run on Groq's free tier (subject to their rate limits).
 */
export const llm = new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

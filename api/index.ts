import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/src/app.js";

/**
 * Single serverless function that handles every /api/* route. Vercel
 * routes all API traffic here (see vercel.json), and the existing Express
 * app handles routing/middleware from there — no separate rewrite needed
 * per endpoint.
 */
const app = createApp();

export default function handler(request: VercelRequest, response: VercelResponse) {
  return app(request, response);
}

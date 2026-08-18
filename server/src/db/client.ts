import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../env.js";
import * as schema from "./schema.js";

/**
 * Uses Neon's HTTP driver rather than a persistent TCP connection pool.
 * Serverless functions (Vercel) spin up and freeze per-request, so a
 * long-lived pool doesn't fit the execution model and tends to exhaust
 * connections; the HTTP driver issues each query as a stateless request,
 * which works the same locally and in production.
 *
 * Requires a Neon Postgres database (https://neon.tech) with the pgvector
 * extension enabled — see README for setup.
 */
const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export type Database = typeof db;

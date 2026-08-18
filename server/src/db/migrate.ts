import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { env } from "../env.js";

/**
 * Runs all pending migrations. The pgvector extension must exist before
 * drizzle's generated migrations run, since the `embedding` column type
 * depends on it.
 */
async function main() {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log("Ensuring pgvector extension is enabled...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  console.log("Seeding default workspace settings row (if missing)...");
  await sql`
    INSERT INTO workspace_settings (id, workspace_name)
    VALUES (1, 'My workspace')
    ON CONFLICT (id) DO NOTHING
  `;

  console.log("Migrations complete.");
  await sql.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

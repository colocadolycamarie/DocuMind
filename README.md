# DocuMind

Ask questions of your documents and get answers grounded in citations you can verify. Upload PDFs,
Word docs, or text files; DocuMind extracts and indexes them, then answers questions using only what's
actually in your sources — flagging anything it can't confidently support.

Deployable to **Vercel** as a single project (static frontend + serverless API).

## What this is

A real, end-to-end RAG (retrieval-augmented generation) application:

- **Upload** → text extraction (PDF/DOCX/TXT/MD/CSV) → chunking → OpenAI embeddings → stored in Postgres
  (Neon) with `pgvector`. Files themselves are stored in Vercel Blob.
- **Ask** → your question is embedded, matched against stored chunks by cosine similarity, and sent to
  OpenAI along with the matched passages. The model is instructed to answer *only* from those passages
  and to say so when it can't — that's surfaced in the UI as a "limited supporting evidence" flag.
- **Every citation is real** — it links back to the actual document, page, and passage that produced it,
  and you can open the original file to verify it yourself.
- **Analytics** are computed from real usage: actual question counts, actual low-confidence rate, actual
  most-cited documents — not sample data.

There is no mock data, no hardcoded documents, no fake delays. Empty states show up when your workspace
is genuinely empty.

## Architecture

```
docu-mind/
├── api/       Vercel serverless function entry point (wraps the Express app)
├── client/    React 18 + Vite + TypeScript + Tailwind v4 — the workspace UI
├── server/    Express + TypeScript + Drizzle ORM — API, ingestion pipeline, RAG
├── shared/    Zod schemas shared by both, so the API contract can't drift
└── vercel.json   Routes /api/* to the function, everything else to the SPA
```

**Why this shape:** a plain client/server split with a shared types package is the smallest structure
that keeps the frontend and backend honest about their contract without extra build tooling. `api/index.ts`
is a thin adapter — the actual application logic lives in `server/`, so the same Express app can also run
as a normal long-lived Node process (see "Deploying somewhere other than Vercel" below).

## Why Neon + Vercel Blob specifically

Serverless functions (Vercel) have two constraints a normal Node server doesn't:

1. **No persistent filesystem** — uploaded files can't be written to local disk. Files are stored in
   **Vercel Blob** instead, and `documents.storagePath` holds a URL, not a path.
2. **No long-lived TCP connection pools** — a function that opens a normal Postgres connection per
   invocation quickly exhausts the database's connection limit under load. The app uses **Neon's HTTP
   driver** (`@neondatabase/serverless`), which issues each query as a stateless HTTPS request instead of
   holding a socket open. This means the database must be **Neon** specifically — a self-hosted or
   Dockerized Postgres won't work with this driver, even though the SQL/schema is standard Postgres.

Document ingestion (extract → chunk → embed → store) also runs **synchronously inside the upload
request**, not as a background job — serverless functions stop executing once a response is sent, so a
fire-and-forget task would simply be killed. This is why `vercel.json` sets the function's `maxDuration`
to 60s; very large documents may need a paid Vercel plan for the higher timeout ceiling, or you can lower
`CHUNK_SIZE_CHARS`/upload size limits if you expect large files on a stricter plan.

## Deploying to Vercel

### 1. Create the infrastructure

- **Database:** create a free project at [neon.tech](https://neon.tech). In the Neon SQL editor, run
  `CREATE EXTENSION IF NOT EXISTS vector;` once (or let `npm run db:migrate` do it — see below). Copy the
  connection string (the pooled one Neon gives you by default is fine).
- **File storage:** in your Vercel project, go to **Storage → Create → Blob**. This automatically injects
  `BLOB_READ_WRITE_TOKEN` into your deployment; copy the same token locally for `npm run dev`.
- **OpenAI:** grab an API key from [platform.openai.com](https://platform.openai.com/api-keys).

### 2. Set environment variables

In your Vercel project settings, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `OPENAI_API_KEY` | Your OpenAI key |
| `BLOB_READ_WRITE_TOKEN` | Auto-set when you create a Blob store; copy for local `.env` too |
| `NODE_ENV` | `production` (Vercel sets this automatically) |

Leave `VITE_API_BASE_URL` and `CLIENT_ORIGIN` unset in production — the client defaults to same-origin
`/api`, and CORS is a non-issue since both are served from the same domain.

### 3. Run migrations once, from your machine

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN
npm run db:migrate
```

This enables `pgvector`, creates all tables, and creates the HNSW vector index. Vercel doesn't run
migrations automatically on deploy — run this locally (or in CI) against the same `DATABASE_URL` whenever
the schema changes.

### 4. Deploy

Push to a Git repository and import it in Vercel, or run `vercel deploy` from the project root. Vercel
will detect `vercel.json`, run `npm run build -w client` for the static frontend, and build
`api/index.ts` as a serverless function automatically — no further configuration needed.

## Local development (without Vercel)

Local dev also talks to Neon + Blob (there's no local-only fallback, to keep one code path — see above).

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN
npm run db:migrate
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:4000/api

Upload a document from the workspace view, wait for it to move to "Ready", and ask it a question.

## Deploying somewhere other than Vercel

`server/` is a normal Express app (`server/src/index.ts` calls `app.listen`) and works unmodified on any
Node host — Railway, Render, Fly.io, a VPS. In that case you're not bound by the serverless constraints
above: you could point `DATABASE_URL` at any Postgres with `pgvector` (swap `db/client.ts` back to the
`postgres-js` driver used in `db/migrate.ts`) and store files on local disk or S3 instead of Vercel Blob.
Deploy `client/` as a static site (its own Vercel/Netlify project or served by the same host) pointing
`VITE_API_BASE_URL` at that server's URL.

## Notable implementation decisions

- **Storage:** Postgres + `pgvector` rather than a separate vector database. One database to operate,
  transactional consistency between documents/chunks/conversations, and `pgvector`'s HNSW index is fast
  enough for single-workspace scale. The retrieval query is isolated in
  `server/src/services/retrieval-service.ts` and can be swapped out if you outgrow it.
- **No auth yet:** this ships as a single, shared workspace. The schema doesn't assume single-tenancy
  forever — adding a `users` table and scoping `documents`/`conversations` by `userId` is a contained
  change when you need it.
- **Low-confidence detection:** the model is asked to self-report both whether it's confident and which
  chunks it actually used; answers are only shown as "confident" when both hold. This is enforced in
  `server/src/services/chat-service.ts`.
- **Synchronous ingestion:** required for serverless (see above) — uploads take as long as extraction +
  embedding actually takes, with the real error message surfaced if extraction fails (e.g. an unreadable
  scanned PDF), rather than a fire-and-forget job the UI polls for.

## What changed from the original Replit export

The original project (`Docu-Mind.zip`) was a Replit-generated UI mockup, not a working application: a
single 700-line `App.tsx` with hardcoded arrays simulating documents/citations/chat behind `setTimeout`
delays, a backend with exactly one route (a health check), and an empty database schema. It also carried
Replit-only scaffolding (`.replit`, `.local/skills`, `.agents/skills`, a pnpm-catalog workspace layout, a
code-generated OpenAPI client, an unused `mockup-sandbox` package) and a Replit design-system plugin the
buttons secretly depended on (`hover-elevate` utility classes and undefined CSS vars that don't exist
outside Replit's environment).

This rebuild replaced the mock data with a real ingestion + retrieval + generation pipeline, replaced the
Replit-specific scaffolding and plugin dependencies with standard Vite/Tailwind/Express, split the
700-line monolith into focused components/pages/hooks with real React Query hooks, pruned the UI kit from
55 generated shadcn components down to the 9 actually used, and applied a refreshed visual design (teal
primary / orange accent, Fira Sans for UI, Newsreader for document excerpts) with real loading, empty, and
error states throughout.

Both `client` and `server` typecheck, lint, and build cleanly (`npm run typecheck`, `npm run lint`,
`npm run build`); the schema has been validated by generating and inspecting real Drizzle migrations
against it.

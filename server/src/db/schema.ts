import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  vector,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

/**
 * Embedding dimension for Google Gemini's gemini-embedding-001 model,
 * truncated from its default 3072 down to 768 via outputDimensionality.
 * If you switch embedding models, update this and re-run migrations.
 */
export const EMBEDDING_DIMENSIONS = 384;

export const documentStatusEnum = pgEnum("document_status", [
  "queued",
  "processing",
  "ready",
  "failed",
]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const conversationScopeEnum = pgEnum("conversation_scope", [
  "all-documents",
  "single-document",
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  collection: text("collection").notNull().default("Unsorted"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  status: documentStatusEnum("status").notNull().default("queued"),
  errorMessage: text("error_message"),
  lastQueriedAt: timestamp("last_queried_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    page: integer("page"),
    heading: text("heading"),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    embeddingIndex: index("document_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    documentIdIndex: index("document_chunks_document_id_idx").on(table.documentId),
  }),
);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  scope: conversationScopeEnum("scope").notNull().default("all-documents"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    lowConfidence: boolean("low_confidence").notNull().default(false),
    citationChunkIds: jsonb("citation_chunk_ids").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIndex: index("messages_conversation_id_idx").on(table.conversationId),
  }),
);

export const workspaceSettings = pgTable("workspace_settings", {
  id: integer("id").primaryKey().default(1),
  workspaceName: text("workspace_name").notNull().default("My workspace"),
  showLowConfidenceWarnings: boolean("show_low_confidence_warnings").notNull().default(true),
  defaultScope: conversationScopeEnum("default_scope").notNull().default("all-documents"),
  theme: text("theme").notNull().default("system"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


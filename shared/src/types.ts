import { z } from "zod";

/**
 * Types shared between the client and server. Keeping these in one place
 * means the API contract can't drift between frontend and backend.
 */

export const documentStatusSchema = z.enum([
  "queued",
  "processing",
  "ready",
  "failed",
]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalFileName: z.string(),
  fileType: z.string(), // e.g. "pdf", "docx", "txt", "md", "csv"
  fileSizeBytes: z.number().int().nonnegative(),
  collection: z.string(),
  tags: z.array(z.string()),
  status: documentStatusSchema,
  errorMessage: z.string().nullable(),
  chunkCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastQueriedAt: z.string().nullable(),
});
export type Document = z.infer<typeof documentSchema>;

export const sourceChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentName: z.string(),
  page: z.number().int().nullable(),
  heading: z.string().nullable(),
  content: z.string(),
  contextBefore: z.string().nullable(),
  contextAfter: z.string().nullable(),
  similarity: z.number(),
});
export type SourceChunk = z.infer<typeof sourceChunkSchema>;

export const messageRoleSchema = z.enum(["user", "assistant"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  lowConfidence: z.boolean(),
  citations: z.array(sourceChunkSchema),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  documentId: z.string().nullable(),
  scope: z.enum(["all-documents", "single-document"]),
  pinned: z.boolean(),
  messageCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const askQuestionRequestSchema = z.object({
  conversationId: z.string().optional(),
  question: z.string().min(1).max(4000),
  documentId: z.string().nullable().optional(),
  scope: z.enum(["all-documents", "single-document"]).default("all-documents"),
});
export type AskQuestionRequest = z.infer<typeof askQuestionRequestSchema>;

export const askQuestionResponseSchema = z.object({
  conversation: conversationSchema,
  userMessage: messageSchema,
  assistantMessage: messageSchema,
});
export type AskQuestionResponse = z.infer<typeof askQuestionResponseSchema>;

export const settingsSchema = z.object({
  workspaceName: z.string(),
  showLowConfidenceWarnings: z.boolean(),
  defaultScope: z.enum(["all-documents", "single-document"]),
  theme: z.enum(["light", "dark", "system"]),
});
export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsRequestSchema = settingsSchema.partial();
export type UpdateSettingsRequest = z.infer<typeof updateSettingsRequestSchema>;

export const analyticsSchema = z.object({
  totalDocuments: z.number().int(),
  readyDocuments: z.number().int(),
  totalConversations: z.number().int(),
  totalQuestions: z.number().int(),
  lowConfidenceAnswers: z.number().int(),
  questionsPerDay: z.array(
    z.object({ date: z.string(), count: z.number().int() }),
  ),
  topCitedDocuments: z.array(
    z.object({
      documentId: z.string(),
      documentName: z.string(),
      citationCount: z.number().int(),
      sharePercent: z.number(),
    }),
  ),
});
export type Analytics = z.infer<typeof analyticsSchema>;

export const collectionSummarySchema = z.object({
  name: z.string(),
  documentCount: z.number().int(),
});
export type CollectionSummary = z.infer<typeof collectionSummarySchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const SUPPORTED_FILE_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv"] as const;
export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

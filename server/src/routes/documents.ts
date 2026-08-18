import path from "node:path";
import { Router } from "express";
import { upload } from "../middlewares/upload.js";
import { asyncHandler, ApiError } from "../middlewares/error-handler.js";
import * as documentService from "../services/document-service.js";
import { getDocumentRecordOrThrow } from "../services/document-service.js";

const router = Router();

router.get(
  "/documents",
  asyncHandler(async (_request, response) => {
    const documents = await documentService.listDocuments();
    response.json({ documents });
  }),
);

router.get(
  "/documents/collections",
  asyncHandler(async (_request, response) => {
    const collections = await documentService.listCollections();
    response.json({ collections });
  }),
);

router.get(
  "/documents/:id",
  asyncHandler(async (request, response) => {
    const document = await documentService.getDocument(request.params.id);
    if (!document) throw new ApiError(404, "Document not found");
    response.json({ document });
  }),
);

router.post(
  "/documents",
  upload.single("file"),
  asyncHandler(async (request, response) => {
    if (!request.file) throw new ApiError(400, "A file is required");

    const fileType = path.extname(request.file.originalname).slice(1).toLowerCase();
    const collection = (request.body.collection as string) || "Unsorted";
    const tags = parseTags(request.body.tags);

    const row = await documentService.createDocumentRecord({
      name: request.file.originalname,
      originalFileName: request.file.originalname,
      fileBuffer: request.file.buffer,
      mimeType: request.file.mimetype || "application/octet-stream",
      fileType,
      fileSizeBytes: request.file.size,
      collection,
      tags,
    });

    // Ingestion runs synchronously within the request: serverless functions
    // (e.g. Vercel) don't keep executing after the response is sent, so a
    // fire-and-forget background task would simply be killed. Vercel's
    // function timeout must be set high enough for this (see vercel.json).
    await documentService.ingestDocument(row.id);

    const document = await documentService.getDocument(row.id);
    response.status(201).json({ document });
  }),
);

router.get(
  "/documents/:id/file",
  asyncHandler(async (request, response) => {
    const record = await getDocumentRecordOrThrow(request.params.id);
    response.redirect(302, record.storagePath);
  }),
);

router.delete(
  "/documents/:id",
  asyncHandler(async (request, response) => {
    const deleted = await documentService.deleteDocument(request.params.id);
    if (!deleted) throw new ApiError(404, "Document not found");
    response.status(204).send();
  }),
);

function parseTags(raw: unknown): string[] {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default router;

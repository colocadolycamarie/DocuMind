import path from "node:path";
import multer from "multer";
import { SUPPORTED_FILE_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES } from "@docu-mind/shared";

/**
 * Files are held in memory only long enough to hand off to Vercel Blob
 * (see lib/storage.ts) — no local disk writes, since serverless functions
 * don't have a writable, persistent filesystem.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (_request, file, callback) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (!SUPPORTED_FILE_EXTENSIONS.includes(ext as (typeof SUPPORTED_FILE_EXTENSIONS)[number])) {
      callback(new Error(`Unsupported file type ".${ext}". Supported: ${SUPPORTED_FILE_EXTENSIONS.join(", ")}`));
      return;
    }
    callback(null, true);
  },
});

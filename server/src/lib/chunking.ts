import type { ExtractedPage } from "./extract-text.js";

export interface TextChunk {
  content: string;
  page: number | null;
  heading: string | null;
}

const CHUNK_SIZE_CHARS = 1200;
const CHUNK_OVERLAP_CHARS = 200;
// Chunks shorter than this are almost always junk fragments (e.g. leftover
// tail slivers, or garbled 1-2 word artifacts from PDFs with broken font
// encoding) rather than useful content — skip them so they never win a
// similarity match over real content.
const MIN_CHUNK_LENGTH = 40;
const HEADING_PATTERN = /^(#{1,6}\s+.+|[A-Z][A-Za-z0-9 ,&/-]{3,80})$/;

/**
 * Splits extracted page text into overlapping chunks suitable for
 * embedding. Overlap preserves context across chunk boundaries so answers
 * don't lose meaning mid-sentence.
 */
export function chunkPages(pages: ExtractedPage[]): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (const page of pages) {
    const normalized = page.text.replace(/\s+/g, " ").trim();
    if (!normalized) continue;

    const currentHeading = detectHeading(page.text) ?? null;
    let start = 0;

    while (start < normalized.length) {
      const end = Math.min(start + CHUNK_SIZE_CHARS, normalized.length);
      const slice = normalized.slice(start, end);
      const boundary = findSentenceBoundary(slice);
      const content = boundary > 0 ? slice.slice(0, boundary) : slice;
      const trimmed = content.trim();

      if (trimmed.length >= MIN_CHUNK_LENGTH) {
        chunks.push({ content: trimmed, page: page.page, heading: currentHeading });
      }

      const advance = content.length || CHUNK_SIZE_CHARS;
      start += Math.max(advance - CHUNK_OVERLAP_CHARS, 1);
    }
  }

  // If a page's entire text was shorter than MIN_CHUNK_LENGTH, keep it
  // anyway rather than silently dropping the whole document.
  if (chunks.length === 0) {
    for (const page of pages) {
      const normalized = page.text.replace(/\s+/g, " ").trim();
      if (normalized) {
        chunks.push({ content: normalized, page: page.page, heading: detectHeading(page.text) ?? null });
      }
    }
  }

  return chunks;
}

function findSentenceBoundary(text: string): number {
  const lastPeriod = text.lastIndexOf(". ");
  if (lastPeriod > text.length * 0.5) return lastPeriod + 1;
  return text.length;
}

function detectHeading(pageText: string): string | undefined {
  const firstLine = pageText.split("\n").find((line) => line.trim().length > 0);
  if (firstLine && HEADING_PATTERN.test(firstLine.trim())) {
    return firstLine.trim().replace(/^#{1,6}\s+/, "");
  }
  return undefined;
}

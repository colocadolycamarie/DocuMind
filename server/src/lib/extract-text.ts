import mammoth from "mammoth";

export interface ExtractedPage {
  page: number | null;
  text: string;
}

/**
 * Extracts plain text from a supported document, given its raw bytes.
 * PDFs return per-page text so citations can reference a page number;
 * other formats return a single "page".
 */
export async function extractText(buffer: Buffer, fileType: string): Promise<ExtractedPage[]> {
  switch (fileType) {
    case "pdf":
      return extractPdf(buffer);
    case "docx":
      return extractDocx(buffer);
    case "txt":
    case "md":
    case "csv":
      return extractPlainText(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractedPage[]> {
  // pdf-parse doesn't natively split by page in its default export, but it
  // exposes a pagerender hook we use to capture text per page.
  const pdfParse = (await import("pdf-parse")).default;
  const pages: string[] = [];

  await pdfParse(buffer, {
    pagerender: async (pageData: {
      getTextContent: () => Promise<{ items: { str: string }[] }>;
    }) => {
      const content = await pageData.getTextContent();
      const text = content.items.map((item) => item.str).join(" ");
      pages.push(text);
      return text;
    },
  });

  return pages.map((text, index) => ({ page: index + 1, text }));
}

async function extractDocx(buffer: Buffer): Promise<ExtractedPage[]> {
  const result = await mammoth.extractRawText({ buffer });
  return [{ page: null, text: result.value }];
}

async function extractPlainText(buffer: Buffer): Promise<ExtractedPage[]> {
  return [{ page: null, text: buffer.toString("utf-8") }];
}

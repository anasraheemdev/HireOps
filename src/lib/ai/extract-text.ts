import "server-only";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

export function isSupportedResumeMime(mime: string, fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (mime === PDF_MIME || lower.endsWith(".pdf")) return true;
  if (mime === DOCX_MIME || lower.endsWith(".docx")) return true;
  if (mime === DOC_MIME || lower.endsWith(".doc")) return true;
  return false;
}

/** Extract plain text from a resume buffer (PDF or DOCX). */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase();
  const isPdf = mimeType === PDF_MIME || lower.endsWith(".pdf");
  const isDocx = mimeType === DOCX_MIME || lower.endsWith(".docx") || mimeType === DOC_MIME || lower.endsWith(".doc");

  if (isPdf) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return (result.text || "").trim();
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }

  throw new Error(`Unsupported resume format: ${mimeType || fileName}`);
}

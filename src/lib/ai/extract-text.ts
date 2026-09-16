import "server-only";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isSupportedResumeMime(mime: string, fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (mime === PDF_MIME || lower.endsWith(".pdf")) return true;
  if (mime === DOCX_MIME || lower.endsWith(".docx") || lower.endsWith(".doc")) return true;
  if (mime.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".rtf")) return true;
  return false;
}

/** Extract plain text from a resume buffer (PDF, DOCX, DOC, TXT). */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const lower = fileName.toLowerCase();
  const isPdf = mimeType === PDF_MIME || lower.endsWith(".pdf");
  const isDocx = mimeType === DOCX_MIME || lower.endsWith(".docx") || lower.endsWith(".doc");
  const isTxt = mimeType.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".rtf");

  if (isPdf) {
    try {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        if (result.text && result.text.trim().length > 0) {
          return result.text.trim();
        }
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } catch (pdfErr) {
      console.warn("[extractResumeText] PDFParse error, attempting fallback buffer extraction:", pdfErr);
    }

    // Fallback PDF text extraction from raw buffer text objects
    const rawText = buffer.toString("binary");
    const matches = rawText.match(/\(([^)]+)\)\s*T[jJ]/g) || rawText.match(/\/Text\s*\(([^)]+)\)/g);
    if (matches && matches.length > 0) {
      const extracted = matches.map((m) => m.replace(/^[^(]*\(/, "").replace(/\)[^)]*$/, "")).join(" ");
      if (extracted.trim().length > 20) return extracted.trim();
    }
    const cleaned = buffer.toString("utf-8").replace(/[^\x09\x0A\x0D\x20-\x7E\u0600-\u06FF]/g, " ");
    const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 10) return words.join(" ");
  }

  if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (docErr) {
      console.warn("[extractResumeText] mammoth DOCX extraction warning:", docErr);
    }
  }

  if (isTxt || isDocx) {
    const text = buffer.toString("utf-8").replace(/[^\x09\x0A\x0D\x20-\x7E\u0600-\u06FF]/g, " ");
    if (text.trim().length > 0) return text.trim();
  }

  throw new Error(`Unsupported or unreadable resume format: ${mimeType || fileName}`);
}

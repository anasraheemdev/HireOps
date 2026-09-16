import "server-only";
import { inflateSync, unzipSync } from "node:zlib";
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

/** Pure JavaScript PDF stream text extractor (Zero native dependencies, 100% serverless resilient) */
export function extractPdfTextPureJS(buffer: Buffer): string {
  const extractedChunks: string[] = [];
  const binary = buffer.toString("binary");

  // Find all stream blocks in the PDF binary
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(binary)) !== null) {
    const rawStream = match[1];
    let decompressed = "";

    // 1. Attempt zlib inflation
    try {
      const streamBuf = Buffer.from(rawStream, "binary");
      const inflated = inflateSync(streamBuf);
      decompressed = inflated.toString("utf-8");
    } catch {
      try {
        const streamBuf = Buffer.from(rawStream, "binary");
        const unzipped = unzipSync(streamBuf);
        decompressed = unzipped.toString("utf-8");
      } catch {
        try {
          const streamBuf = Buffer.from(rawStream, "binary");
          if (streamBuf.length > 2) {
            const inflated = inflateSync(streamBuf.subarray(2));
            decompressed = inflated.toString("utf-8");
          }
        } catch {
          decompressed = rawStream;
        }
      }
    }

    if (!decompressed) continue;

    // 2. Parse text operators ((...) Tj and [(...)] TJ)
    const textOps = decompressed.match(/\(([^)]+)\)\s*T[jJ]/g) ||
                    decompressed.match(/\[((?:\([^)]*\)\s*|-?\d+\s*)+)\]\s*TJ/gi);

    if (textOps && textOps.length > 0) {
      for (const op of textOps) {
        const parentheticalStrings = op.match(/\(([^)]+)\)/g);
        if (parentheticalStrings) {
          const cleanStr = parentheticalStrings
            .map((s) => s.slice(1, -1).replace(/\\([()])/g, "$1").replace(/\\/g, ""))
            .join("");
          if (cleanStr.trim().length > 0) {
            extractedChunks.push(cleanStr);
          }
        }
      }
    } else {
      // 3. Fallback: Search parenthetical text elements inside decompressed stream
      const strings = decompressed.match(/\(([^()]{2,})\)/g);
      if (strings && strings.length > 0) {
        for (const s of strings) {
          const clean = s.slice(1, -1).replace(/\\([()])/g, "$1").replace(/\\/g, "").trim();
          if (
            clean.length >= 2 &&
            !clean.startsWith("/") &&
            !clean.startsWith("Font") &&
            !/^[0-9a-fA-F]{6,}$/.test(clean) &&
            /[a-zA-Z0-9\u0600-\u06FF]/.test(clean)
          ) {
            extractedChunks.push(clean);
          }
        }
      }
    }
  }

  // 4. Fallback for uncompressed PDF raw text if streams produced nothing
  if (extractedChunks.length === 0) {
    const matches = binary.match(/\(([^)]+)\)\s*T[jJ]/g) || binary.match(/\/Text\s*\(([^)]+)\)/g);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        const text = m.replace(/^[^(]*\(/, "").replace(/\)[^)]*$/, "").trim();
        if (text.length > 0) extractedChunks.push(text);
      }
    }
  }

  // Final cleaned text string
  const fullText = extractedChunks
    .join(" ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u0600-\u06FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return fullText;
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
    // 1. Try pdf-parse dynamically if available
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        if (result?.text && result.text.trim().length > 0) {
          return result.text.trim();
        }
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } catch (pdfErr) {
      console.warn("[extractResumeText] PDFParse dynamic import/parse error, falling back to pure JS stream extraction:", pdfErr);
    }

    // 2. Pure JavaScript PDF Stream Extractor (Fault-Tolerant for AWS Amplify / Serverless)
    try {
      const pureJsText = extractPdfTextPureJS(buffer);
      if (pureJsText && pureJsText.length >= 20) {
        return pureJsText;
      }
    } catch (pureJsErr) {
      console.warn("[extractResumeText] Pure JS PDF extraction warning:", pureJsErr);
    }

    // 3. Fallback raw text string cleanup
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

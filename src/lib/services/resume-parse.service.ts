import "server-only";
import { getAIProvider } from "@/lib/ai";
import { extractResumeText, isSupportedResumeMime } from "@/lib/ai/extract-text";
import { PARSE_SYSTEM_PROMPT, parsedResumeSchema, type ParsedResume } from "@/lib/ai/resume-schema";

export type ParseResumeResult = {
  parsed: ParsedResume;
  resumeText: string;
  confidence: number;
  warnings: string[];
};

function computeConfidence(parsed: ParsedResume, resumeText: string): { confidence: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 40;

  if (parsed.fullName) score += 10;
  if (parsed.email) score += 12;
  else warnings.push("Email could not be confidently extracted");
  if (parsed.phone) score += 8;
  else warnings.push("Phone number could not be confidently extracted");
  if (parsed.headline) score += 5;
  if (parsed.location) score += 4;
  if (parsed.skills.length >= 3) score += 8;
  else if (parsed.skills.length === 0) warnings.push("No skills detected");
  if (parsed.experience.length > 0) score += 8;
  else warnings.push("No work experience detected");
  if (parsed.education.length > 0) score += 5;
  if (resumeText.length < 200) {
    score -= 15;
    warnings.push("Resume text is very short — OCR quality may be low");
  }

  return { confidence: Math.max(15, Math.min(98, score)), warnings };
}

export async function parseResumeBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParseResumeResult> {
  if (!isSupportedResumeMime(mimeType, fileName)) {
    throw new Error("Unsupported file type. Upload PDF or DOCX.");
  }
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error("File exceeds 10MB limit.");
  }

  const resumeText = await extractResumeText(buffer, mimeType, fileName);
  if (!resumeText || resumeText.length < 40) {
    throw new Error("Could not extract enough text from the resume. Try a text-based PDF or DOCX.");
  }

  const provider = getAIProvider();
  const raw = await provider.chatJSON(
    [
      { role: "system", content: PARSE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Parse this resume into the required JSON schema:\n\n---\n${resumeText.slice(0, 14000)}\n---`,
      },
    ],
    { temperature: 0.1, maxTokens: 2500 }
  );

  const parsed = parsedResumeSchema.parse(raw);
  const { confidence, warnings } = computeConfidence(parsed, resumeText);

  return { parsed, resumeText, confidence, warnings };
}

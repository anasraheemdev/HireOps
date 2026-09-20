import "server-only";
import { getAIProvider } from "@/lib/ai";
import { extractResumeText, isSupportedResumeMime } from "@/lib/ai/extract-text";
import { PARSE_SYSTEM_PROMPT, parsedResumeSchema, type ParsedResume } from "@/lib/ai/resume-schema";
import { ApiError } from "@/lib/api/helpers";

export type ParseResumeResult = {
  parsed: ParsedResume;
  resumeText: string;
  confidence: number;
  warnings: string[];
};

function computeConfidence(parsed: ParsedResume, resumeText: string): { confidence: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 40;

  if (parsed.fullName && parsed.fullName !== "Candidate") score += 10;
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
  if (resumeText.length < 150) {
    score -= 15;
    warnings.push("Resume text is short — document may be an image scan");
  }

  return { confidence: Math.max(15, Math.min(98, score)), warnings };
}

export async function parseResumeBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParseResumeResult> {
  if (!buffer || buffer.byteLength === 0) {
    throw new ApiError(400, "Empty document uploaded. Please select a valid PDF or DOCX file.");
  }
  if (!isSupportedResumeMime(mimeType, fileName)) {
    throw new ApiError(400, `Unsupported file format (${fileName}). Upload a valid PDF or DOCX file up to 10MB.`);
  }
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new ApiError(400, "File exceeds 10MB limit. Upload a smaller PDF or DOCX.");
  }

  let resumeText = "";
  try {
    resumeText = await extractResumeText(buffer, mimeType, fileName);
  } catch (extractErr) {
    if (extractErr instanceof ApiError) throw extractErr;
    throw new ApiError(400, `Could not read document contents (${fileName}). Ensure the file is not password-protected or corrupted.`);
  }

  const cleanAlphanumeric = resumeText.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "");
  if (!resumeText || cleanAlphanumeric.length < 20) {
    throw new ApiError(
      400,
      "No readable text found in document. If this is a scanned image or scanned PDF, please upload a text-based PDF or DOCX file."
    );
  }

  let raw: unknown = null;
  try {
    const provider = await getAIProvider();
    raw = await provider.chatJSON(
      [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract candidate profile data into JSON from untrusted document input:\n\n<DOCUMENT>\n${resumeText.slice(0, 14000)}\n</DOCUMENT>`,
        },
      ],
      { temperature: 0.1, maxTokens: 2500 }
    );
  } catch (aiErr) {
    console.error("[parseResumeBuffer] AI provider parse error:", aiErr);
    throw new ApiError(500, "AI parsing service encountered an error. Please try again or fill in profile fields manually.");
  }

  let parsed: ParsedResume;
  try {
    parsed = parsedResumeSchema.parse(raw ?? {});
  } catch (schemaErr) {
    console.warn("[parseResumeBuffer] Schema validation warning, using fallback parsed shape:", schemaErr);
    parsed = {
      fullName: fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
      headline: "Candidate Profile",
      summary: null,
      email: null,
      phone: null,
      location: null,
      nationality: null,
      experienceYears: 0,
      skills: [],
      languages: [],
      certifications: [],
      experience: [],
      education: [],
    };
  }

  // Ensure default candidate name if AI extracted blank name
  if (!parsed.fullName || parsed.fullName === "Candidate") {
    const nameFromFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
    if (nameFromFileName.length > 2) {
      parsed.fullName = nameFromFileName.charAt(0).toUpperCase() + nameFromFileName.slice(1);
    }
  }

  const { confidence, warnings } = computeConfidence(parsed, resumeText);
  return { parsed, resumeText, confidence, warnings };
}

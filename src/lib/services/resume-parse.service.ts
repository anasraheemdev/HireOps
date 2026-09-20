import { getAIProvider, resolveAIConfig } from "@/lib/ai";
import { extractResumeText, isSupportedResumeMime } from "@/lib/ai/extract-text";
import { PARSE_SYSTEM_PROMPT, parsedResumeSchema, type ParsedResume } from "@/lib/ai/resume-schema";
import { ApiError } from "@/lib/api/helpers";
import type { AICategoryError, ResumeParseDiagnostics } from "@/lib/ai/types";
import { AIProviderError } from "@/lib/ai/types";

export type ParseResumeResult = {
  parsed: ParsedResume;
  resumeText: string;
  confidence: number;
  warnings: string[];
  correlationId: string;
  aiParsingSucceeded: boolean;
  fallbackUsed: boolean;
  diagnostics: ResumeParseDiagnostics;
};

// Recognized skills dictionary for deterministic local parsing fallback
const RECOGNIZED_SKILLS = [
  "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python", "SQL", "PostgreSQL",
  "MySQL", "Oracle", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
  "Git", "CI/CD", "REST APIs", "GraphQL", "Microservices", "Java", "C++", "C#", "Go", "Rust",
  "Machine Learning", "Data Analysis", "Data Science", "Power BI", "Tableau", "Pandas",
  "Scikit-Learn", "PyTorch", "TensorFlow", "Cybersecurity", "SIEM", "Vulnerability Assessment",
  "Electrical Engineering", "Power Systems", "Single-Line Diagrams", "AutoCAD", "High-Voltage Switchgear",
  "Civil Construction", "Structural Drawings", "Quantity Surveying", "Site Supervision", "FIDIC",
  "Mechanical Engineering", "Piping Systems", "HVAC", "Rotating Equipment", "Thermodynamics",
  "Industrial Engineering", "Process Optimization", "Lean Manufacturing", "Six Sigma",
  "Procurement", "Strategic Sourcing", "Tender Management", "Vendor Evaluation", "Contract Negotiation",
  "Supply Chain", "Demand Forecasting", "Inventory Optimization", "Logistics", "Customs Clearance",
  "Financial Modeling", "Valuation", "DCF Modeling", "Internal Audit", "Risk Assessment", "Compliance",
  "Project Management", "PMP", "Agile", "Scrum", "Business Process Optimization", "BPMN", "ESG",
  "Sustainability", "Talent Acquisition", "Recruitment", "Applicant Tracking Systems", "Omanization"
];

export function parseResumeTextLocally(resumeText: string, fileName: string): ParsedResume {
  // 1. Email extraction
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].trim() : null;

  // 2. Phone extraction
  const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;

  // 3. Name extraction
  let fullName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
  fullName = fullName ? fullName.charAt(0).toUpperCase() + fullName.slice(1) : "Candidate";

  const lines = resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length >= 3 && firstLine.length <= 40 && !firstLine.includes("@") && !/\d{5,}/.test(firstLine)) {
      fullName = firstLine;
    }
  }

  // 4. Headline extraction
  let headline: string | null = null;
  if (lines.length > 1) {
    const secondLine = lines[1];
    if (secondLine.length >= 4 && secondLine.length <= 60 && !secondLine.includes("@")) {
      headline = secondLine;
    }
  }

  // 5. Experience years extraction
  let experienceYears = 0;
  const expMatch = resumeText.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
  if (expMatch) {
    experienceYears = Math.min(50, Math.max(0, parseInt(expMatch[1], 10)));
  } else {
    const years = resumeText.match(/\b(19\d\d|20\d\d)\b/g);
    if (years && years.length >= 2) {
      const numYears = years.map(Number).sort((a, b) => a - b);
      const minYr = numYears[0];
      const maxYr = Math.min(new Date().getFullYear(), numYears[numYears.length - 1]);
      if (maxYr > minYr && maxYr - minYr <= 40) {
        experienceYears = maxYr - minYr;
      }
    }
  }

  // 6. Skills extraction
  const lowerText = resumeText.toLowerCase();
  const matchedSkills: string[] = [];
  for (const sk of RECOGNIZED_SKILLS) {
    if (lowerText.includes(sk.toLowerCase())) {
      matchedSkills.push(sk);
    }
  }

  return parsedResumeSchema.parse({
    fullName,
    headline: headline || "Candidate Profile",
    summary: lines.slice(0, 4).join(" ").slice(0, 300),
    email,
    phone,
    location: null,
    nationality: null,
    experienceYears,
    skills: Array.from(new Set(matchedSkills)),
    languages: [],
    certifications: [],
    experience: [],
    education: [],
  });
}

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

function classifyErrorCategory(err: unknown): AICategoryError {
  if (err instanceof AIProviderError && err.category) {
    return err.category;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/API_KEY|api_key|key is not set|missing_provider_key/i.test(msg)) {
    return "missing_provider_key";
  }
  if (/decryption|app_secret_decryption_failed/i.test(msg)) {
    return "app_secret_decryption_failed";
  }
  if (/401|unauthorized|authentication/i.test(msg)) {
    return "provider_authentication_failed";
  }
  if (/402|payment|quota|credits/i.test(msg)) {
    return "provider_payment_required";
  }
  if (/403|forbidden/i.test(msg)) {
    return "provider_forbidden";
  }
  if (/404|model_not_found/i.test(msg)) {
    return "provider_model_not_found";
  }
  if (/429|rate limit/i.test(msg)) {
    return "provider_rate_limited";
  }
  if (/timeout|abort/i.test(msg)) {
    return "provider_timeout";
  }
  if (/500|502|503|504|upstream/i.test(msg)) {
    return "provider_upstream_error";
  }
  if (/empty|no content/i.test(msg)) {
    return "provider_empty_response";
  }
  if (/json|no json object/i.test(msg)) {
    return "provider_invalid_json";
  }
  if (/schema|zod/i.test(msg)) {
    return "resume_schema_validation_failed";
  }
  return "provider_network_error";
}

export async function parseResumeBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  options?: { organizationId?: string; correlationId?: string }
): Promise<ParseResumeResult> {
  const correlationId = options?.correlationId || `req_${crypto.randomUUID().slice(0, 8)}`;
  const startTime = performance.now();

  console.log(`[CV-Parse Diagnostics][${correlationId}][resume_parse_started] filename="${fileName}", mime="${mimeType}", size=${buffer?.byteLength ?? 0} bytes`);

  if (!buffer || buffer.byteLength === 0) {
    console.error(`[CV-Parse Diagnostics][${correlationId}][upload_validated] Empty document uploaded.`);
    throw new ApiError(400, "Empty document uploaded. Select a valid PDF or DOCX file.");
  }
  if (!isSupportedResumeMime(mimeType, fileName)) {
    console.error(`[CV-Parse Diagnostics][${correlationId}][upload_validated] Unsupported format: mime="${mimeType}", file="${fileName}"`);
    throw new ApiError(400, `Unsupported file format (${fileName}). Upload a valid PDF or DOCX file up to 10MB.`);
  }
  if (buffer.byteLength > 10 * 1024 * 1024) {
    console.error(`[CV-Parse Diagnostics][${correlationId}][upload_validated] File size ${buffer.byteLength} exceeds 10MB limit.`);
    throw new ApiError(400, "File exceeds 10MB limit. Upload a smaller PDF or DOCX.");
  }

  console.log(`[CV-Parse Diagnostics][${correlationId}][upload_validated] Validation passed.`);
  console.log(`[CV-Parse Diagnostics][${correlationId}][buffer_created] Buffer allocated: size=${buffer.byteLength} bytes.`);

  let resumeText = "";
  let extractionMethod = "plain_text";
  let characterCount = 0;
  let extractionSucceeded = false;

  try {
    console.log(`[CV-Parse Diagnostics][${correlationId}][text_extraction_started] Method check started for "${fileName}"...`);
    const extractRes = await extractResumeText(buffer, mimeType, fileName);
    resumeText = extractRes.text;
    extractionMethod = extractRes.method;
    characterCount = extractRes.characterCount;
    extractionSucceeded = true;
    console.log(`[CV-Parse Diagnostics][${correlationId}][text_extraction_completed] Succeeded: method="${extractionMethod}", characterCount=${characterCount}`);
  } catch (extractErr) {
    console.error(`[CV-Parse Diagnostics][${correlationId}][text_extraction_completed] Failed: category="pdf_text_extraction_failed"`, extractErr);
    if (extractErr instanceof ApiError) throw extractErr;
    throw new ApiError(400, `We could not read text from this document (${fileName}). Please upload a text-based, non-password-protected PDF or DOCX.`);
  }

  const cleanAlphanumeric = resumeText.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "");
  if (!resumeText || cleanAlphanumeric.length < 20) {
    console.warn(`[CV-Parse Diagnostics][${correlationId}][text_extraction_completed] Document text too short (clean length=${cleanAlphanumeric.length}). Scanned document.`);
    throw new ApiError(
      400,
      "We could not read text from this document. If this is a scanned image or scanned PDF, please upload a text-based PDF or DOCX file."
    );
  }

  let raw: unknown = null;
  let aiFailed = false;
  let providerName = "unknown";
  let modelName = "unknown";
  let configurationSource: "organization" | "environment" = "environment";
  let fallbackReasonCategory: AICategoryError | undefined = undefined;

  try {
    const configRes = await resolveAIConfig(options?.organizationId);
    configurationSource = configRes.source;
    providerName = configRes.providerName;
    modelName = configRes.chatModel || "default";

    console.log(`[CV-Parse Diagnostics][${correlationId}][ai_configuration_resolved] provider="${providerName}", model="${modelName}", source="${configurationSource}"`);

    const provider = await getAIProvider(options?.organizationId);

    console.log(`[CV-Parse Diagnostics][${correlationId}][ai_request_started] Sending chatJSON request...`);
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
    console.log(`[CV-Parse Diagnostics][${correlationId}][ai_response_received] AI provider response received.`);
    console.log(`[CV-Parse Diagnostics][${correlationId}][ai_json_parsed] JSON parsing succeeded.`);
  } catch (aiErr) {
    fallbackReasonCategory = classifyErrorCategory(aiErr);
    console.warn(`[CV-Parse Diagnostics][${correlationId}][ai_response_received] AI provider parse failed: category="${fallbackReasonCategory}", details:`, aiErr instanceof Error ? aiErr.message : aiErr);
    aiFailed = true;
  }

  let parsed: ParsedResume | null = null;
  const extraWarnings: string[] = [];

  if (!aiFailed && raw) {
    try {
      parsed = parsedResumeSchema.parse(raw);
      console.log(`[CV-Parse Diagnostics][${correlationId}][ai_schema_validated] JSON schema validation succeeded.`);
    } catch (schemaErr) {
      console.warn(`[CV-Parse Diagnostics][${correlationId}][ai_schema_validated] Initial schema validation failed. Attempting 1 repair request...`, schemaErr);

      // 1 Schema Repair Attempt with AI Provider
      try {
        const provider = await getAIProvider(options?.organizationId);
        const repairRaw = await provider.chatJSON(
          [
            { role: "system", content: PARSE_SYSTEM_PROMPT },
            {
              role: "user",
              content: `The previous extraction failed Zod schema validation. Please fix array fields, optional strings, and numeric types strictly matching the schema:\n\n<INPUT>\n${JSON.stringify(raw).slice(0, 3000)}\n</INPUT>`,
            },
          ],
          { temperature: 0.0, maxTokens: 2500 }
        );
        parsed = parsedResumeSchema.parse(repairRaw);
        console.log(`[CV-Parse Diagnostics][${correlationId}][ai_schema_validated] Schema repair succeeded.`);
      } catch (repairErr) {
        fallbackReasonCategory = "resume_schema_validation_failed";
        console.warn(`[CV-Parse Diagnostics][${correlationId}][fallback_activated] Schema repair failed: category="${fallbackReasonCategory}". Activating local fallback.`, repairErr);
        aiFailed = true;
      }
    }
  }

  if (aiFailed || !parsed) {
    console.log(`[CV-Parse Diagnostics][${correlationId}][fallback_activated] Activating deterministic local regex fallback parser...`);
    parsed = parseResumeTextLocally(resumeText, fileName);
    extraWarnings.push("The document text was extracted, but AI profile structuring is temporarily unavailable. Basic details were extracted locally — please review and verify all fields before confirming.");
  }

  // Ensure candidate name fallback if blank
  if (!parsed.fullName || parsed.fullName === "Candidate") {
    const nameFromFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
    if (nameFromFileName.length > 2) {
      parsed.fullName = nameFromFileName.charAt(0).toUpperCase() + nameFromFileName.slice(1);
    }
  }

  const confidenceObj = computeConfidence(parsed, resumeText);
  let confidence = confidenceObj.confidence;
  const warnings = Array.from(new Set([...extraWarnings, ...confidenceObj.warnings]));

  if (aiFailed) {
    confidence = Math.min(45, confidence);
  }

  const durationMs = Math.round(performance.now() - startTime);

  const diagnostics: ResumeParseDiagnostics = {
    requestId: correlationId,
    extraction: {
      succeeded: extractionSucceeded,
      method: extractionMethod,
      characterCount,
    },
    aiParsing: {
      succeeded: !aiFailed,
      provider: providerName,
      model: modelName,
      fallbackUsed: aiFailed,
      errorCode: fallbackReasonCategory ?? null,
    },
    configurationSource,
    totalDurationMs: durationMs,
  };

  console.log(`[CV-Parse Diagnostics][${correlationId}][resume_parse_completed] Duration=${durationMs}ms: extraction="${extractionMethod}" (${characterCount} chars), provider="${providerName}", fallbackUsed=${aiFailed}, errorCode="${fallbackReasonCategory ?? "none"}"`);

  return {
    parsed,
    resumeText,
    confidence,
    warnings,
    correlationId,
    aiParsingSucceeded: !aiFailed,
    fallbackUsed: aiFailed,
    diagnostics,
  };
}

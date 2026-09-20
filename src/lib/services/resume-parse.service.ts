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

export async function parseResumeBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParseResumeResult> {
  if (!buffer || buffer.byteLength === 0) {
    throw new ApiError(400, "Empty document uploaded. Select a valid PDF or DOCX file.");
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
  let aiFailed = false;

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
    console.warn("[parseResumeBuffer] AI provider parse warning (falling back to local parser):", aiErr instanceof Error ? aiErr.message : aiErr);
    aiFailed = true;
  }

  let parsed: ParsedResume;
  const extraWarnings: string[] = [];

  if (!aiFailed && raw) {
    try {
      parsed = parsedResumeSchema.parse(raw);
    } catch (schemaErr) {
      console.warn("[parseResumeBuffer] Schema validation warning, using local parser fallback:", schemaErr);
      parsed = parseResumeTextLocally(resumeText, fileName);
    }
  } else {
    parsed = parseResumeTextLocally(resumeText, fileName);
    extraWarnings.push("AI parsing service was unavailable. Basic profile fields were extracted locally — please review and verify your details before confirming.");
  }

  // Ensure default candidate name if AI extracted blank name
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

  return { parsed, resumeText, confidence, warnings };
}

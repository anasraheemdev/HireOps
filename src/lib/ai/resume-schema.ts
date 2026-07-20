import { z } from "zod";

export const parsedResumeSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  experienceYears: z.number().min(0).max(50).nullable().optional(),
  skills: z.array(z.string()).default([]),
  languages: z
    .array(
      z.object({
        name: z.string(),
        level: z.enum(["native", "fluent", "professional", "conversational", "basic"]).default("professional"),
      })
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().nullable().optional(),
        year: z.string().nullable().optional(),
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        role: z.string(),
        company: z.string(),
        location: z.string().nullable().optional(),
        period: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string(),
        institution: z.string(),
        period: z.string().nullable().optional(),
        grade: z.string().nullable().optional(),
      })
    )
    .default([]),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

export const PARSE_SYSTEM_PROMPT = `You are an expert HR resume parser for HireOps.
Extract structured candidate data from the resume text.
Return ONLY valid JSON matching this schema:
{
  "fullName": string,
  "headline": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "nationality": string | null,
  "experienceYears": number | null,
  "skills": string[],
  "languages": [{ "name": string, "level": "native"|"fluent"|"professional"|"conversational"|"basic" }],
  "certifications": [{ "name": string, "issuer": string | null, "year": string | null }],
  "experience": [{ "role": string, "company": string, "location": string | null, "period": string | null, "description": string | null }],
  "education": [{ "degree": string, "institution": string, "period": string | null, "grade": string | null }]
}
Rules:
- Prefer English values; keep Arabic names in fullName if that is how they appear.
- experienceYears = total years of professional experience (estimate if needed).
- period should be human-readable like "2021 — Present" or "2019 — 2021".
- If a field is missing, use null or [].
- Do not invent employers, degrees, or certifications that are not in the text.`;

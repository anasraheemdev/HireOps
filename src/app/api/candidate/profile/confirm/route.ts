import { NextResponse } from "next/server";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { requireCandidateId, confirmCandidateProfile } from "@/lib/services/candidate-portal.service";
import { z } from "zod";

export const maxDuration = 60;

const confirmSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  experienceYears: z.coerce.number().min(0).max(50).default(0),
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
  resumeFilePath: z.string().nullable().optional(),
  resumeText: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);

    const body = await request.json().catch(() => ({}));
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid profile payload.");
    }

    const result = await confirmCandidateProfile(supabase, user.id, candidateId, parsed.data);
    return NextResponse.json({ data: result, message: "Profile confirmed successfully!" });
  } catch (err) {
    return jsonError(err);
  }
}

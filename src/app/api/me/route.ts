import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { getMeProfile, updateMe } from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase, user, profile } = await requireProfile();
    const data = await getMeProfile(supabase, user.id, profile.candidateId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const body = z
      .object({
        fullName: z.string().min(2).optional(),
        phone: z.string().optional(),
        headline: z.string().optional(),
        location: z.string().optional(),
        nationality: z.string().optional(),
        experienceYears: z.number().min(0).max(50).optional(),
      })
      .parse(await request.json());

    if (!Object.keys(body).length) throw new ApiError(400, "No fields to update");
    const data = await updateMe(supabase, user.id, profile.candidateId, body);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const postSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID"),
});

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("interviews.conduct");
    if (ctx.profile.portalRole !== "candidate" || !ctx.profile.candidateId) {
      throw new ApiError(403, "Only candidate users can create interview sessions");
    }

    const body = postSchema.parse(await req.json());
    const adminDb = createAdminSupabaseClient();

    // Verify application ownership
    const { data: app, error: appErr } = await adminDb
      .from("applications")
      .select("id, job_id, candidate_id, jobs ( organization_id )")
      .eq("id", body.applicationId)
      .single();

    if (appErr || !app) throw new ApiError(404, "Application not found");
    if (app.candidate_id !== ctx.profile.candidateId) {
      throw new ApiError(403, "Application belongs to another candidate");
    }

    const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
    const orgId = job?.organization_id || ctx.profile.organizationId!;

    // Check if session already exists for this application
    const { data: existing } = await adminDb
      .from("interview_sessions")
      .select("*")
      .eq("application_id", body.applicationId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing });
    }

    // Create new scheduled interview session
    const { data: newSession, error: createErr } = await adminDb
      .from("interview_sessions")
      .insert({
        organization_id: orgId,
        application_id: app.id,
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        mode: "behavioral",
        status: "scheduled",
      })
      .select("*")
      .single();

    if (createErr || !newSession) {
      throw new ApiError(500, createErr?.message || "Failed to create interview session");
    }

    return NextResponse.json({ data: newSession });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requirePermission("interviews.read");
    if (ctx.profile.portalRole !== "candidate" || !ctx.profile.candidateId) {
      throw new ApiError(403, "Access restricted to candidate users");
    }

    const url = new URL(req.url);
    const applicationId = url.searchParams.get("applicationId");

    const adminDb = createAdminSupabaseClient();
    let query = adminDb
      .from("interview_sessions")
      .select("*, jobs ( title )")
      .eq("candidate_id", ctx.profile.candidateId);

    if (applicationId) {
      query = query.eq("application_id", applicationId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return jsonError(err);
  }
}

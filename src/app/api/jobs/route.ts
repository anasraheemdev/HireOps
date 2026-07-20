import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listJobs, createJob, createJobSchema } from "@/lib/services/jobs.service";

export async function GET() {
  try {
    const { supabase } = await requirePermission("jobs.read", "portal.candidate");
    const jobs = await listJobs(supabase);
    return NextResponse.json({ data: jobs });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("jobs.write");
    const json = await request.json();
    const input = createJobSchema.parse(json);
    if (!profile.organizationId) throw new ApiError(400, "User has no organization assigned");
    const job = await createJob(supabase, profile.organizationId, user.id, input);
    return NextResponse.json({ data: job }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError(new ApiError(400, err.issues[0]?.message ?? "Invalid request body"));
    return jsonError(err);
  }
}

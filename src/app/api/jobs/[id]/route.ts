import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { getJobById, updateJob, updateJobSchema } from "@/lib/services/jobs.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requirePermission("jobs.read", "portal.candidate");
    const job = await getJobById(supabase, id);
    if (!job) throw new ApiError(404, "Job not found");
    return NextResponse.json({ data: job });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requirePermission("jobs.write");
    const json = await request.json();
    const input = updateJobSchema.parse(json);
    const existing = await getJobById(supabase, id);
    if (!existing) throw new ApiError(404, "Job not found");
    const job = await updateJob(supabase, id, input);
    return NextResponse.json({ data: job });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError(new ApiError(400, err.issues[0]?.message ?? "Invalid request body"));
    return jsonError(err);
  }
}

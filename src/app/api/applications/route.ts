import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import {
  applyToJob,
  listMyApplications,
  requireCandidateId,
  createNotification,
} from "@/lib/services/candidate-portal.service";

export async function GET(request: Request) {
  try {
    const { supabase, profile } = await requirePermission("applications.read", "portal.candidate", "candidates.read");
    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "1" || profile.portalRole === "candidate";

    if (mine) {
      const { candidateId } = await requireCandidateId(profile);
      const data = await listMyApplications(supabase, candidateId);
      return NextResponse.json({ data });
    }

    const { data, error } = await supabase
      .from("applications")
      .select("*, candidates ( full_name, email ), jobs ( title )")
      .order("applied_date", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    if (profile.portalRole !== "candidate" && profile.portalRole !== "super_admin") {
      await requirePermission("applications.write");
    }
    const { candidateId } = await requireCandidateId(profile);
    const body = z.object({ jobId: z.string().uuid() }).parse(await request.json());
    const data = await applyToJob(supabase, candidateId, body.jobId, user.id);

    if (!data.alreadyApplied) {
      await createNotification(supabase, {
        recipientId: user.id,
        type: "application",
        title: "Application submitted",
        body: "Your application was received and is under review.",
        metadata: { applicationId: data.id, jobId: body.jobId },
      }).catch(() => null);
    }

    return NextResponse.json({ data }, { status: data.alreadyApplied ? 200 : 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("candidate profile")) {
      return jsonError(new ApiError(400, err.message));
    }
    return jsonError(err);
  }
}

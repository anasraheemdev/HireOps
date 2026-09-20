import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { setApplicationDecision } from "@/lib/services/candidates.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requirePermission("applications.write");
    const { id } = await params;
    const raw = await request.json();

    // /api/applications/match/decision — create application if needed for AI Matching talent-pool shortlist
    if (id === "match") {
      const parsed = z
        .object({
          decision: z.enum(["shortlist", "reject"]),
          candidateId: z.string().uuid(),
          jobId: z.string().uuid(),
          rejectionReason: z.string().optional(),
        })
        .safeParse(raw);
      if (!parsed.success) throw new ApiError(400, "candidateId, jobId, and decision are required");

      let { data: app } = await supabase
        .from("applications")
        .select("id")
        .eq("candidate_id", parsed.data.candidateId)
        .eq("job_id", parsed.data.jobId)
        .maybeSingle();

      if (!app) {
        const { data: created, error } = await supabase
          .from("applications")
          .insert({
            candidate_id: parsed.data.candidateId,
            job_id: parsed.data.jobId,
            stage: "applied",
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        app = created;
      }

      const result = await setApplicationDecision(supabase, app.id, {
        decision: parsed.data.decision,
        rejectionReason: parsed.data.rejectionReason,
        actorId: user.id,
      });
      return NextResponse.json({ data: result });
    }

    const payloadSchema = z.object({
      stage: z.string().optional(),
      decision: z.enum(["shortlist", "reject"]).optional(),
      rejectionReason: z.string().optional(),
      scoreOverride: z
        .object({
          matchScore: z.number().min(0).max(100).optional(),
          reason: z.string().min(1, "Reason is required for score overrides"),
        })
        .optional(),
    });

    const body = payloadSchema.parse(raw);
    const result = await setApplicationDecision(supabase, id, {
      ...body,
      actorId: user.id,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    return jsonError(err);
  }
}

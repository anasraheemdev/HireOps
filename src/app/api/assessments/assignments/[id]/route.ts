import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { getAIProvider } from "@/lib/ai";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, profile } = await requireProfile();
    if (!profile.candidateId) throw new ApiError(400, "No candidate profile");

    const { data: assignment, error } = await supabase
      .from("assessment_assignments")
      .select("*, assessments (*)")
      .eq("id", id)
      .single();
    if (error || !assignment) throw new ApiError(404, "Assignment not found");

    // Ensure assignment belongs to this candidate via application
    const { data: app } = await supabase
      .from("applications")
      .select("id, candidate_id")
      .eq("id", assignment.application_id)
      .maybeSingle();
    if (!app || app.candidate_id !== profile.candidateId) {
      if (profile.portalRole !== "hr" && profile.portalRole !== "super_admin") {
        throw new ApiError(403, "Not your assignment");
      }
    }

    const assessment = Array.isArray(assignment.assessments)
      ? assignment.assessments[0]
      : assignment.assessments;

    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, prompt, question_type, options, points, sort_order, correct_answer")
      .eq("assessment_id", assignment.assessment_id)
      .order("sort_order");

    // Hide correct answers from candidates until completed
    const safeQuestions =
      assignment.status === "completed" || profile.portalRole !== "candidate"
        ? questions ?? []
        : (questions ?? []).map(({ correct_answer: _c, ...q }) => q);

    return NextResponse.json({
      data: {
        assignment,
        assessment,
        questions: safeQuestions,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, profile } = await requireProfile();
    if (!profile.candidateId) throw new ApiError(400, "No candidate profile");
    const body = z.object({ answers: z.record(z.string(), z.string()) }).parse(await request.json());

    const { data: assignment, error } = await supabase
      .from("assessment_assignments")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !assignment) throw new ApiError(404, "Assignment not found");

    const { data: app } = await supabase
      .from("applications")
      .select("candidate_id")
      .eq("id", assignment.application_id)
      .maybeSingle();
    if (!app || app.candidate_id !== profile.candidateId) throw new ApiError(403, "Not your assignment");

    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assignment.assessment_id);

    let earned = 0;
    let total = 0;
    for (const q of questions ?? []) {
      total += q.points || 1;
      const ans = body.answers[q.id]?.trim() ?? "";
      if (q.question_type === "multiple_choice") {
        if (q.correct_answer && ans.toLowerCase() === q.correct_answer.toLowerCase()) {
          earned += q.points || 1;
        }
      } else if (ans.length > 20) {
        // light AI score for free text
        try {
          const provider = getAIProvider();
          const scored = (await provider.chatJSON(
            [
              {
                role: "system",
                content:
                  'Score the answer 0-1 as JSON { score: number }. Be fair. Question: ' + q.prompt,
              },
              { role: "user", content: ans.slice(0, 2000) },
            ],
            { temperature: 0.1, maxTokens: 100 }
          )) as { score?: number };
          earned += Math.max(0, Math.min(1, Number(scored.score ?? 0.5))) * (q.points || 1);
        } catch {
          earned += 0.5 * (q.points || 1);
        }
      }
    }

    const score = total > 0 ? Math.round((earned / total) * 1000) / 10 : 0;
    const { data: updated, error: upErr } = await supabase
      .from("assessment_assignments")
      .update({
        status: "completed",
        score,
        completed_at: new Date().toISOString(),
        started_at: assignment.started_at ?? new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (upErr) throw upErr;

    return NextResponse.json({ data: { ...updated, score } });
  } catch (err) {
    return jsonError(err);
  }
}

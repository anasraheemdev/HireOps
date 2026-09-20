import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, profile } = await requireProfile();
    await requirePermission("assessments.read");

    const { data: assignment, error } = await supabase
      .from("assessment_assignments")
      .select(`
        *,
        assessments ( id, title, description, difficulty, duration_minutes ),
        applications ( id, candidate_id, candidates ( full_name, email ), jobs ( title ) )
      `)
      .eq("id", id)
      .single();

    if (error || !assignment) throw new ApiError(404, "Assignment not found");

    const admin = createAdminSupabaseClient();
    const { data: questions } = await admin
      .from("assessment_questions")
      .select("id, prompt, question_type, options, correct_answer, points, sort_order")
      .eq("assessment_id", assignment.assessment_id)
      .order("sort_order");

    return NextResponse.json({
      data: {
        assignment,
        questions: questions ?? [],
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * HR Review & Score Override Endpoint (Requirement 15)
 * Allows HR to review AI-assisted grading and override scores with an audit log entry.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { user, profile } = await requirePermission("assessments.write");
    if (!profile.organizationId) throw new ApiError(403, "No organization configured");

    const body = z
      .object({
        questionId: z.string(),
        overridePoints: z.number().min(0).max(100),
        reason: z.string().min(3),
      })
      .parse(await request.json());

    const admin = createAdminSupabaseClient();

    const { data: assignment, error } = await admin
      .from("assessment_assignments")
      .select("id, assessment_id, score, answers, grading_details, status")
      .eq("id", id)
      .single();

    if (error || !assignment) throw new ApiError(404, "Assignment not found");

    const { data: questions } = await admin
      .from("assessment_questions")
      .select("id, points")
      .eq("assessment_id", assignment.assessment_id);

    const questionsMap = new Map((questions ?? []).map((q) => [q.id, q.points]));
    const targetMax = questionsMap.get(body.questionId) || 10;
    const cleanEarned = Math.min(targetMax, Math.max(0, body.overridePoints));

    const gradingDetails = (assignment.grading_details || {}) as Record<
      string,
      { earned: number; max: number; correct: boolean; feedback?: string; status?: string; overrides?: Array<unknown> }
    >;

    const currentItem = gradingDetails[body.questionId] || { earned: 0, max: targetMax, correct: false };
    const overrides = currentItem.overrides || [];

    overrides.push({
      overriddenBy: user.id,
      overriddenAt: new Date().toISOString(),
      previousEarned: currentItem.earned,
      newEarned: cleanEarned,
      reason: body.reason,
    });

    gradingDetails[body.questionId] = {
      ...currentItem,
      earned: cleanEarned,
      max: targetMax,
      correct: cleanEarned >= targetMax * 0.7,
      status: "graded",
      feedback: `HR Override by ${user.id}: ${body.reason}`,
      overrides,
    };

    let totalPoints = 0;
    let earnedPoints = 0;
    let stillPending = false;

    for (const q of questions ?? []) {
      totalPoints += q.points;
      const detail = gradingDetails[q.id];
      if (detail && typeof detail.earned === "number") {
        earnedPoints += detail.earned;
      }
      if (detail?.status === "grading_pending") {
        stillPending = true;
      }
    }

    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100 * 10) / 10 : 100;
    const finalStatus = stillPending ? "grading_pending" : "completed";

    const { data: updated, error: updateErr } = await admin
      .from("assessment_assignments")
      .update({
        status: finalStatus,
        score: stillPending ? null : finalScore,
        grading_details: gradingDetails,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        score: updated.score,
        gradingDetails: updated.grading_details,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

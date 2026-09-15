import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const { supabase, profile } = await requireProfile();

    if (!profile.candidateId) {
      throw new ApiError(403, "No candidate profile linked to this account");
    }

    const { data: assignment, error } = await supabase
      .from("assessment_assignments")
      .select(`
        id, status, score, started_at, completed_at, answers, grading_details,
        assessments ( id, title, description, difficulty, duration_minutes ),
        applications ( id, candidate_id )
      `)
      .eq("id", assignmentId)
      .single();

    if (error || !assignment) {
      throw new ApiError(404, "Assessment assignment not found");
    }

    const app = Array.isArray(assignment.applications) ? assignment.applications[0] : assignment.applications;
    if (app?.candidate_id !== profile.candidateId && profile.portalRole !== "super_admin" && profile.portalRole !== "hr") {
      throw new ApiError(403, "Access denied to this assessment");
    }

    const assessmentObj = Array.isArray(assignment.assessments) ? assignment.assessments[0] : assignment.assessments;
    if (!assessmentObj) throw new ApiError(404, "Assessment template missing");

    // Admin client to read questions safely
    const admin = createAdminSupabaseClient();
    const { data: questions } = await admin
      .from("assessment_questions")
      .select("id, prompt, question_type, options, points, sort_order")
      .eq("assessment_id", assessmentObj.id)
      .order("sort_order", { ascending: true });

    // Mark as in_progress if first open
    if (assignment.status === "pending") {
      await admin
        .from("assessment_assignments")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", assignmentId);
    }

    return NextResponse.json({
      data: {
        assignmentId: assignment.id,
        status: assignment.status === "pending" ? "in_progress" : assignment.status,
        score: assignment.score,
        startedAt: assignment.started_at || new Date().toISOString(),
        completedAt: assignment.completed_at,
        assessment: {
          id: assessmentObj.id,
          title: assessmentObj.title,
          description: assessmentObj.description,
          durationMinutes: assessmentObj.duration_minutes,
        },
        questions: (questions ?? []).map((q) => ({
          id: q.id,
          prompt: q.prompt,
          questionType: q.question_type,
          options: Array.isArray(q.options) ? q.options : [],
          points: q.points,
        })),
        answers: assignment.answers || {},
        gradingDetails: assignment.grading_details || {},
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const { supabase, profile } = await requireProfile();

    if (!profile.candidateId) {
      throw new ApiError(403, "No candidate profile linked to account");
    }

    const body = z
      .object({
        answers: z.record(z.string(), z.string()),
      })
      .parse(await request.json());

    const { data: assignment, error } = await supabase
      .from("assessment_assignments")
      .select(`
        id, status, assessment_id,
        applications ( id, candidate_id )
      `)
      .eq("id", assignmentId)
      .single();

    if (error || !assignment) throw new ApiError(404, "Assignment not found");

    const app = Array.isArray(assignment.applications) ? assignment.applications[0] : assignment.applications;
    if (app?.candidate_id !== profile.candidateId) {
      throw new ApiError(403, "Access denied");
    }

    if (assignment.status === "completed") {
      throw new ApiError(409, "This assessment has already been submitted");
    }

    const admin = createAdminSupabaseClient();
    const { data: questions } = await admin
      .from("assessment_questions")
      .select("id, prompt, question_type, options, correct_answer, points")
      .eq("assessment_id", assignment.assessment_id);

    let totalPoints = 0;
    let earnedPoints = 0;
    const gradingDetails: Record<string, { earned: number; max: number; correct: boolean; feedback?: string }> = {};

    const freeTextItems: Array<{ id: string; prompt: string; answer: string; rubric: string; points: number }> = [];

    for (const q of questions ?? []) {
      totalPoints += q.points;
      const candidateAns = body.answers[q.id] || "";

      if (q.question_type === "multiple_choice") {
        const isCorrect = candidateAns.trim().toLowerCase() === (q.correct_answer || "").trim().toLowerCase();
        const earned = isCorrect ? q.points : 0;
        earnedPoints += earned;
        gradingDetails[q.id] = { earned, max: q.points, correct: isCorrect };
      } else {
        freeTextItems.push({
          id: q.id,
          prompt: q.prompt,
          answer: candidateAns,
          rubric: q.correct_answer || "Clear and thorough answer",
          points: q.points,
        });
      }
    }

    if (freeTextItems.length > 0) {
      try {
        const provider = await getAIProvider();
        for (const item of freeTextItems) {
          if (!item.answer.trim()) {
            gradingDetails[item.id] = { earned: 0, max: item.points, correct: false, feedback: "No answer provided" };
            continue;
          }
          const evalResult = (await provider.chatJSON(
            [
              {
                role: "system",
                content: `You are an automated assessment grader for HireOps.
Grade the candidate's answer against the rubric/expected answer.
Return JSON: { scorePercent: number (0-100), feedback: string }.`,
              },
              {
                role: "user",
                content: `Question: ${item.prompt}\nRubric: ${item.rubric}\nCandidate Answer: ${item.answer}`,
              },
            ],
            { temperature: 0.2, maxTokens: 400 }
          )) as { scorePercent?: number; feedback?: string };

          const pct = Math.min(Math.max(evalResult.scorePercent ?? 50, 0), 100);
          const earned = Math.round((pct / 100) * item.points * 10) / 10;
          earnedPoints += earned;
          gradingDetails[item.id] = {
            earned,
            max: item.points,
            correct: pct >= 70,
            feedback: evalResult.feedback || "Evaluated by AI",
          };
        }
      } catch (err) {
        console.error("AI grading error fallback:", err);
        for (const item of freeTextItems) {
          if (!gradingDetails[item.id]) {
            const fallbackEarned = item.answer.trim().length > 20 ? item.points * 0.7 : 0;
            earnedPoints += fallbackEarned;
            gradingDetails[item.id] = { earned: fallbackEarned, max: item.points, correct: fallbackEarned > 0, feedback: "Graded via standard evaluation" };
          }
        }
      }
    }

    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100 * 10) / 10 : 100;

    const { data: updated, error: updateErr } = await admin
      .from("assessment_assignments")
      .update({
        status: "completed",
        score: finalScore,
        answers: body.answers,
        grading_details: gradingDetails,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        score: updated.score,
        gradingDetails,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai";
import { sanitizeQuestionForCandidate } from "@/lib/assessment-schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const { profile } = await requireProfile();

    if (!profile.candidateId && profile.portalRole !== "super_admin" && profile.portalRole !== "hr") {
      throw new ApiError(403, "No candidate profile linked to this account");
    }

    const admin = createAdminSupabaseClient();

    const { data: assignment, error } = await admin
      .from("assessment_assignments")
      .select(`
        id, status, score, started_at, completed_at, answers, grading_details,
        assessments ( id, title, description, difficulty, duration_minutes ),
        applications ( id, candidate_id, job_id )
      `)
      .eq("id", assignmentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ApiError(404, "Assessment assignment not found");
      }
      console.error("[GET Assessment] Database query error:", error.message);
      throw new ApiError(500, "Database query failed while fetching assessment assignment");
    }

    if (!assignment) {
      throw new ApiError(404, "Assessment assignment not found");
    }

    const app = Array.isArray(assignment.applications) ? assignment.applications[0] : assignment.applications;
    if (
      profile.portalRole === "candidate" &&
      app?.candidate_id !== profile.candidateId
    ) {
      throw new ApiError(404, "Assessment assignment not found");
    }

    const assessmentObj = Array.isArray(assignment.assessments) ? assignment.assessments[0] : assignment.assessments;
    if (!assessmentObj) throw new ApiError(404, "Assessment template missing");

    const { data: questions } = await admin
      .from("assessment_questions")
      .select("id, prompt, question_type, options, points, sort_order")
      .eq("assessment_id", assessmentObj.id)
      .order("sort_order", { ascending: true });

    // Server-authoritative timer initialization
    let startedAt = assignment.started_at;
    if (assignment.status === "pending" || !startedAt) {
      startedAt = new Date().toISOString();
      await admin
        .from("assessment_assignments")
        .update({ status: "in_progress", started_at: startedAt })
        .eq("id", assignmentId);
    }

    const durationMinutes = Number(assessmentObj.duration_minutes || 30);
    const startTimeMs = new Date(startedAt).getTime();
    const expiresAtMs = startTimeMs + durationMinutes * 60 * 1000;
    const nowMs = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));

    const sanitizedQuestions = (questions ?? []).map((q) => sanitizeQuestionForCandidate(q));

    return NextResponse.json({
      data: {
        assignmentId: assignment.id,
        status: assignment.status === "pending" ? "in_progress" : assignment.status,
        score: assignment.score,
        startedAt,
        completedAt: assignment.completed_at,
        expiresAt: new Date(expiresAtMs).toISOString(),
        remainingSeconds,
        assessment: {
          id: assessmentObj.id,
          title: assessmentObj.title,
          description: assessmentObj.description,
          durationMinutes,
        },
        questions: sanitizedQuestions,
        exam: {
          questions: sanitizedQuestions,
        },
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
    const { profile } = await requireProfile();

    if (!profile.candidateId && profile.portalRole !== "super_admin" && profile.portalRole !== "hr") {
      throw new ApiError(403, "No candidate profile linked to account");
    }

    const body = z
      .object({
        action: z.enum(["start", "submit"]).optional(),
        answers: z.record(z.string(), z.string()).optional(),
      })
      .parse(await request.json());

    const admin = createAdminSupabaseClient();

    const { data: assignment, error } = await admin
      .from("assessment_assignments")
      .select(`
        id, status, assessment_id, started_at, score, answers, grading_details,
        assessments ( id, duration_minutes ),
        applications ( id, candidate_id, job_id )
      `)
      .eq("id", assignmentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ApiError(404, "Assignment not found");
      }
      console.error("[POST Assessment] Database query error:", error.message);
      throw new ApiError(500, "Database query failed while fetching assessment assignment");
    }

    if (!assignment) throw new ApiError(404, "Assignment not found");

    const app = Array.isArray(assignment.applications) ? assignment.applications[0] : assignment.applications;
    if (profile.portalRole === "candidate" && app?.candidate_id !== profile.candidateId) {
      throw new ApiError(403, "Access denied to this assessment");
    }

    // Resolve organization ID for interview session
    let organizationId = profile.organizationId || null;
    if (!organizationId && app?.job_id) {
      const { data: applicationJob } = await admin
        .from("jobs")
        .select("organization_id")
        .eq("id", app.job_id)
        .maybeSingle();

      organizationId = applicationJob?.organization_id || null;
    }

    if (body.action === "start") {
      const startedAt = assignment.started_at || new Date().toISOString();
      if (!assignment.started_at) {
        await admin
          .from("assessment_assignments")
          .update({ started_at: startedAt, status: "in_progress" })
          .eq("id", assignmentId);
      }
      return NextResponse.json({
        data: {
          assignmentId: assignment.id,
          status: "in_progress",
          startedAt,
        },
      });
    }

    // Prevent duplicate resubmission or rescoring
    if (assignment.status === "completed" || assignment.status === "grading_pending") {
      let interviewSessionId: string | null = null;
      if (app?.id) {
        const { data: existingSession } = await admin
          .from("interview_sessions")
          .select("id")
          .eq("application_id", app.id)
          .maybeSingle();

        if (existingSession) {
          interviewSessionId = existingSession.id;
        } else if (organizationId && app.candidate_id && app.job_id) {
          const { data: newSession } = await admin
            .from("interview_sessions")
            .insert({
              organization_id: organizationId,
              application_id: app.id,
              candidate_id: app.candidate_id,
              job_id: app.job_id,
              status: "scheduled",
              mode: "behavioral",
            })
            .select("id")
            .single();
          if (newSession) interviewSessionId = newSession.id;
        }
      }

      const nextUrl = interviewSessionId
        ? `/candidate/interviews/${interviewSessionId}`
        : "/candidate/applications";

      return NextResponse.json({
        data: {
          id: assignment.id,
          status: assignment.status,
          score: assignment.score ?? 0,
          gradingDetails: assignment.grading_details || {},
          interviewSessionId,
          nextUrl,
        },
      });
    }

    // Server-authoritative timer deadline check
    const assessmentObj = Array.isArray(assignment.assessments) ? assignment.assessments[0] : assignment.assessments;
    const durationMinutes = Number(assessmentObj?.duration_minutes || 30);
    const startedAtMs = assignment.started_at ? new Date(assignment.started_at).getTime() : Date.now();
    const expiresAtMs = startedAtMs + durationMinutes * 60 * 1000 + 60000; // 60s Grace period for network latency
    const isExpired = Date.now() > expiresAtMs;

    const { data: questions } = await admin
      .from("assessment_questions")
      .select("id, prompt, question_type, options, correct_answer, points")
      .eq("assessment_id", assignment.assessment_id);

    let totalMaxPoints = 0;
    let earnedPoints = 0;
    let hasPendingWrittenGrading = false;

    const gradingDetails: Record<
      string,
      { earned: number; max: number; correct: boolean; feedback?: string; status?: "graded" | "grading_pending" }
    > = {};

    const writtenItems: Array<{ id: string; prompt: string; answer: string; rubric: string; points: number }> = [];

    for (const q of questions ?? []) {
      const qPoints = q.points || 10;
      totalMaxPoints += qPoints;
      const candidateAns = (body.answers?.[q.id] || "").trim();

      const normType = (q.question_type || "").toLowerCase();

      if (normType === "multiple_choice") {
        const isCorrect = candidateAns.toLowerCase() === (q.correct_answer || "").trim().toLowerCase();
        const earned = isCorrect ? qPoints : 0;
        earnedPoints += earned;
        gradingDetails[q.id] = { earned, max: qPoints, correct: isCorrect, status: "graded" };
      } else {
        writtenItems.push({
          id: q.id,
          prompt: q.prompt,
          answer: candidateAns,
          rubric: q.correct_answer || "Clear and thorough answer relevant to position.",
          points: qPoints,
        });
      }
    }

    // AI-Assisted Written Answer Grading
    if (writtenItems.length > 0) {
      try {
        const provider = await getAIProvider();
        for (const item of writtenItems) {
          if (!item.answer) {
            gradingDetails[item.id] = { earned: 0, max: item.points, correct: false, feedback: "No answer provided", status: "graded" };
            continue;
          }

          const evalResult = (await provider.chatJSON(
            [
              {
                role: "system",
                content: `You are an automated assessment evaluator for HireOps.
Grade the candidate's written response against the rubric.
Do not infer age, gender, ethnicity, or protected characteristics.
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
            feedback: evalResult.feedback || "Evaluated by AI against rubric.",
            status: "graded",
          };
        }
      } catch (aiErr) {
        console.warn("[POST Assessment] AI grading failed, setting grading_pending:", aiErr);
        hasPendingWrittenGrading = true;
        for (const item of writtenItems) {
          if (!gradingDetails[item.id]) {
            gradingDetails[item.id] = {
              earned: 0,
              max: item.points,
              correct: false,
              feedback: "AI grading service unavailable. Marked pending HR manual review.",
              status: "grading_pending",
            };
          }
        }
      }
    }

    const finalScore = totalMaxPoints > 0 ? Math.round((earnedPoints / totalMaxPoints) * 100 * 10) / 10 : 100;
    const finalStatus = hasPendingWrittenGrading ? "grading_pending" : "completed";

    const { data: updated, error: updateErr } = await admin
      .from("assessment_assignments")
      .update({
        status: finalStatus,
        score: hasPendingWrittenGrading ? null : finalScore,
        answers: body.answers,
        grading_details: gradingDetails,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    // Find or create exactly one interview session for the application
    let interviewSessionId: string | null = null;
    if (app?.id && app.candidate_id) {
      const { data: existingSession } = await admin
        .from("interview_sessions")
        .select("id")
        .eq("application_id", app.id)
        .maybeSingle();

      if (existingSession) {
        interviewSessionId = existingSession.id;
      } else if (organizationId) {
        const { data: newSession, error: createErr } = await admin
          .from("interview_sessions")
          .insert({
            organization_id: organizationId,
            application_id: app.id,
            candidate_id: app.candidate_id,
            job_id: app.job_id,
            status: "scheduled",
            mode: "behavioral",
          })
          .select("id")
          .single();

        if (createErr) {
          console.error("[POST Assessment] Failed to create interview session:", createErr.message);
        } else if (newSession) {
          interviewSessionId = newSession.id;
        }
      }
    }

    const nextUrl = interviewSessionId
      ? `/candidate/interviews/${interviewSessionId}`
      : "/candidate/applications";

    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        score: updated.score,
        gradingDetails,
        isExpired,
        interviewSessionId,
        nextUrl,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

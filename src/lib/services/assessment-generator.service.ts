import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getAIProvider } from "@/lib/ai";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Client = SupabaseClient<Database>;

export async function getOrGenerateAssessmentForJob(
  supabase: Client,
  organizationId: string,
  jobId: string
) {
  const admin = createAdminSupabaseClient();

  // Check if job already has an assigned or linked assessment exam
  const { data: existingAppWithExam } = await admin
    .from("assessment_assignments")
    .select("assessment_id, assessments(id, title, status)")
    .eq("assessments.organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Find any active assessment in the organization
  const { data: existingAssessments } = await admin
    .from("assessments")
    .select("id, title, question_count, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .gt("question_count", 0)
    .order("created_at", { ascending: false });

  if (existingAssessments && existingAssessments.length > 0) {
    return existingAssessments[0];
  }

  // Fetch job details to generate a customized assessment
  const { data: job } = await admin
    .from("jobs")
    .select("title, description, required_skills, level, location")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error("Job not found");

  // Call AI Provider to generate job-specific exam questions
  let examData: {
    title: string;
    description: string;
    durationMinutes: number;
    questions: Array<{
      prompt: string;
      questionType: "multiple_choice" | "free_text";
      options?: string[];
      correctAnswer: string;
      points: number;
    }>;
  };

  try {
    const provider = await getAIProvider();
    const result = (await provider.chatJSON(
      [
        {
          role: "system",
          content: `You are an expert recruitment assessment creator for HireOps.
Generate a structured 5-question technical & situational assessment exam for the position: "${job.title}".
Include 3 multiple-choice questions and 2 situational/essay questions with grading rubrics.
Return JSON:
{
  "title": string,
  "description": string,
  "durationMinutes": number (between 15 and 45),
  "questions": [
    {
      "prompt": string,
      "questionType": "multiple_choice" | "free_text",
      "options": string[] (required if multiple_choice, exactly 4 choices),
      "correctAnswer": string (exact choice for MCQ, or comprehensive rubric for free_text),
      "points": number (10 to 20)
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Role: ${job.title}\nLevel: ${job.level || "Mid-Senior"}\nSkills: ${(job.required_skills || []).join(", ")}\nDescription: ${(job.description || "").slice(0, 800)}`,
        },
      ],
      { temperature: 0.3, maxTokens: 1200 }
    )) as typeof examData;

    examData = result;
  } catch (err) {
    console.warn("AI assessment generation fallback:", err);
    examData = {
      title: `${job.title} Competency Exam`,
      description: `Evaluation assessment for candidates applying to ${job.title}.`,
      durationMinutes: 30,
      questions: [
        {
          prompt: `What core methodology is essential for succeeding as a ${job.title}?`,
          questionType: "multiple_choice",
          options: ["Agile/Scrum", "Waterfall", "Ad-hoc Execution", "Unstructured Planning"],
          correctAnswer: "Agile/Scrum",
          points: 20,
        },
        {
          prompt: `Which of the following skills is required for ${job.title}?`,
          questionType: "multiple_choice",
          options: [
            job.required_skills?.[0] || "Problem Solving",
            "Unrelated Tasking",
            "Manual Copying",
            "None of the above",
          ],
          correctAnswer: job.required_skills?.[0] || "Problem Solving",
          points: 20,
        },
        {
          prompt: "Describe how you prioritize competing deadlines in a fast-paced environment.",
          questionType: "free_text",
          correctAnswer: "Candidate should explain impact-vs-effort framework, stakeholder communication, and clear priority execution.",
          points: 30,
        },
        {
          prompt: `Explain a challenging problem you solved in a role similar to ${job.title} and the quantifiable outcome achieved.`,
          questionType: "free_text",
          correctAnswer: "Candidate should follow STAR format (Situation, Task, Action, Result) with clear metrics.",
          points: 30,
        },
      ],
    };
  }

  // Save generated assessment exam to database
  const { data: newAssessment, error: assessErr } = await admin
    .from("assessments")
    .insert({
      organization_id: organizationId,
      title: examData.title || `${job.title} Competency Exam`,
      description: examData.description || `Assessment exam for ${job.title}`,
      difficulty: "medium",
      duration_minutes: examData.durationMinutes || 30,
      status: "active",
      question_count: examData.questions.length,
    })
    .select("*")
    .single();

  if (assessErr || !newAssessment) throw assessErr || new Error("Failed to save assessment");

  // Save assessment questions
  const questionInserts = examData.questions.map((q, idx) => ({
    assessment_id: newAssessment.id,
    prompt: q.prompt,
    question_type: q.questionType,
    options: q.options || [],
    correct_answer: q.correctAnswer,
    points: q.points || 20,
    sort_order: idx + 1,
  }));

  await admin.from("assessment_questions").insert(questionInserts);

  return newAssessment;
}

export async function autoAssignAssessmentToApplication(
  supabase: Client,
  organizationId: string,
  applicationId: string,
  jobId: string
) {
  const admin = createAdminSupabaseClient();
  const assessment = await getOrGenerateAssessmentForJob(supabase, organizationId, jobId);

  // Check if candidate already has an assignment for this assessment & application
  const { data: existingAssignment } = await admin
    .from("assessment_assignments")
    .select("*")
    .eq("assessment_id", assessment.id)
    .eq("application_id", applicationId)
    .maybeSingle();

  if (existingAssignment) return { ...existingAssignment, assessmentTitle: assessment.title };

  const { data: assignment, error } = await admin
    .from("assessment_assignments")
    .insert({
      assessment_id: assessment.id,
      application_id: applicationId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to auto-assign assessment:", error);
    return null;
  }

  return {
    ...assignment,
    assessmentTitle: assessment.title,
  };
}

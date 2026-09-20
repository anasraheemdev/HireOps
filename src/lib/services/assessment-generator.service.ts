
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getAIProvider } from "@/lib/ai";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assessmentSchema } from "@/lib/assessment-schema";

type Client = SupabaseClient<Database>;

export async function getOrGenerateAssessmentForJob(
  supabase: Client,
  organizationId: string,
  jobId: string
) {
  const admin = createAdminSupabaseClient();

  const fullSelect = "id, title, description, required_skills, level, location, assessment_id";
  const baseSelect = "id, title, description, required_skills, level, location";

  const { data: initialJob, error: jobErr } = await admin
    .from("jobs")
    .select(fullSelect)
    .eq("id", jobId)
    .maybeSingle();

  let job = initialJob;

  if (jobErr && (jobErr.code === "PGRST204" || jobErr.message?.includes("column"))) {
    const { data: fallbackJob } = await admin
      .from("jobs")
      .select(baseSelect)
      .eq("id", jobId)
      .maybeSingle();
    job = fallbackJob ? ({ ...fallbackJob, assessment_id: null } as unknown as typeof job) : null;
  }

  if (!job) throw new Error("Job not found");

  // 2. Check if job already has a linked active assessment
  if (job.assessment_id) {
    const { data: linkedAssess } = await admin
      .from("assessments")
      .select("*")
      .eq("id", job.assessment_id)
      .eq("status", "active")
      .maybeSingle();

    if (linkedAssess) {
      return linkedAssess;
    }
  }

  // 3. Find any active assessment in the organization matching this job title
  const { data: existingAssessments } = await admin
    .from("assessments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .gt("question_count", 0)
    .ilike("title", `%${job.title.trim()}%`)
    .order("created_at", { ascending: false });

  if (existingAssessments && existingAssessments.length > 0) {
    const existing = existingAssessments[0];
    // Link it to the job for future direct lookup
    await admin.from("jobs").update({ assessment_id: existing.id }).eq("id", jobId);
    return existing;
  }

  // 4. Generate a job-specific assessment using AI
  let examData: {
    title: string;
    description: string;
    durationMinutes: number;
    questions: Array<{
      prompt: string;
      questionType: "multiple_choice" | "short_answer" | "essay";
      options?: string[];
      correctAnswer: string;
      points: number;
    }>;
  };

  try {
    const provider = await getAIProvider();
    const rawResult = (await provider.chatJSON(
      [
        {
          role: "system",
          content: `You are an expert recruitment assessment author for HireOps.
Generate a structured 5-question competency assessment for the position: "${job.title}".
Include:
- 3 multiple-choice questions ("multiple_choice") with 4 distinct options and exact correct choice.
- 1 short-answer question ("short_answer") with an evaluation rubric.
- 1 situational case-study/essay question ("essay") with a detailed scoring rubric.

Return JSON only:
{
  "title": string,
  "description": string,
  "durationMinutes": number (between 15 and 45),
  "questions": [
    {
      "prompt": string,
      "questionType": "multiple_choice" | "short_answer" | "essay",
      "options": string[] (required for multiple_choice, exactly 4 choices),
      "correctAnswer": string (exact choice text for MCQ, or rubric for short_answer/essay),
      "points": number (10 to 25)
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Role: ${job.title}\nLevel: ${job.level || "Mid-level"}\nSkills: ${(job.required_skills || []).join(", ")}\nDescription: ${(job.description || "").slice(0, 800)}`,
        },
      ],
      { temperature: 0.3, maxTokens: 1400 }
    )) as typeof examData;

    examData = rawResult;
  } catch (err) {
    console.warn("[getOrGenerateAssessmentForJob] AI generation fallback:", err);
    examData = {
      title: `${job.title} Competency Assessment`,
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
          prompt: `What is a key metric used to evaluate performance in a ${job.title} position?`,
          questionType: "multiple_choice",
          options: ["Quality of output", "Random guesswork", "No measurement", "Irrelevant activity"],
          correctAnswer: "Quality of output",
          points: 20,
        },
        {
          prompt: "Describe how you prioritize competing deadlines in a fast-paced environment.",
          questionType: "short_answer",
          correctAnswer: "Candidate should explain impact-vs-effort framework, stakeholder communication, and clear priority execution.",
          points: 20,
        },
        {
          prompt: `Describe a complex technical or operational challenge you solved in a role similar to ${job.title} and the quantifiable outcome achieved.`,
          questionType: "essay",
          correctAnswer: "Candidate should follow STAR format (Situation, Task, Action, Result) with clear metrics and quantifiable results.",
          points: 20,
        },
      ],
    };
  }

  // Validate questions schema
  const parsedExam = assessmentSchema.parse({
    title: examData.title || `${job.title} Competency Assessment`,
    description: examData.description || `Assessment exam for ${job.title}`,
    difficulty: "medium",
    durationMinutes: examData.durationMinutes || 30,
    questions: examData.questions.map((q) => {
      const rawAns = q.correctAnswer;
      const ansStr = typeof rawAns === "string" ? rawAns : typeof rawAns === "object" && rawAns !== null ? JSON.stringify(rawAns) : String(rawAns || "");
      return {
        prompt: q.prompt,
        questionType: (q.questionType as "multiple_choice" | "short_answer" | "essay") || "multiple_choice",
        options: q.options || [],
        correctAnswer: ansStr,
        points: q.points || 20,
      };
    }),
  });

  // 5. Persist generated assessment to database
  const { data: newAssessment, error: assessErr } = await admin
    .from("assessments")
    .insert({
      organization_id: organizationId,
      title: parsedExam.title,
      description: parsedExam.description || null,
      difficulty: parsedExam.difficulty,
      duration_minutes: parsedExam.durationMinutes,
      status: "active",
      question_count: parsedExam.questions.length,
    })
    .select("*")
    .single();

  if (assessErr || !newAssessment) throw assessErr || new Error("Failed to save assessment");

  // Save assessment questions
  const questionInserts = parsedExam.questions.map((q, idx) => ({
    assessment_id: newAssessment.id,
    prompt: q.prompt,
    question_type: q.questionType,
    options: q.options || [],
    correct_answer: q.correctAnswer,
    points: q.points || 20,
    sort_order: idx + 1,
  }));

  await admin.from("assessment_questions").insert(questionInserts);

  // Link assessment to job for reusability across all future candidates
  await admin.from("jobs").update({ assessment_id: newAssessment.id }).eq("id", jobId);

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

  if (existingAssignment) {
    return { ...existingAssignment, assessmentTitle: assessment.title };
  }

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
    if (error.code === "23505") { // unique constraint on (assessment_id, application_id)
      const { data: retryExisting } = await admin
        .from("assessment_assignments")
        .select("*")
        .eq("assessment_id", assessment.id)
        .eq("application_id", applicationId)
        .single();
      return { ...retryExisting, assessmentTitle: assessment.title };
    }
    console.error("Failed to auto-assign assessment:", error);
    return null;
  }

  return {
    ...assignment,
    assessmentTitle: assessment.title,
  };
}

import { z } from "zod";

export const questionTypeEnum = z.enum([
  "multiple_choice",
  "short_answer",
  "essay",
  "free_text",
]);

export type QuestionType = z.infer<typeof questionTypeEnum>;

export const questionSchema = z
  .object({
    id: z.string().optional(),
    prompt: z.string().trim().min(5).max(4000),
    questionType: questionTypeEnum,
    options: z.array(z.string().trim().min(1).max(1000)).max(8).default([]),
    correctAnswer: z.string().trim().min(1).max(4000).default(""),
    rubric: z.string().trim().max(4000).optional(),
    points: z.number().int().min(1).max(100).default(10),
  })
  .superRefine((q, ctx) => {
    if (
      q.questionType === "multiple_choice" &&
      (q.options.length < 2 ||
        new Set(q.options).size !== q.options.length ||
        (q.correctAnswer && !q.options.includes(q.correctAnswer)))
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Multiple-choice questions require at least 2 distinct options and a correct answer selected from those options.",
      });
    }
  });

export type AssessmentQuestionInput = z.infer<typeof questionSchema>;

export const assessmentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().max(3000).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  durationMinutes: z.number().int().min(1).max(180).default(30),
  questions: z.array(questionSchema).min(1).max(50),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;

/**
 * Strips confidential answer keys, rubrics, and correct answers before returning questions to candidate clients.
 */
export function sanitizeQuestionForCandidate(q: {
  id: string;
  prompt: string;
  question_type?: string;
  questionType?: string;
  options?: unknown;
  points?: number;
}) {
  const type = q.questionType || q.question_type || "multiple_choice";
  const normType: QuestionType =
    type === "free_text"
      ? "short_answer"
      : (type as QuestionType) || "multiple_choice";

  return {
    id: q.id,
    prompt: q.prompt,
    questionType: normType,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    points: q.points ?? 10,
  };
}

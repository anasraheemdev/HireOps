import { z } from 'zod';
export const questionSchema = z.object({
  prompt: z.string().trim().min(5).max(4000),
  questionType: z.enum(['multiple_choice', 'free_text']),
  options: z.array(z.string().trim().min(1).max(1000)).max(8).default([]),
  correctAnswer: z.string().trim().min(1).max(4000),
  points: z.number().int().min(1).max(100).default(1),
}).superRefine((q, ctx) => {
  if (q.questionType === 'multiple_choice' && (q.options.length < 2 || new Set(q.options).size !== q.options.length || !q.options.includes(q.correctAnswer))) ctx.addIssue({ code: 'custom', message: 'Multiple-choice questions need distinct options and a correct answer from those options.' });
});
export const assessmentSchema = z.object({
  title: z.string().trim().min(3).max(200), description: z.string().max(3000).optional(),
  difficulty: z.enum(['easy','medium','hard']).default('medium'),
  durationMinutes: z.number().int().min(1).max(180).default(30),
  questions: z.array(questionSchema).min(1).max(50),
});

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MotionPage } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/fetcher";
import { toast } from "sonner";

type Question = {
  id: string;
  prompt: string;
  question_type: string;
  options: unknown;
  points: number;
};

export default function TakeAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("Assessment");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{
          assignment: Record<string, unknown>;
          assessment: Record<string, unknown>;
          questions: Question[];
        }>(`/api/assessments/assignments/${id}`);
        setQuestions(data.questions ?? []);
        setTitle(String(data.assessment?.title ?? "Assessment"));
        if (data.assignment?.score != null) setScore(Number(data.assignment.score));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load assessment");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MotionPage>
      <PageHeader title={title} description="Answer all questions, then submit for scoring." />
      {score != null && (
        <div className="glass-card p-4 mb-4 text-sm">
          Completed · Score: <strong>{score}</strong>
          <Button variant="ghost" className="ml-3 cursor-pointer" onClick={() => router.push("/candidate/assessments")}>
            Back
          </Button>
        </div>
      )}
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            const data = await apiFetch<{ score: number }>(`/api/assessments/assignments/${id}`, {
              method: "POST",
              body: JSON.stringify({ answers }),
            });
            setScore(data.score);
            toast.success(`Submitted — score ${data.score}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Submit failed");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground glass-card p-6">
            No questions configured for this assessment yet. Contact HR.
          </p>
        )}
        {questions.map((q, idx) => {
          const options = Array.isArray(q.options) ? (q.options as string[]) : [];
          return (
            <div key={q.id} className="glass-card p-5 space-y-3">
              <p className="text-sm font-medium">
                {idx + 1}. {q.prompt}
              </p>
              {q.question_type === "multiple_choice" && options.length > 0 ? (
                <div className="space-y-2">
                  {options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        disabled={score != null}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="w-full min-h-[100px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={answers[q.id] ?? ""}
                  disabled={score != null}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </div>
          );
        })}
        {score == null && questions.length > 0 && (
          <Button type="submit" className="gradient-brand text-white cursor-pointer" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit assessment"}
          </Button>
        )}
      </form>
    </MotionPage>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-provider";
import { apiFetch } from "@/lib/api/fetcher";

type Session = { id: string };

export default function StartLiveInterviewPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current || !profile) return;
    started.current = true;

    (async () => {
      try {
        if (!profile.candidateId) {
          throw new Error("Your account is not linked to a candidate profile yet.");
        }
        const session = await apiFetch<Session>("/api/interviews", {
          method: "POST",
          body: JSON.stringify({ candidateId: profile.candidateId, mode: "behavioral" }),
        });
        router.replace(`/candidate/interviews/${session.id}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not start interview";
        setError(message);
        toast.error(message);
      }
    })();
  }, [profile, router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      {error ? (
        <>
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => router.push("/candidate/interviews")}
          >
            Back to interviews
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Starting your AI interview…</p>
        </>
      )}
    </div>
  );
}

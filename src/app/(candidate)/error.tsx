"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/enterprise-ui";

export default function CandidateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-8">
      <ErrorState
        title="Candidate portal error"
        description={error.message || "Something went wrong loading this page."}
        onRetry={reset}
      />
      <div className="mt-4 flex justify-center">
        <Button variant="ghost" className="text-xs text-muted-foreground cursor-pointer" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  );
}

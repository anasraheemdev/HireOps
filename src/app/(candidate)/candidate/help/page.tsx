"use client";

import { HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { useHelpQuery } from "@/lib/queries/use-candidate-portal";

export default function CandidateHelpPage() {
  const { data: articles = [], isLoading, isError, error, refetch } = useHelpQuery();

  return (
    <MotionPage>
      <PageHeader title="Help center" description="Guides for applications, interviews, and offers." />
      {isLoading && <PageSkeleton rows={4} />}
      {isError && (
        <ErrorState title="Could not load help" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && articles.length === 0 && (
        <EmptyState icon={HelpCircle} title="No articles" description="Help content will appear here." />
      )}
      <MotionList className="space-y-3">
        {articles.map((a) => (
          <MotionItem key={String(a.id)}>
            <article className="glass-card p-5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{String(a.category)}</p>
              <h3 className="text-sm font-semibold mb-2">{String(a.title)}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{String(a.body)}</p>
            </article>
          </MotionItem>
        ))}
      </MotionList>
    </MotionPage>
  );
}

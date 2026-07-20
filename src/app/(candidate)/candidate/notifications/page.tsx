"use client";

import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage, MotionList, MotionItem } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { useNotificationsQuery, useMarkNotificationMutation } from "@/lib/queries/use-candidate-portal";
import { cn } from "@/lib/utils";

export default function CandidateNotificationsPage() {
  const { data: items = [], isLoading, isError, error, refetch } = useNotificationsQuery();
  const mark = useMarkNotificationMutation();

  return (
    <MotionPage>
      <PageHeader title="Notifications" description="Application updates, interviews, and offers." />
      {isLoading && <PageSkeleton rows={4} />}
      {isError && (
        <ErrorState title="Could not load notifications" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState icon={Bell} title="You're all caught up" description="New activity will appear here." />
      )}
      <MotionList className="space-y-2">
        {items.map((n) => (
          <MotionItem key={String(n.id)}>
            <div
              className={cn(
                "glass-card p-4 flex items-start justify-between gap-3",
                !n.is_read && "border-primary/30"
              )}
            >
              <div>
                <p className="text-sm font-medium">{String(n.title)}</p>
                {n.body != null && <p className="text-xs text-muted-foreground mt-1">{String(n.body)}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(String(n.created_at)).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer shrink-0"
                  onClick={() => mark.mutate(String(n.id))}
                >
                  Mark read
                </Button>
              )}
            </div>
          </MotionItem>
        ))}
      </MotionList>
    </MotionPage>
  );
}

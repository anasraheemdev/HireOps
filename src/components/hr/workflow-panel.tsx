"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton, StatusBadge } from "@/components/shared/enterprise-ui";
import { apiFetch } from "@/lib/api/fetcher";

type Stage = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  requires_approval: boolean;
};

export default function WorkflowsSettingsSection() {
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => apiFetch<Stage[]>("/api/workflows"),
  });

  if (isLoading) return <PageSkeleton rows={3} />;

  return (
    <div className="glass-card p-6">
      <PageHeader title="Hiring workflow" description="Configurable pipeline stages with optional approvals." />
      <ol className="mt-4 space-y-3">
        {stages.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-[11px] text-muted-foreground">{s.code}</p>
            </div>
            {s.requires_approval && <StatusBadge tone="warning">Approval</StatusBadge>}
          </li>
        ))}
      </ol>
    </div>
  );
}

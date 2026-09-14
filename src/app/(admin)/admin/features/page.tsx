"use client";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/enterprise-ui";
import { useFeatureFlagsQuery, useUpsertFeatureFlagMutation } from "@/lib/queries/use-admin";

function titleCase(key: string) {
  return key
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminFeaturesPage() {
  const { data: flags, isLoading, isError, error, refetch } = useFeatureFlagsQuery();
  const upsert = useUpsertFeatureFlagMutation();

  return (
    <div>
      <PageHeader
        title="Feature flags"
        description="Toggle product capabilities per portal without a deploy."
      />

      {isLoading && (
        <div className="space-y-3 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center max-w-3xl">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load feature flags</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (flags?.length ?? 0) === 0 && (
        <EmptyState title="No feature flags yet" description="Flags will appear here once seeded for this organization." />
      )}

      {!isLoading && !isError && (flags?.length ?? 0) > 0 && (
        <div className="space-y-3 max-w-3xl">
          {flags!.map((f) => (
            <div key={f.id} className="glass-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{titleCase(f.key)}</p>
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-mono">
                    {f.key}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{f.description ?? "No description"}</p>
              </div>
              <Switch
                checked={f.enabled}
                disabled={upsert.isPending}
                onCheckedChange={(checked) => {
                  upsert.mutate(
                    { key: f.key as "ai_interview" | "semantic_matching" | "career_assistant", enabled: checked, description: f.description ?? undefined },
                    {
                      onSuccess: () => toast.success(`${titleCase(f.key)} ${checked ? "enabled" : "disabled"}`),
                      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update flag"),
                    }
                  );
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

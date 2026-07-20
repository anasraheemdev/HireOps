"use client";

import { Database, HardDrive, Brain, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricBar, StatusBadge } from "@/components/shared/enterprise-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminHealthQuery } from "@/lib/queries/use-admin";

export default function AdminHealthPage() {
  const { data: health, isLoading, isError, error, refetch } = useAdminHealthQuery();

  const services = health
    ? [
        {
          name: "Database",
          icon: Database,
          status: health.database === "healthy" ? ("Healthy" as const) : ("Down" as const),
          detail: health.dbLatencyMs != null ? `Responded in ${health.dbLatencyMs}ms` : "Primary Postgres",
          metrics: [{ label: "Candidates on record", value: health.candidates, max: Math.max(health.candidates, 1) }],
        },
        {
          name: "Storage",
          icon: HardDrive,
          status: health.storage === "healthy" ? ("Healthy" as const) : health.storage === "degraded" ? ("Warning" as const) : ("Down" as const),
          detail: "CV uploads & offer documents (resumes bucket)",
          metrics: [],
        },
        {
          name: "Embeddings coverage",
          icon: Brain,
          status: health.embeddingCoverage >= 90 ? ("Healthy" as const) : ("Warning" as const),
          detail: "Candidate vector index",
          metrics: [{ label: "Candidates embedded %", value: health.embeddingCoverage, max: 100 }],
        },
        {
          name: "Auth",
          icon: ShieldCheck,
          status: health.auth === "healthy" ? ("Healthy" as const) : ("Down" as const),
          detail: "Supabase Auth session check",
          metrics: [],
        },
      ]
    : [];

  const allHealthy = services.every((s) => s.status === "Healthy");

  return (
    <div>
      <PageHeader
        title="System health"
        description="Live status for core platform services."
        actions={
          !isLoading && health ? (
            <Badge
              variant="outline"
              className={
                allHealthy
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 gap-1.5"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/25 gap-1.5"
              }
            >
              <CheckCircle2 className="h-3 w-3" /> {allHealthy ? "Monitoring active" : "Degraded"}
            </Badge>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load system health</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s) => (
            <div key={s.name} className="glass-card p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
                <StatusBadge tone={s.status === "Healthy" ? "success" : s.status === "Warning" ? "warning" : "danger"}>{s.status}</StatusBadge>
              </div>
              {s.metrics.length > 0 && (
                <div className="space-y-3">
                  {s.metrics.map((m) => (
                    <MetricBar
                      key={m.label}
                      label={m.label}
                      value={m.value}
                      max={m.max}
                      tone={s.status === "Healthy" ? "success" : "warning"}
                    />
                  ))}
                </div>
              )}
              {s.status !== "Healthy" && (
                <p className={cn("mt-4 text-xs flex items-center gap-1.5 text-amber-300")}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {s.name === "Embeddings coverage"
                    ? "Backfill embeddings for recent CV uploads."
                    : `${s.name} check did not report healthy — investigate connectivity.`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

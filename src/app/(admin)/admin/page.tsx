"use client";

import Link from "next/link";
import {
  Building2,
  Users,
  Sparkles,
  Activity,
  Database,
  ArrowRight,
  Shield,
  FileClock,
  HeartPulse,
  AlertTriangle,
} from "lucide-react";
import { KpiTile } from "@/components/shared/enterprise-ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminHealthQuery, useAiUsageQuery } from "@/lib/queries/use-admin";

const quickLinks = [
  {
    href: "/admin/users",
    title: "User management",
    desc: "Invite, suspend, and assign portal roles.",
    icon: Users,
  },
  {
    href: "/admin/ai",
    title: "AI configuration",
    desc: "Providers, models, and API keys.",
    icon: Sparkles,
  },
  {
    href: "/admin/audit",
    title: "Audit trail",
    desc: "Review privileged actions and system events.",
    icon: FileClock,
  },
  {
    href: "/admin/health",
    title: "System health",
    desc: "Database, storage, embeddings, and auth.",
    icon: HeartPulse,
  },
];

export default function AdminOverviewPage() {
  const { data: health, isLoading: healthLoading, isError: healthError } = useAdminHealthQuery();
  const { data: usage, isLoading: usageLoading } = useAiUsageQuery();

  const allHealthy = health && health.database === "healthy" && health.storage === "healthy" && health.auth === "healthy";

  return (
    <div className="space-y-3 max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Platform overview</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Organizations, users, AI usage, and infrastructure
          </p>
        </div>
        {healthLoading ? (
          <Skeleton className="h-6 w-36 rounded-full" />
        ) : (
          <Badge
            variant="outline"
            className={
              allHealthy
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 gap-1.5 h-7 text-[11px]"
                : "bg-amber-500/10 text-amber-300 border-amber-500/25 gap-1.5 h-7 text-[11px]"
            }
          >
            {allHealthy ? <Activity className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {allHealthy ? "All systems nominal" : "Attention needed"}
          </Badge>
        )}
      </div>

      {healthError ? (
        <div className="ws-panel rounded-xl p-6 text-center">
          <p className="text-sm font-medium">Couldn&apos;t load platform metrics</p>
          <p className="text-[12px] text-muted-foreground mt-1">Check your connection and refresh.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {healthLoading || usageLoading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)
          ) : (
            <>
              <KpiTile label="Organizations" value={1} hint="Primary organization" />
              <KpiTile
                label="HR + Admin users"
                value={health?.users ?? 0}
                hint={`${health?.usersByPortalRole.hr ?? 0} HR · ${health?.usersByPortalRole.super_admin ?? 0} Admin`}
              />
              <KpiTile
                label="Candidates"
                value={(health?.candidates ?? 0).toLocaleString()}
                hint={`${health?.embeddingCoverage ?? 0}% embedded`}
              />
              <KpiTile label="Active jobs" value={health?.jobs ?? 0} hint="Open requisitions" />
              <KpiTile label="AI requests" value={health?.aiRequestsToday ?? 0} hint="Today" />
              <KpiTile
                label="Token usage (7d)"
                value={((usage?.totals.tokens ?? 0) / 1_000_000).toFixed(1) + "M"}
                hint={`~ $${usage?.totals.estimatedCostUsd ?? 0} estimated`}
              />
              <KpiTile
                label="Database"
                value={health?.database === "healthy" ? "Healthy" : "Down"}
                hint={health?.dbLatencyMs != null ? `${health.dbLatencyMs}ms` : undefined}
              />
              <KpiTile label="Auth" value={health?.auth === "healthy" ? "Healthy" : "Down"} hint="Supabase Auth" />
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="ws-panel rounded-xl p-3.5 flex items-start gap-3 group hover:border-primary/30 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <link.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-[13px]">{link.title}</p>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="ws-panel rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> Org: HireOps
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" /> Role: Super Admin
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" /> Region: Gulf / Muscat
        </span>
      </div>
    </div>
  );
}

"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiTile, EmptyState } from "@/components/shared/enterprise-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { chartColors, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from "@/lib/chart-theme";
import { useAiUsageQuery } from "@/lib/queries/use-admin";

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function AdminAiUsagePage() {
  const { data, isLoading, isError, error, refetch } = useAiUsageQuery();

  const series = (data?.series ?? []).map((s) => ({
    day: new Date(s.day).toLocaleDateString(undefined, { weekday: "short" }),
    tokensM: s.tokens / 1_000_000,
  }));

  return (
    <div>
      <PageHeader
        title="AI usage"
        description="Token consumption and estimated cost by feature — last 7 days."
      />

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load AI usage</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiTile label="Tokens (7d)" value={formatTokens(data.totals.tokens)} />
            <KpiTile label="Requests (7d)" value={data.totals.requests.toLocaleString()} />
            <KpiTile label="Est. cost (7d)" value={`$${data.totals.estimatedCostUsd.toLocaleString()}`} hint={`@ $${data.costPerMillionTokensUsd}/1M tokens (est.)`} />
            <KpiTile label="Operations tracked" value={data.byOperation.length} />
          </div>

          <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Token usage (millions)</h3>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px]">
                Last 7 days
              </Badge>
            </div>
            {series.length === 0 ? (
              <EmptyState title="No usage yet" description="AI usage will appear here once requests are logged." />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="tokenFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.blue} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={chartColors.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="day" stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                    <Area type="monotone" dataKey="tokensM" stroke={chartColors.blue} fill="url(#tokenFill)" strokeWidth={2} name="Tokens (M)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {data.byOperation.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr] px-4 py-3 border-b border-white/10 text-xs font-medium text-muted-foreground">
                <span>Operation</span>
                <span>Requests</span>
                <span>Tokens</span>
              </div>
              {data.byOperation.map((r) => (
                <div
                  key={r.operation}
                  className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr] gap-1 sm:gap-0 px-4 py-3 border-b border-white/5 last:border-0"
                >
                  <p className="text-sm font-medium col-span-2 sm:col-span-1 capitalize">{r.operation.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{r.requests.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{formatTokens(r.tokens)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

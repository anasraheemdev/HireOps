"use client";

import { Timer, CheckCircle2, Target, Users, Globe2, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Area,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { useAnalyticsQuery } from "@/lib/queries/use-analytics";
import { chartColors, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from "@/lib/chart-theme";

function Panel({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="ws-panel rounded-xl overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 bg-white/[0.02]">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <h3 className="text-[12px] font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAnalyticsQuery();

  if (isError) {
    return (
      <div className="ws-panel rounded-xl p-10 text-center">
        <AlertTriangle className="h-7 w-7 text-amber-400 mx-auto mb-2" />
        <p className="text-sm font-medium">Couldn&apos;t load analytics</p>
        <p className="text-[12px] text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
        <Button size="sm" variant="outline" className="mt-3 h-8 text-[12px] gap-1.5 cursor-pointer" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  const departmentBreakdown = data?.departmentBreakdown ?? [];
  const applicationsTimeline = data?.applicationsTimeline ?? [];
  const funnelConversion = data?.funnelConversion ?? [];
  const nationalityDiversity = data?.nationalityDiversity ?? [];
  const isEmpty = !isLoading && (data?.totalCandidates ?? 0) === 0;

  return (
    <div className="space-y-3 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Pipeline conversion, hiring velocity, and diversity from live data
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[12px] gap-1.5 border-white/10 bg-white/[0.03] cursor-pointer"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
          : (
            <>
              <StatCard dense index={0} label="Avg. time to hire" value={data?.timeToHireDays ?? 0} suffix=" days" icon={Timer} iconClass="text-blue-400 bg-blue-500/15" />
              <StatCard dense index={1} label="Offer acceptance" value={data?.offerAcceptanceRate ?? 0} suffix="%" icon={CheckCircle2} iconClass="text-emerald-400 bg-emerald-500/15" />
              <StatCard dense index={2} label="Offers extended" value={data?.totalOffers ?? 0} icon={Target} iconClass="text-cyan-400 bg-cyan-500/15" />
              <StatCard dense index={3} label="Avg. match score" value={data?.avgMatchPercent ?? 0} decimals={1} suffix="%" icon={Users} iconClass="text-amber-400 bg-amber-500/15" />
            </>
          )}
      </div>

      {isEmpty ? (
        <div className="ws-panel rounded-xl p-10 text-center text-[12px] text-muted-foreground">
          No recruitment activity yet — analytics populate once candidates and jobs are added.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            <Panel title="Department comparison — open vs filled">
              {departmentBreakdown.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-10 text-center">No department data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={departmentBreakdown} margin={{ left: -12, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="department" stroke={chartColors.axis} fontSize={9} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
                    <Bar dataKey="open" fill={chartColors.violet} radius={[3, 3, 0, 0]} name="Open" />
                    <Bar dataKey="filled" fill={chartColors.blue} radius={[3, 3, 0, 0]} name="Filled" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Hiring trends — applications vs hires">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={applicationsTimeline} margin={{ left: -12, right: 8 }}>
                  <defs>
                    <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.green} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={chartColors.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="month" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Line type="monotone" dataKey="applications" stroke={chartColors.blue} strokeWidth={2} dot={false} name="Applications" />
                  <Area type="monotone" dataKey="hires" stroke={chartColors.green} fill="url(#colorHires)" strokeWidth={2} name="Hires" />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            <Panel title="Funnel conversion" icon={TrendingUp}>
              <div className="space-y-2.5">
                {funnelConversion.map((s) => (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span>{s.stage}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {s.count.toLocaleString()} · {s.conversionRate}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full gradient-brand" style={{ width: `${s.conversionRate}%` }} />
                    </div>
                  </div>
                ))}
                {funnelConversion.length === 0 && (
                  <p className="text-[11px] text-muted-foreground py-6 text-center">No pipeline data yet.</p>
                )}
              </div>
            </Panel>

            <Panel title="Candidate diversity — nationality" icon={Globe2}>
              <div className="space-y-2.5">
                {nationalityDiversity.map((n) => (
                  <div key={n.nationality}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px]">{n.nationality}</span>
                      <Badge variant="outline" className="text-[9px] h-5 bg-white/5 border-white/10">
                        {n.count} · {n.percentage}%
                      </Badge>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${n.percentage}%` }} />
                    </div>
                  </div>
                ))}
                {nationalityDiversity.length === 0 && (
                  <p className="text-[11px] text-muted-foreground py-6 text-center">No candidate data yet.</p>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

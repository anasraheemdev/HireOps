"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarX2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInterviewsQuery } from "@/lib/queries/use-interviews";
import { cn, initialsOf } from "@/lib/utils";

const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const statusStyle: Record<string, string> = {
  scheduled: "bg-primary/10 border-primary/20",
  in_progress: "bg-amber-500/10 border-amber-500/25 text-amber-100",
  completed: "bg-emerald-500/10 border-emerald-500/25 text-emerald-100",
  cancelled: "bg-rose-500/10 border-rose-500/25 text-rose-100",
};

export default function HrCalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { data, isLoading, isError, error } = useInterviewsQuery();

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const events = useMemo(() => {
    return (data ?? []).map((iv) => {
      const candidate = firstOf(iv.candidates);
      const job = firstOf(iv.jobs);
      const when = iv.scheduled_at ?? iv.started_at;
      const name = candidate?.full_name ?? "Candidate";
      return {
        id: iv.id,
        date: when ? when.slice(0, 10) : null,
        time: formatTime(when),
        candidateName: name,
        initials: initialsOf(name),
        avatarColor: candidate?.avatar_color || "from-blue-500 to-indigo-600",
        role: job?.title ?? "—",
        status: iv.status,
        mode: iv.mode,
      };
    });
  }, [data]);

  const weekEvents = useMemo(() => {
    const dateSet = new Set(weekDates.map(toIsoDate));
    return events
      .filter((e) => e.date && dateSet.has(e.date))
      .sort((a, b) => (a.time > b.time ? 1 : -1));
  }, [events, weekDates]);

  const rangeLabel = `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const todayIso = toIsoDate(new Date());

  return (
    <div>
      <PageHeader
        title="Interview calendar"
        description="Live interview sessions scheduled across your organization."
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-white/10 cursor-pointer" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 min-w-[150px] text-center">{rangeLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-white/10 cursor-pointer" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" className="text-xs cursor-pointer" onClick={() => setWeekOffset(0)}>
                Today
              </Button>
            )}
          </div>
        }
      />

      {isError ? (
        <div className="ws-panel rounded-xl p-8 flex flex-col items-center text-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <p className="text-sm">{error instanceof Error ? error.message : "Failed to load interviews."}</p>
        </div>
      ) : isLoading ? (
        <div className="ws-panel rounded-xl p-4">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="ws-panel rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-white/10">
              {weekDates.map((d, i) => (
                <div key={d.toISOString()} className="px-2 py-3 text-center border-r border-white/5 last:border-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{weekDayLabels[i]}</p>
                  <p className={cn("text-sm font-medium mt-0.5", toIsoDate(d) === todayIso && "text-blue-400")}>{d.getDate()}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[280px]">
              {weekDates.map((d) => {
                const dateKey = toIsoDate(d);
                const slots = weekEvents.filter((e) => e.date === dateKey);
                return (
                  <div key={dateKey} className="border-r border-white/5 last:border-0 p-2 space-y-1.5 min-h-[140px]">
                    {slots.map((iv) => (
                      <div key={iv.id} className={cn("rounded-lg px-2 py-1.5 text-[11px] border", statusStyle[iv.status] ?? "bg-white/5 border-white/10")}>
                        <p className="font-medium truncate">{iv.time}</p>
                        <p className="truncate text-muted-foreground">{iv.candidateName}</p>
                        <Badge variant="outline" className="mt-1 text-[8px] bg-white/5 border-white/10 px-1 py-0">
                          {iv.mode}
                        </Badge>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 ws-panel rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              This week · {weekEvents.length} interview{weekEvents.length === 1 ? "" : "s"}
            </p>
            {weekEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <CalendarX2 className="h-6 w-6" />
                <p className="text-xs">No interviews scheduled this week.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {weekEvents.map((iv) => (
                  <li key={iv.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">
                      {iv.candidateName} — {iv.role}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {iv.date} · {iv.time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ws-panel rounded-xl flex flex-col items-center justify-center text-center px-6 py-10",
        className
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="text-[12px] text-muted-foreground mt-1 max-w-md leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" className="mt-4 h-8 text-[12px] gradient-brand text-white cursor-pointer" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="ws-panel rounded-xl p-8 text-center border-destructive/25">
      <h3 className="text-sm font-semibold text-destructive">{title}</h3>
      {description && <p className="text-[12px] text-muted-foreground mt-1.5">{description}</p>}
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-3 h-8 text-[12px] cursor-pointer" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 animate-pulse">
      <div className="h-5 w-36 rounded-md bg-white/10" />
      <div className="h-3 w-56 rounded bg-white/5" />
      <div className="grid gap-2 mt-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}

export function MetricBar({
  label,
  value,
  max = 100,
  tone = "primary",
}: {
  label: string;
  value: number;
  max?: number;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = {
    primary: "bg-primary",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", colors[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    neutral: "bg-white/5 text-muted-foreground border-white/10",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    info: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize", styles[tone])}>
      {children}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="ws-panel rounded-xl p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1 tracking-tight tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 rounded-lg bg-white/[0.035] border border-white/[0.08] pl-8 pr-3 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-shadow"
      />
    </div>
  );
}

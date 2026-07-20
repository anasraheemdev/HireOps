"use client";

import { cn } from "@/lib/utils";

export function DetailPanel({
  title,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col ws-panel rounded-md overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex items-start gap-2 border-b border-white/8 px-3 py-2.5 shrink-0">
          <div className="min-w-0 flex-1">
            {title && <div className="text-sm font-semibold truncate">{title}</div>}
            {subtitle && <div className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
        </div>
      )}
      {tabs && tabs.length > 0 && (
        <div className="flex gap-0.5 border-b border-white/8 px-2 py-1 overflow-x-auto scrollbar-thin shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange?.(t.id)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap",
                activeTab === t.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 ws-dense">{children}</div>
    </div>
  );
}

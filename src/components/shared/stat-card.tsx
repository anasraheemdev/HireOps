"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./animated-counter";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  suffix = "",
  decimals = 0,
  iconClass = "text-blue-400 bg-blue-500/10",
  index = 0,
  dense = false,
}: {
  label: string;
  value: number;
  delta?: number;
  icon: LucideIcon;
  suffix?: string;
  decimals?: number;
  iconClass?: string;
  index?: number;
  dense?: boolean;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "border border-white/[0.07] bg-white/[0.025] rounded-xl hover:bg-white/[0.04] transition-colors",
        dense ? "p-3" : "p-5 glass-card card-hover"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("rounded-lg flex items-center justify-center shrink-0", dense ? "h-8 w-8" : "h-10 w-10 rounded-xl", iconClass)}>
          <Icon className={dense ? "h-4 w-4" : "h-5 w-5"} />
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
              positive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className={cn("font-semibold tracking-tight tabular-nums", dense ? "mt-2.5 text-xl" : "mt-4 text-2xl")}>
        <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
      </p>
      <p className={cn("text-muted-foreground", dense ? "mt-0.5 text-[11px]" : "mt-1 text-xs")}>{label}</p>
    </motion.div>
  );
}

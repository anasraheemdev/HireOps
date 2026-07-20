"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 85 ? "oklch(0.72 0.17 155)" : score >= 65 ? "oklch(0.7 0.14 220)" : score >= 45 ? "oklch(0.79 0.16 80)" : "oklch(0.64 0.21 25)";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold tracking-tight" style={{ fontSize: size * 0.24 }}>
          {label ?? Math.round(score)}
        </span>
        {sublabel && <span className="text-muted-foreground" style={{ fontSize: size * 0.09 }}>{sublabel}</span>}
      </div>
    </div>
  );
}

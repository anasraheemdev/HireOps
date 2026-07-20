"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type HireOpsLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  /** "mark" = cropped icon; "full" = original square asset */
  variant?: "mark" | "full";
};

export function HireOpsLogo({
  size = 32,
  className,
  priority = false,
  variant = "mark",
}: HireOpsLogoProps) {
  const src = variant === "full" ? BRAND.logoSrc : BRAND.logoMarkSrc;
  return (
    <Image
      src={src}
      alt={BRAND.name}
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain select-none", className)}
    />
  );
}

export function HireOpsWordmark({
  className,
  showTagline = false,
  size = "md",
}: {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const title =
    size === "lg" ? "text-2xl font-semibold tracking-tight" : size === "sm" ? "text-[13px] font-semibold tracking-tight" : "text-sm font-semibold tracking-tight";
  const tag =
    size === "lg" ? "text-sm text-muted-foreground mt-1" : "text-[10px] text-muted-foreground mt-0.5";

  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn(title, "truncate leading-tight")}>{BRAND.name}</p>
      {showTagline && <p className={cn(tag, "truncate leading-tight")}>{BRAND.tagline}</p>}
    </div>
  );
}

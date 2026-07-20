"use client";

import { motion } from "framer-motion";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";

export function BrandLoadingScreen({
  message = "Loading enterprise recruitment workspace…",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-5 p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <HireOpsLogo size={56} priority variant="full" className="rounded-xl" />
        <motion.div
          className="absolute -inset-2 rounded-2xl border border-primary/30"
          animate={{ opacity: [0.35, 0.85, 0.35], scale: [1, 1.04, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold tracking-tight">{BRAND.name}</p>
        <p className="text-[12px] text-muted-foreground">{message}</p>
      </div>
      <div className="h-1 w-36 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full gradient-brand"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "40%" }}
        />
      </div>
    </div>
  );
}

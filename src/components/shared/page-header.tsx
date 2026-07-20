"use client";

import { motion } from "framer-motion";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-end justify-between gap-3 mb-3"
    >
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </motion.div>
  );
}

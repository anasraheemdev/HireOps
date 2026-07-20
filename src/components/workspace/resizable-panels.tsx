"use client";

import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

export function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return <Group className={cn("flex h-full w-full", className)} {...props} />;
}

export function ResizablePanel({ className, ...props }: PanelProps) {
  return <Panel className={cn("min-w-0 min-h-0", className)} {...props} />;
}

export function ResizableHandle({ className, withHandle, ...props }: SeparatorProps & { withHandle?: boolean }) {
  return (
    <Separator
      className={cn(
        "relative flex w-1.5 items-center justify-center bg-transparent transition-colors hover:bg-primary/30 data-[resize-handle-active]:bg-primary/40",
        "aria-[orientation=horizontal]:h-1.5 aria-[orientation=horizontal]:w-full",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-6 w-1 items-center justify-center rounded-sm bg-white/20" />
      ) : null}
    </Separator>
  );
}

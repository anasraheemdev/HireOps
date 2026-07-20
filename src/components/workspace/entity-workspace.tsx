"use client";

import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable-panels";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type EntityWorkspaceProps = {
  list: React.ReactNode;
  detail?: React.ReactNode | null;
  context?: React.ReactNode | null;
  listDefaultSize?: number;
  detailDefaultSize?: number;
  contextDefaultSize?: number;
  className?: string;
  /** When true and detail is set, show detail as full-screen sheet on small screens */
  mobileDetailOpen?: boolean;
  onMobileDetailClose?: () => void;
};

export function EntityWorkspace({
  list,
  detail,
  context,
  listDefaultSize = 32,
  detailDefaultSize = 42,
  contextDefaultSize = 26,
  className,
  mobileDetailOpen,
  onMobileDetailClose,
}: EntityWorkspaceProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const hasDetail = !!detail;
  const hasContext = !!context && hasDetail;

  if (isMobile) {
    return (
      <div className={cn("h-full min-h-0", className)}>
        <div className="h-full ws-panel rounded-md overflow-hidden">{list}</div>
        <Sheet open={!!mobileDetailOpen && hasDetail} onOpenChange={(o) => !o && onMobileDetailClose?.()}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-background border-white/10">
            <div className="h-full flex flex-col">
              {detail}
              {hasContext && <div className="border-t border-white/8 max-h-[40%] overflow-auto">{context}</div>}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  if (!hasDetail) {
    return (
      <div className={cn("h-full min-h-0 ws-panel rounded-md overflow-hidden", className)}>{list}</div>
    );
  }

  return (
    <div className={cn("h-full min-h-0", className)}>
      <ResizablePanelGroup orientation="horizontal" className="gap-0">
        <ResizablePanel defaultSize={`${listDefaultSize}%`} minSize="18%" className="pr-0">
          <div className="h-full ws-panel rounded-md overflow-hidden mr-1">{list}</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          defaultSize={`${hasContext ? detailDefaultSize : 100 - listDefaultSize}%`}
          minSize="28%"
        >
          <div className={cn("h-full", hasContext ? "mx-1" : "ml-1")}>{detail}</div>
        </ResizablePanel>
        {hasContext && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={`${contextDefaultSize}%`} minSize="16%">
              <div className="h-full ml-1">{context}</div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

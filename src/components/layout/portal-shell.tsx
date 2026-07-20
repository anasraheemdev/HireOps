"use client";

import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { AIAssistant } from "@/components/layout/ai-assistant";
import { CommandPaletteProvider } from "@/components/layout/command-palette-context";
import { MotionPage } from "@/components/shared/motion";
import type { PortalRole } from "@/lib/auth/types";

export function PortalShell({
  portal,
  children,
}: {
  portal: PortalRole;
  children: React.ReactNode;
}) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen w-full">
        <PortalSidebar portal={portal} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <main className="flex-1 min-w-0 px-4 py-6 lg:px-8 lg:py-8">
            <MotionPage>{children}</MotionPage>
          </main>
        </div>
        <CommandPalette />
        {portal !== "candidate" && <AIAssistant />}
      </div>
    </CommandPaletteProvider>
  );
}

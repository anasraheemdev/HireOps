"use client";

import { WorkspaceUiProvider } from "./workspace-ui-context";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { WorkspaceToolbar } from "./workspace-toolbar";
import { AiDock, AiDockFab } from "./ai-dock";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { CommandPalette } from "@/components/layout/command-palette";
import { CommandPaletteProvider } from "@/components/layout/command-palette-context";
import { LangProvider } from "@/lib/i18n";
import type { PortalRole } from "@/lib/auth/types";

export function WorkspaceShell({
  portal,
  children,
}: {
  portal: PortalRole;
  children: React.ReactNode;
}) {
  return (
    <LangProvider>
      <CommandPaletteProvider>
        <WorkspaceUiProvider>
          <div className="flex h-svh w-full overflow-hidden">
            <WorkspaceSidebar portal={portal} />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <WorkspaceToolbar portal={portal} />
              <div className="flex-1 min-h-0 flex overflow-hidden">
                <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin p-3 lg:p-4">{children}</main>
                {portal !== "candidate" && <AiDock />}
              </div>
            </div>
            <CommandPalette />
            <ShortcutsDialog />
            {portal !== "candidate" && <AiDockFab />}
          </div>
        </WorkspaceUiProvider>
      </CommandPaletteProvider>
    </LangProvider>
  );
}

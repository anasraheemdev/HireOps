import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { AIAssistant } from "./ai-assistant";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 min-w-0 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <CommandPalette />
      <AIAssistant />
    </div>
  );
}

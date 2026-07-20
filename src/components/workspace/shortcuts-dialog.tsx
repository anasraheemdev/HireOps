"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspaceUi } from "./workspace-ui-context";

const SHORTCUTS = [
  { keys: "⌘ K", desc: "Command palette / search" },
  { keys: "⌘ B", desc: "Toggle sidebar" },
  { keys: "⌘ J", desc: "Toggle AI dock" },
  { keys: "?", desc: "Show keyboard shortcuts" },
  { keys: "↑ ↓", desc: "Move selection in lists" },
  { keys: "Enter", desc: "Open selected row" },
  { keys: "Esc", desc: "Close panel / dialog" },
];

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useWorkspaceUi();
  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

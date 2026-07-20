"use client";

import { useRouter } from "next/navigation";
import { Plus, UserPlus, Briefcase, Bot, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PortalRole } from "@/lib/auth/types";

export function QuickCreate({ portal }: { portal: PortalRole }) {
  const router = useRouter();
  if (portal === "candidate") return null;

  const items =
    portal === "super_admin"
      ? [
          { label: "Invite user", href: "/admin/users", icon: UserPlus },
          { label: "Open HR workspace", href: "/hr/dashboard", icon: Briefcase },
        ]
      : [
          { label: "Add candidate", href: "/hr/cv-parsing", icon: UserPlus },
          { label: "Create job", href: "/hr/jobs?create=1", icon: Briefcase },
          { label: "Start interview", href: "/hr/ai-interview", icon: Bot },
          { label: "Assessments", href: "/hr/assessments", icon: ClipboardList },
        ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" className="h-8 gap-1.5 gradient-brand text-white text-[12px] font-medium cursor-pointer px-3 rounded-lg shadow-sm shadow-primary/25" />}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Create</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.href}
              className="cursor-pointer text-xs gap-2"
              onClick={() => router.push(item.href)}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

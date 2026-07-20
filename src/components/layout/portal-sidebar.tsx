"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-provider";
import { filterNavByPermissions, navForPortal } from "@/lib/nav";
import type { PortalRole } from "@/lib/auth/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLang } from "@/lib/i18n";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";

export function PortalSidebar({ portal }: { portal: PortalRole }) {
  const pathname = usePathname();
  const { profile, hasPermission } = useAuth();
  const { navLabel, groupTitle } = useLang();
  const portalTitles: Record<PortalRole, string> = {
    super_admin: "Admin Console",
    hr: "HR Workspace",
    candidate: "Career Portal",
  };
  const groups = filterNavByPermissions(navForPortal(portal), profile?.permissions ?? []).map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || hasPermission(i.permission)),
  }));

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/10 bg-sidebar/80 backdrop-blur-xl">
      <div className="px-5 py-5 border-b border-white/10">
        <Link
          href={portal === "super_admin" ? "/admin" : portal === "candidate" ? "/candidate" : "/hr/dashboard"}
          className="flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0">
            <HireOpsLogo size={36} variant="full" className="h-9 w-9" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">{BRAND.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{portalTitles[portal]}</p>
          </div>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {groupTitle(group.title)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-200 cursor-pointer",
                          active
                            ? "text-foreground bg-white/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/20"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Icon className="relative h-4 w-4 shrink-0" />
                        <span className="relative flex-1 truncate">{navLabel(item.href, item.label)}</span>
                        {item.badge && (
                          <span className="relative text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t border-white/10 text-[10px] text-muted-foreground">
        {profile?.organizationName ?? BRAND.tagline}
      </div>
    </aside>
  );
}

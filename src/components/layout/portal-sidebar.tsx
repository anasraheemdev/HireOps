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
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#263140] bg-[#080D16] backdrop-blur-xl">
      <div className="px-5 py-5 border-b border-[#263140]">
        <Link
          href={portal === "super_admin" ? "/admin" : portal === "candidate" ? "/candidate" : "/hr/dashboard"}
          className="flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0">
            <HireOpsLogo size={36} variant="full" className="h-9 w-9" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-[#F8FAFC]">{BRAND.name}</p>
            <p className="text-[11px] text-[#94A3B8] font-medium truncate" title={portalTitles[portal]}>{portalTitles[portal]}</p>
          </div>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                {groupTitle(group.title)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/candidate" || item.href === "/admin" || item.href === "/hr" || item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]",
                          active
                            ? "text-white bg-[#202733] border-l-2 border-[#C5A059]"
                            : "text-[#CBD5E1] hover:text-white hover:bg-[#18212D]"
                        )}
                      >
                        <Icon className={cn("relative h-4 w-4 shrink-0", active ? "text-[#C5A059]" : "text-[#CBD5E1]")} />
                        <span className={cn("relative flex-1 truncate", active ? "font-semibold text-white" : "text-[#CBD5E1]")}>{navLabel(item.href, item.label)}</span>
                        {item.badge && (
                          <span className="relative text-[9px] px-1.5 py-0.5 rounded-full bg-[#C5A059]/20 text-[#D7B45F] font-semibold">
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
      <div className="p-4 border-t border-[#263140] text-[11px] text-[#94A3B8] font-medium truncate" title={profile?.organizationName ?? BRAND.tagline}>
        {profile?.organizationName ?? BRAND.tagline}
      </div>
    </aside>
  );
}

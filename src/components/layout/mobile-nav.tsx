"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-provider";
import { filterNavByPermissions, navForPortal } from "@/lib/nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";

export function MobileNav() {
  const pathname = usePathname();
  const { profile, hasPermission } = useAuth();
  const { navLabel, groupTitle } = useLang();
  const portal = profile?.portalRole ?? "hr";
  const groups = filterNavByPermissions(navForPortal(portal), profile?.permissions ?? []).map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || hasPermission(i.permission)),
  }));

  return (
    <div className="flex flex-col h-full bg-[#080D16]">
      <div className="px-4 py-4 border-b border-[#263140] flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg overflow-hidden ring-1 ring-white/10">
          <HireOpsLogo size={32} variant="full" className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate text-[#F8FAFC]">{BRAND.name}</p>
          <p className="text-[10px] text-[#94A3B8] truncate" title={BRAND.tagline}>{BRAND.tagline}</p>
        </div>
        <LanguageSwitcher variant="compact" className="text-[#CBD5E1] hover:text-white" />
      </div>
      <ScrollArea className="flex-1 p-3">
        <nav className="space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
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
                          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]",
                          active
                            ? "bg-[#202733] text-white font-medium border-l-2 border-[#C5A059]"
                            : "text-[#CBD5E1] hover:bg-[#18212D] hover:text-white"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#C5A059]" : "text-[#CBD5E1]")} />
                        <span className="truncate">{navLabel(item.href, item.label)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <div className="px-4 py-3 border-t border-[#263140] text-[10px] text-[#94A3B8]">
        {BRAND.copyright}
      </div>
    </div>
  );
}

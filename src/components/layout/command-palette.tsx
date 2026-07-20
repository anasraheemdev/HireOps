"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Users, Briefcase, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { filterNavByPermissions, navForPortal } from "@/lib/nav";
import { useCommandPalette } from "./command-palette-context";
import { useCandidatesQuery } from "@/lib/queries/use-candidates";
import { useJobsQuery } from "@/lib/queries/use-jobs";
import { apiFetch } from "@/lib/api/fetcher";

type SearchHit = {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { profile, hasPermission } = useAuth();
  const portal = profile?.portalRole ?? "hr";
  const pages = filterNavByPermissions(navForPortal(portal), profile?.permissions ?? [])
    .flatMap((g) => g.items)
    .filter((i) => !i.permission || hasPermission(i.permission));

  const showHrData = portal === "hr" || portal === "super_admin";
  const { data: candidates = [] } = useCandidatesQuery({ enabled: showHrData && open });
  const { data: jobs = [] } = useJobsQuery({ enabled: showHrData && open });
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<SearchHit[]>(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Global Search" description="Search pages, candidates, and jobs">
      <CommandInput placeholder="Search pages, candidates, jobs..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {hits.length > 0 && (
          <CommandGroup heading="Live search">
            {hits.map((h) => (
              <CommandItem key={`${h.entity_type}-${h.entity_id}`} onSelect={() => go(h.href)}>
                <Search className="mr-2 h-4 w-4" />
                {h.title}
                <span className="ml-auto text-xs text-muted-foreground capitalize">{h.entity_type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Pages">
          {pages.map((p) => (
            <CommandItem key={p.href} onSelect={() => go(p.href)}>
              <p.icon className="mr-2 h-4 w-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {showHrData && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Candidates">
              {candidates.slice(0, 8).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/hr/candidates/${c.id}`)}>
                  <Users className="mr-2 h-4 w-4" />
                  {c.name}
                  <span className="ml-auto text-xs text-muted-foreground">{c.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Jobs">
              {jobs.slice(0, 8).map((j) => (
                <CommandItem key={j.id} onSelect={() => go(`/hr/jobs`)}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  {j.title}
                  <span className="ml-auto text-xs text-muted-foreground">{j.department}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

"use client";

import { Check, Minus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminRolesQuery } from "@/lib/queries/use-admin";

export default function AdminRolesPage() {
  const { data, isLoading, isError, error, refetch } = useAdminRolesQuery();
  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        description="Live permission matrix sourced from the organization's role catalog."
      />

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load roles</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {roles.map((r) => (
              <div key={r.id} className="glass-card p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{r.name}</p>
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px]">
                    {r.permissionCodes.length} perms
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.description ?? "No description"}</p>
              </div>
            ))}
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/10 text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-3">Permission</th>
                  {roles.map((r) => (
                    <th key={r.id} className="text-center font-medium px-4 py-3">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.code} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="text-foreground">{perm.description ?? perm.code}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground/70">{perm.code}</span>
                    </td>
                    {roles.map((r) => {
                      const granted = r.permissionCodes.includes(perm.code);
                      return (
                        <td key={r.id} className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full",
                              granted ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-muted-foreground/50"
                            )}
                          >
                            {granted ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

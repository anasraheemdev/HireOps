"use client";

import { FileClock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/enterprise-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogsQuery } from "@/lib/queries/use-admin";

export default function AdminAuditPage() {
  const { data: logs, isLoading, isError, error, refetch } = useAuditLogsQuery();

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Privileged actions and system events across the platform."
      />

      {isLoading && (
        <div className="glass-card overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-white/5 last:border-0">
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load audit log</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (logs?.length ?? 0) === 0 && (
        <EmptyState
          icon={FileClock}
          title="No audit events"
          description="Events will appear here as users perform privileged actions."
        />
      )}

      {!isLoading && !isError && (logs?.length ?? 0) > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.2fr_2fr_1.2fr_0.9fr] px-4 py-3 border-b border-white/10 text-xs font-medium text-muted-foreground">
            <span>Actor</span>
            <span>Action</span>
            <span>Time</span>
            <span>IP</span>
          </div>
          {logs!.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-1 sm:grid-cols-[1.2fr_2fr_1.2fr_0.9fr] gap-1 sm:gap-0 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
            >
              <p className="text-sm font-medium truncate">{log.actor}</p>
              <p className="text-sm text-muted-foreground truncate">{log.action}</p>
              <p className="text-xs text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString()}</p>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] w-fit font-mono">
                {log.ip}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

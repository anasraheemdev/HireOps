"use client";

import { useState } from "react";
import { Building2, Sparkles, ShieldCheck, FileClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage } from "@/components/shared/motion";
import WorkflowsSettingsSection from "@/components/hr/workflow-panel";
import { apiFetch } from "@/lib/api/fetcher";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Org = {
  id: string;
  name: string;
  registration_id: string | null;
  contact_email: string | null;
  headquarters: string | null;
  logo_url: string | null;
  timezone: string;
};

type AuditRow = {
  id: string;
  action: string;
  actor_label: string | null;
  entity_type: string | null;
  created_at: string;
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const orgQuery = useQuery({
    queryKey: ["organization"],
    queryFn: () => apiFetch<Org>("/api/organization"),
  });
  const auditQuery = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => apiFetch<AuditRow[]>("/api/admin/audit"),
    retry: false,
  });

  const [nameDraft, setName] = useState<string | undefined>();
  const name = nameDraft ?? orgQuery.data?.name ?? "";
  const [emailDraft, setEmail] = useState<string | undefined>();
  const email = emailDraft ?? orgQuery.data?.contact_email ?? "";
  const [hqDraft, setHq] = useState<string | undefined>();
  const hq = hqDraft ?? orgQuery.data?.headquarters ?? "";
  const [timezoneDraft, setTimezone] = useState<string | undefined>();
  const timezone = timezoneDraft ?? orgQuery.data?.timezone ?? "Asia/Muscat";



  const saveOrg = useMutation({
    mutationFn: () =>
      apiFetch("/api/organization", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          contact_email: email,
          headquarters: hq,
          timezone,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Organization saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (orgQuery.isLoading) return <PageSkeleton rows={6} />;
  if (orgQuery.isError) {
    return (
      <ErrorState
        title="Could not load settings"
        description={orgQuery.error instanceof Error ? orgQuery.error.message : ""}
        onRetry={() => orgQuery.refetch()}
      />
    );
  }

  return (
    <MotionPage>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Organization, AI behavior, security, and workflows
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gradient-brand text-white gap-1.5 cursor-pointer text-[12px]"
          disabled={saveOrg.isPending}
          onClick={() => saveOrg.mutate()}
        >
          <Save className="h-3.5 w-3.5" /> Save changes
        </Button>
      </div>
      <Tabs defaultValue="organization">
        <TabsList className="bg-white/5 border border-white/10 mb-5 flex-wrap h-auto">
          <TabsTrigger value="organization" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Organization
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> AI Configuration
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <FileClock className="h-3.5 w-3.5" /> Audit Logs
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1.5">
            Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-5">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-4 max-w-2xl">
            <div className="space-y-1.5">
              <Label>Organization name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Headquarters</Label>
              <Input value={hq} onChange={(e) => setHq(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Internal notes about recruitment policy…" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="glass-card p-5 max-w-xl space-y-3"><h2 className="font-semibold">AI governance</h2><p className="text-sm text-muted-foreground">Your administrator manages the inference provider, model and encrypted credentials in the Admin Console. Scoring shows job-related evidence and missing assessments. Shortlisting remains an explicit HR decision.</p></div>
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <div className="glass-card p-5 max-w-xl space-y-3"><h2 className="font-semibold">Access controls</h2><p className="text-sm text-muted-foreground">API authorization and database policies enforce organization and candidate access. Administrators can suspend accounts and manage roles. Exam answer keys and score updates are server-managed.</p><p className="text-sm text-muted-foreground">MFA and external identity-provider setup require deployment configuration; they are not enabled by a local preference switch.</p></div>
        </TabsContent>

        <TabsContent value="audit">
          {auditQuery.isLoading && <PageSkeleton rows={4} />}
          {auditQuery.isError && (
            <ErrorState
              title="Could not load audit logs"
              description={auditQuery.error instanceof Error ? auditQuery.error.message : ""}
              onRetry={() => auditQuery.refetch()}
            />
          )}
          {!auditQuery.isLoading && !auditQuery.isError && (auditQuery.data?.length ?? 0) === 0 && (
            <EmptyState title="No audit events" description="Sensitive actions will appear here." />
          )}
          <div className="space-y-2">
            {(auditQuery.data ?? []).slice(0, 40).map((row) => (
              <div key={row.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{row.action}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.actor_label ?? "System"} · {row.entity_type ?? "—"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {new Date(row.created_at).toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workflows">
          <WorkflowsSettingsSection />
        </TabsContent>
      </Tabs>
    </MotionPage>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Building2, Sparkles, ShieldCheck, FileClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hq, setHq] = useState("");
  const [timezone, setTimezone] = useState("Asia/Muscat");
  const [biasDetection, setBiasDetection] = useState(true);
  const [autoShortlist, setAutoShortlist] = useState(false);
  const [mfa, setMfa] = useState(true);

  useEffect(() => {
    if (!orgQuery.data) return;
    setName(orgQuery.data.name ?? "");
    setEmail(orgQuery.data.contact_email ?? "");
    setHq(orgQuery.data.headquarters ?? "");
    setTimezone(orgQuery.data.timezone ?? "Asia/Muscat");
  }, [orgQuery.data]);

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
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-4 max-w-xl">
            <p className="text-sm text-muted-foreground">
              Runtime AI provider is configured via server environment variables. Toggle local hiring preferences below.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Bias detection</p>
                <p className="text-xs text-muted-foreground">Flag potentially biased language in evaluations</p>
              </div>
              <Switch checked={biasDetection} onCheckedChange={setBiasDetection} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-shortlist high matches</p>
                <p className="text-xs text-muted-foreground">Automatically shortlist ≥85% semantic matches</p>
              </div>
              <Switch checked={autoShortlist} onCheckedChange={setAutoShortlist} />
            </div>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => toast.success("AI preferences saved for this session")}
            >
              Save AI preferences
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require MFA for HR staff</p>
                <p className="text-xs text-muted-foreground">Enforce multi-factor authentication at login</p>
              </div>
              <Switch checked={mfa} onCheckedChange={setMfa} />
            </div>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => toast.success("Security preference recorded")}
            >
              Save security settings
            </Button>
          </div>
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

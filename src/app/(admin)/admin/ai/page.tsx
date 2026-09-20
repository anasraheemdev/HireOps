"use client";

import { useState } from "react";
import { Save, Sparkles, Loader2, AlertTriangle, ShieldCheck, Activity, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSecretsQuery, useUpsertSecretMutation } from "@/lib/queries/use-admin";

const fields = [
  { key: "ai_provider", label: "Inference provider", placeholder: "openrouter, groq, together, fireworks, deepinfra", mono: false },
  { key: "ai_chat_model", label: "Chat / interview model", placeholder: "e.g. qwen/qwen-2.5-72b-instruct", mono: true },
  { key: "ai_embed_model", label: "Embeddings model", placeholder: "e.g. openai/text-embedding-3-small", mono: true },
  { key: "ai_api_key", label: "API key", placeholder: "sk-...", mono: true },
] as const;

type HealthData = {
  provider: string;
  model: string;
  configurationSource: "organization" | "environment";
  apiKeyConfigured: boolean;
  appEncryptionKeyConfigured: boolean;
  providerReachable: boolean;
  authenticationValid: boolean;
  modelAvailable: boolean;
  jsonModeWorking: boolean;
  decryptionFailed?: boolean;
  lastErrorCode: string | null;
};

export default function AdminAiPage() {
  const { data: secrets, isLoading, isError, error, refetch } = useSecretsQuery();
  const upsert = useUpsertSecretMutation();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthData | null>(null);

  const maskedFor = (key: string) => secrets?.find((s) => s.key === key)?.masked ?? null;

  const handleSaveField = async (key: typeof fields[number]["key"], label: string) => {
    const value = drafts[key]?.trim();
    if (!value) {
      toast.error(`Enter a value for ${label} before saving`);
      return;
    }
    setSaving(key);
    try {
      await upsert.mutateAsync({ key, value });
      toast.success(`${label} saved`);
      setDrafts((d) => ({ ...d, [key]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to save ${label}`);
    } finally {
      setSaving(null);
    }
  };

  const handleTestHealth = async () => {
    setTestingHealth(true);
    try {
      const res = await fetch("/api/admin/health/ai");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Health test request failed");

      const data = json.data as HealthData;
      setHealthResult(data);

      if (data.jsonModeWorking && data.authenticationValid) {
        toast.success(`AI provider ${data.provider} (${data.model}) is active and healthy!`);
      } else {
        toast.warning(`AI provider warning: ${data.lastErrorCode || "Verification incomplete"}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Health test failed");
    } finally {
      setTestingHealth(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI configuration"
        description="Choose inference provider, models, and credentials for the recruitment suite."
      />

      {isLoading && (
        <div className="glass-card p-6 max-w-2xl space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center max-w-2xl">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load AI configuration</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-6 max-w-2xl">
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Stored credentials</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/5 border-white/10 text-xs gap-1.5 cursor-pointer"
                disabled={testingHealth}
                onClick={() => void handleTestHealth()}
              >
                {testingHealth ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 text-emerald-400" />}
                Test AI Configuration
              </Button>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              For security, saved values can&apos;t be displayed again — only overwritten. Leave a field blank to keep its current value.
            </p>

            {fields.map((f) => {
              const masked = maskedFor(f.key);
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    {masked ? (
                      <span className="text-[11px] font-mono text-muted-foreground">Current: {masked}</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Not set</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type={f.key === "ai_api_key" ? "password" : "text"}
                      autoComplete="off"
                      id={f.key}
                      value={drafts[f.key] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={f.mono ? "bg-white/5 border-white/10 font-mono text-xs" : "bg-white/5 border-white/10"}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white/5 border-white/10 shrink-0 cursor-pointer"
                      disabled={saving === f.key}
                      onClick={() => handleSaveField(f.key, f.label)}
                    >
                      {saving === f.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}

            <p className="text-[11px] text-muted-foreground pt-2 border-t border-white/10">
              Saved provider, chat model and credentials apply to subsequent AI requests for your organization. Embeddings use the deployment provider and a fixed model to preserve comparison accuracy. Credentials are encrypted at rest; model changes require verification before presentation.
            </p>
          </div>

          {/* Test Health Result Panel */}
          {healthResult && (
            <div className="glass-card p-5 space-y-3 border-primary/30">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">AI Diagnostics Report</h4>
                </div>
                <Badge variant="outline" className="text-xs font-mono bg-white/5">
                  Source: {healthResult.configurationSource}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-semibold">{healthResult.provider}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-muted-foreground">Chat Model:</span>
                  <span className="font-mono text-[11px] truncate max-w-[160px]">{healthResult.model}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-muted-foreground">API Key Configured:</span>
                  {healthResult.apiKeyConfigured ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-3 w-3" /> Missing</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-muted-foreground">Encryption Key:</span>
                  {healthResult.appEncryptionKeyConfigured ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Configured</span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Fallback</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-muted-foreground">Authentication:</span>
                  {healthResult.authenticationValid ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Valid</span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-muted-foreground">JSON Mode Test:</span>
                  {healthResult.jsonModeWorking ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Working</span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</span>
                  )}
                </div>
              </div>

              {healthResult.decryptionFailed && (
                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Existing organization settings could not be decrypted. Please enter and save your OpenRouter API key again.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

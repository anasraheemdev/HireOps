"use client";

import { useState } from "react";
import { Save, Sparkles, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
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
  { key: "ai_chat_model", label: "Chat / interview model", placeholder: "e.g. openai/gpt-4o-mini", mono: true },
  { key: "ai_embed_model", label: "Embeddings model", placeholder: "e.g. openai/text-embedding-3-small", mono: true },
  { key: "ai_api_key", label: "API key", placeholder: "sk-...", mono: true },
] as const;

export default function AdminAiPage() {
  const { data: secrets, isLoading, isError, error, refetch } = useSecretsQuery();
  const upsert = useUpsertSecretMutation();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const maskedFor = (key: string) => secrets?.find((s) => s.key === key)?.masked ?? null;

  const handleSaveField = async (key: string, label: string) => {
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
        <div className="glass-card p-6 max-w-2xl space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Stored credentials</h3>
            <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] ml-auto gap-1">
              <ShieldCheck className="h-3 w-3" /> Values write-only once saved
            </Badge>
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
            Note: the runtime AI provider currently reads <code className="font-mono">AI_PROVIDER</code>,{" "}
            <code className="font-mono">AI_CHAT_MODEL</code>, and related keys from server environment variables. Values
            saved here are persisted for reference and future provider wiring; update your deployment environment to
            change live inference behavior today.
          </p>
        </div>
      )}
    </div>
  );
}

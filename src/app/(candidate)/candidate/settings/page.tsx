"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useMeQuery, useUpdateMeMutation } from "@/lib/queries/use-candidate-portal";
import { toast } from "sonner";

export default function CandidateSettingsPage() {
  const { data, isLoading, isError, error, refetch } = useMeQuery();
  const update = useUpdateMeMutation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (data) setPhone(String(data.candidate?.phone ?? data.profile?.phone ?? ""));
  }, [data]);

  if (isLoading) return <PageSkeleton rows={4} />;
  if (isError) {
    return <ErrorState title="Could not load settings" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />;
  }

  return (
    <MotionPage>
      <PageHeader title="Settings" description="Contact details and account security." />
      <div className="grid gap-4 max-w-xl">
        <form
          className="glass-card p-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await update.mutateAsync({ phone });
              toast.success("Settings saved");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Save failed");
            }
          }}
        >
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={String(data?.profile?.email ?? "")} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit" className="gradient-brand text-white cursor-pointer" disabled={update.isPending}>
            Save settings
          </Button>
        </form>

        <form
          className="glass-card p-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password.length < 8) {
              toast.error("Password must be at least 8 characters");
              return;
            }
            if (password !== password2) {
              toast.error("Passwords do not match");
              return;
            }
            setSavingPw(true);
            try {
              const supabase = createClient();
              const { error: pwErr } = await supabase.auth.updateUser({ password });
              if (pwErr) throw pwErr;
              setPassword("");
              setPassword2("");
              toast.success("Password updated");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Password update failed");
            } finally {
              setSavingPw(false);
            }
          }}
        >
          <h3 className="text-sm font-semibold">Change password</h3>
          <div className="space-y-1.5">
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirm password</Label>
            <Input id="pw2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" className="cursor-pointer" disabled={savingPw}>
            {savingPw ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </MotionPage>
  );
}

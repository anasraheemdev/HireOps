"use client";

import { useState } from "react";
import { Building2, Save, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationQuery, useUpdateOrganizationMutation } from "@/lib/queries/use-admin";

export default function AdminOrganizationPage() {
  const { data: org, isLoading, isError, error, refetch } = useOrganizationQuery();
  const updateOrg = useUpdateOrganizationMutation();

  const [nameDraft, setName] = useState<string | undefined>();
  const name = nameDraft ?? org?.name ?? "";
  const [hqDraft, setHq] = useState<string | undefined>();
  const hq = hqDraft ?? org?.headquarters ?? "";
  const [emailDraft, setEmail] = useState<string | undefined>();
  const email = emailDraft ?? org?.contact_email ?? "";



  const handleSave = () => {
    updateOrg.mutate(
      { name, headquarters: hq, contactEmail: email || null },
      {
        onSuccess: () => toast.success("Organization profile saved."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save organization"),
      }
    );
  };

  return (
    <div>
      <PageHeader
        title="Organization"
        description="Update the primary organization profile for this tenant."
        actions={
          <Button
            className="gradient-brand text-white gap-2 cursor-pointer"
            onClick={handleSave}
            disabled={isLoading || updateOrg.isPending}
          >
            {updateOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        }
      />

      {isLoading && (
        <div className="glass-card p-6 max-w-2xl space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && (
        <div className="glass-card p-10 text-center max-w-2xl">
          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Couldn&apos;t load organization</p>
          <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button variant="outline" className="mt-4 bg-white/5 border-white/10 cursor-pointer" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="glass-card p-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl gradient-brand flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Organization logo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Displayed across portals and reports.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-white/5 border-white/10 text-xs cursor-pointer"
                onClick={() => toast.message("Logo upload coming soon.")}
              >
                Upload new logo
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-hq">Headquarters</Label>
              <Input
                id="org-hq"
                value={hq}
                onChange={(e) => setHq(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-email">Primary contact email</Label>
              <Input
                id="org-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            {org?.registration_id && (
              <div className="space-y-1.5">
                <Label>Registration ID</Label>
                <Input value={org.registration_id} disabled className="bg-white/5 border-white/10" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

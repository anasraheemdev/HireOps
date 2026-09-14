"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, PageSkeleton } from "@/components/shared/enterprise-ui";
import { MotionPage } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dicebearDataUri } from "@/components/avatar/speaking-avatar";
import { useMeQuery, useUpdateMeMutation } from "@/lib/queries/use-candidate-portal";
import { toast } from "sonner";

export default function CandidateProfilePage() {
  const { data, isLoading, isError, error, refetch } = useMeQuery();
  const update = useUpdateMeMutation();
  const [fullNameDraft, setFullName] = useState<string | undefined>();
  const fullName = fullNameDraft ?? String(data?.candidate?.full_name ?? data?.profile?.full_name ?? "");
  const [phoneDraft, setPhone] = useState<string | undefined>();
  const phone = phoneDraft ?? String(data?.candidate?.phone ?? data?.profile?.phone ?? "");
  const [headlineDraft, setHeadline] = useState<string | undefined>();
  const headline = headlineDraft ?? String(data?.candidate?.headline ?? "");
  const [locationDraft, setLocation] = useState<string | undefined>();
  const location = locationDraft ?? String(data?.candidate?.location ?? "");
  const [nationalityDraft, setNationality] = useState<string | undefined>();
  const nationality = nationalityDraft ?? String(data?.candidate?.nationality ?? "");
  const [experienceYearsDraft, setExperienceYears] = useState<string | undefined>();
  const experienceYears = experienceYearsDraft ?? String(data?.candidate?.experience_years ?? 0);

  const avatarSrc = useMemo(() => {
    const seed = String(data?.profile?.email ?? data?.candidate?.full_name ?? "candidate");
    return dicebearDataUri(seed, 96);
  }, [data?.profile?.email, data?.candidate?.full_name]);



  if (isLoading) return <PageSkeleton rows={5} />;
  if (isError) {
    return <ErrorState title="Could not load profile" description={error instanceof Error ? error.message : ""} onRetry={() => refetch()} />;
  }

  return (
    <MotionPage>
      <PageHeader title="My profile" description="Keep your details current for recruiters and AI matching." />
      <form
        className="glass-card p-6 space-y-4 max-w-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await update.mutateAsync({
              fullName,
              phone,
              headline,
              location,
              nationality,
              experienceYears: Number(experienceYears) || 0,
            });
            toast.success("Profile saved");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed");
          }
        }}
      >
        <div className="flex items-center gap-4 pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt=""
            className="h-16 w-16 rounded-full border border-white/15 object-cover"
          />
          <div>
            <p className="text-sm font-semibold">{fullName || "Your avatar"}</p>
            <p className="text-[11px] text-muted-foreground">Generated with DiceBear (open source)</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={String(data?.profile?.email ?? "")} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp">Years of experience</Label>
          <Input id="exp" type="number" min={0} max={50} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
        </div>
        <Button type="submit" className="gradient-brand text-white cursor-pointer" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </MotionPage>
  );
}

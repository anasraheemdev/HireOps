import "server-only";
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/helpers";

type Client = SupabaseClient<Database>;

export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function generateInvitationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  return { rawToken, tokenHash };
}

export async function createCandidateInvitation(
  supabase: Client,
  params: {
    organizationId: string;
    jobId: string;
    email: string;
    fullName: string;
    actorId: string;
    expiresInDays?: number;
  }
) {
  const admin = createAdminSupabaseClient();

  // Verify job exists and belongs to org
  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .select("id, title, organization_id, status")
    .eq("id", params.jobId)
    .eq("organization_id", params.organizationId)
    .single();

  if (jobErr || !job) throw new ApiError(404, "Target job not found in this organization");
  if (job.status !== "open") throw new ApiError(400, "Candidate invitations can only be issued for open jobs");

  // Check or create candidate record
  let candidateId: string;
  const { data: existingCand } = await admin
    .from("candidates")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("email", params.email)
    .maybeSingle();

  if (existingCand) {
    candidateId = existingCand.id;
  } else {
    const { data: newCand, error: candErr } = await admin
      .from("candidates")
      .insert({
        organization_id: params.organizationId,
        full_name: params.fullName,
        email: params.email,
        is_provisional: true,
        is_confirmed: false,
      } as unknown as Database["public"]["Tables"]["candidates"]["Insert"])
      .select("id")
      .single();
    if (candErr || !newCand) throw new ApiError(500, candErr?.message || "Failed to create provisional candidate");
    candidateId = newCand.id;
  }

  // Ensure application record exists
  const { data: existingApp } = await admin
    .from("applications")
    .select("id")
    .eq("job_id", params.jobId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (!existingApp) {
    await admin.from("applications").insert({
      job_id: params.jobId,
      candidate_id: candidateId,
      stage: "applied",
    });
  }

  // Revoke any previous active invitations for this candidate & job
  await admin
    .from("candidate_invitations")
    .update({ status: "revoked" })
    .eq("organization_id", params.organizationId)
    .eq("job_id", params.jobId)
    .eq("candidate_id", candidateId)
    .eq("status", "active");

  const { rawToken, tokenHash } = generateInvitationToken();
  const expiresInDays = params.expiresInDays || 7;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: invErr } = await admin
    .from("candidate_invitations")
    .insert({
      organization_id: params.organizationId,
      job_id: params.jobId,
      candidate_id: candidateId,
      email: params.email,
      full_name: params.fullName,
      token_hash: tokenHash,
      status: "active",
      expires_at: expiresAt,
      created_by: params.actorId,
    })
    .select("*")
    .single();

  if (invErr || !invitation) throw new ApiError(500, invErr?.message || "Failed to create candidate invitation");

  // Log Audit Action
  await admin.from("audit_logs").insert({
    organization_id: params.organizationId,
    actor_id: params.actorId,
    action: `Created candidate invitation for ${params.email} (Job: ${job.title})`,
    entity_type: "candidate_invitation",
    entity_id: invitation.id,
    metadata: { email: params.email, jobId: params.jobId, candidateId, expiresAt },
  });

  return {
    rawToken,
    invitationUrl: `/candidate/signup?invitationToken=${rawToken}`,
    invitation: invitation as Database["public"]["Tables"]["candidate_invitations"]["Row"],
  };
}

export async function validateInvitationToken(rawToken: string) {
  const admin = createAdminSupabaseClient();
  const tokenHash = hashInvitationToken(rawToken);

  const { data: invitation, error } = await admin
    .from("candidate_invitations")
    .select("*, jobs ( title, description ), candidates ( id, full_name, email, headline )")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !invitation) throw new ApiError(404, "Invalid or non-existent invitation token");
  if (invitation.status === "revoked") throw new ApiError(410, "This invitation link has been revoked by HR");
  if (invitation.status === "used" || invitation.used_at) throw new ApiError(410, "This invitation link has already been used");
  if (new Date(invitation.expires_at).getTime() < Date.now() || invitation.status === "expired") {
    // Mark expired if past date
    await admin.from("candidate_invitations").update({ status: "expired" }).eq("id", invitation.id);
    throw new ApiError(410, "This invitation link has expired");
  }

  const job = Array.isArray(invitation.jobs) ? invitation.jobs[0] : invitation.jobs;
  const cand = Array.isArray(invitation.candidates) ? invitation.candidates[0] : invitation.candidates;

  return {
    invitationId: invitation.id,
    organizationId: invitation.organization_id,
    jobId: invitation.job_id,
    jobTitle: job?.title || "Position",
    jobDescription: job?.description || "",
    candidateId: invitation.candidate_id,
    email: invitation.email,
    fullName: cand?.full_name || "",
    expiresAt: invitation.expires_at,
  };
}

export async function acceptAndLinkInvitation(
  rawToken: string,
  userId: string,
  userEmail: string
) {
  const admin = createAdminSupabaseClient();
  const validated = await validateInvitationToken(rawToken);

  // Link auth user profile to provisional candidate
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("id, organization_id, candidate_id")
    .eq("id", userId)
    .single();

  if (profErr || !profile) throw new ApiError(404, "Candidate user profile not found");

  // Atomic link & status update
  await admin
    .from("profiles")
    .update({
      organization_id: validated.organizationId,
      candidate_id: validated.candidateId,
      portal_role: "candidate",
    })
    .eq("id", userId);

  await admin
    .from("candidates")
    .update({
      is_provisional: false,
      is_confirmed: true,
      email: userEmail,
    } as unknown as Database["public"]["Tables"]["candidates"]["Update"])
    .eq("id", validated.candidateId);

  await admin
    .from("candidate_invitations")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
    })
    .eq("id", validated.invitationId);

  // Audit Log
  await admin.from("audit_logs").insert({
    organization_id: validated.organizationId,
    actor_id: userId,
    action: `Accepted candidate invitation and linked account (${userEmail})`,
    entity_type: "candidate_invitation",
    entity_id: validated.invitationId,
    metadata: { candidateId: validated.candidateId, jobId: validated.jobId },
  });

  return {
    success: true,
    candidateId: validated.candidateId,
    jobId: validated.jobId,
  };
}

export async function revokeInvitation(
  organizationId: string,
  actorId: string,
  invitationId: string
) {
  const admin = createAdminSupabaseClient();

  const { data: invitation, error } = await admin
    .from("candidate_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error || !invitation) throw new ApiError(404, "Invitation not found or already removed");

  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actorId,
    action: `Revoked candidate invitation (${invitation.email})`,
    entity_type: "candidate_invitation",
    entity_id: invitation.id,
  });

  return invitation;
}

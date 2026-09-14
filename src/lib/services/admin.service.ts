import { encryptSecret, decryptSecret } from '@/lib/ai/secrets';
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, PortalRoleDb, UserStatus } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/helpers";

type Client = SupabaseClient<Database>;

async function logAdminAudit(
  client: Client,
  params: {
    organizationId: string | null;
    actorId: string | null;
    action: string;
    entityType?: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await client.from("audit_logs").insert({
      organization_id: params.organizationId,
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    /* best-effort — never block the primary operation on audit logging */
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  portal_role: string | null;
  role_id: string | null;
  last_login_at: string | null;
  created_at: string;
  roles: { id: string; name: string } | { id: string; name: string }[] | null;
  departments: { name: string } | { name: string }[] | null;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: string;
  portalRole: string | null;
  roleId: string | null;
  roleName: string | null;
  departmentName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

function mapUserRow(row: UserRow): AdminUser {
  const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
  const department = Array.isArray(row.departments) ? row.departments[0] : row.departments;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    status: row.status,
    portalRole: row.portal_role,
    roleId: role?.id ?? row.role_id ?? null,
    roleName: role?.name ?? null,
    departmentName: department?.name ?? null,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

const USER_SELECT = "id, email, full_name, avatar_url, status, portal_role, role_id, last_login_at, created_at, roles ( id, name ), departments ( name )";

export async function listUsers(supabase: Client, organizationId: string): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(USER_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as UserRow[]).map(mapUserRow);
}

export const inviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).optional(),
  roleId: z.string().uuid().optional(),
  portalRole: z.enum(["super_admin", "hr", "candidate"]).default("hr"),
  departmentId: z.string().uuid().optional(),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export async function inviteUser(organizationId: string, actorId: string, input: InviteUserInput) {
  const admin = createAdminSupabaseClient();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: { data: { full_name: input.fullName ?? null } },
  });
  if (linkError) throw new ApiError(400, linkError.message || "Failed to invite user");

  const userId = linkData.user?.id;
  if (!userId) throw new ApiError(500, "Invite succeeded but no user id was returned");

  const { data, error } = await admin
    .from("profiles")
    .update({
      organization_id: organizationId,
      full_name: input.fullName ?? null,
      role_id: input.roleId ?? null,
      portal_role: input.portalRole as PortalRoleDb,
      department_id: input.departmentId ?? null,
      status: "invited" as UserStatus,
    })
    .eq("id", userId)
    .select(USER_SELECT)
    .single();
  if (error) throw error;

  await logAdminAudit(admin, {
    organizationId,
    actorId,
    action: `Invited user ${input.email}`,
    entityType: "profile",
    entityId: userId,
  });

  return {
    user: mapUserRow(data as UserRow),
    actionLink: linkData.properties?.action_link ?? null,
  };
}

export const updateUserSchema = z.object({
  roleId: z.string().uuid().nullable().optional(),
  portalRole: z.enum(["super_admin", "hr", "candidate"]).optional(),
  status: z.enum(["active", "invited", "suspended"]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export async function updateUser(organizationId: string, actorId: string, userId: string, input: UpdateUserInput) {
  const admin = createAdminSupabaseClient();
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (input.roleId !== undefined) patch.role_id = input.roleId;
  if (input.portalRole !== undefined) patch.portal_role = input.portalRole;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) throw new ApiError(400, "No changes provided");

  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .eq("organization_id", organizationId)
    .select(USER_SELECT)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "User not found");

  await logAdminAudit(admin, {
    organizationId,
    actorId,
    action: `Updated user ${data.email}`,
    entityType: "profile",
    entityId: userId,
    metadata: patch,
  });

  return mapUserRow(data as UserRow);
}

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export async function listRolesWithPermissions(supabase: Client, organizationId: string) {
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, name, description, is_system")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;

  const { data: allPermissions, error: permError } = await supabase
    .from("permissions")
    .select("code, description")
    .order("code");
  if (permError) throw permError;

  const roleIds = (roles ?? []).map((r) => r.id);
  const permsByRole = new Map<string, string[]>();

  if (roleIds.length > 0) {
    const { data: rolePerms, error: rpError } = await supabase
      .from("role_permissions")
      .select("role_id, permissions ( code )")
      .in("role_id", roleIds);
    if (rpError) throw rpError;

    for (const rp of rolePerms ?? []) {
      const perm = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions;
      if (!perm?.code) continue;
      const list = permsByRole.get(rp.role_id) ?? [];
      list.push(perm.code);
      permsByRole.set(rp.role_id, list);
    }
  }

  return {
    roles: (roles ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.is_system,
      permissionCodes: permsByRole.get(r.id) ?? [],
    })),
    permissions: allPermissions ?? [],
  };
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export async function getOrganization(supabase: Client, organizationId: string) {
  const { data, error } = await supabase.from("organizations").select("*").eq("id", organizationId).single();
  if (error) throw error;
  return data;
}

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  registrationId: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  headquarters: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  defaultLanguage: z.enum(["en", "ar"]).optional(),
  timezone: z.string().optional(),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export async function updateOrganization(organizationId: string, actorId: string, input: UpdateOrganizationInput) {
  const admin = createAdminSupabaseClient();
  const patch: Database["public"]["Tables"]["organizations"]["Update"] = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.registrationId !== undefined) patch.registration_id = input.registrationId;
  if (input.contactEmail !== undefined) patch.contact_email = input.contactEmail;
  if (input.headquarters !== undefined) patch.headquarters = input.headquarters;
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl;
  if (input.defaultLanguage !== undefined) patch.default_language = input.defaultLanguage;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (Object.keys(patch).length === 0) throw new ApiError(400, "No changes provided");

  const { data, error } = await admin.from("organizations").update(patch).eq("id", organizationId).select("*").single();
  if (error) throw error;

  await logAdminAudit(admin, {
    organizationId,
    actorId,
    action: "Updated organization profile",
    entityType: "organization",
    entityId: organizationId,
    metadata: patch,
  });

  return data;
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export async function listFeatureFlags(supabase: Client, organizationId: string) {
  const { data, error } = await supabase.from("feature_flags").select("*").eq("organization_id", organizationId).order("key");
  if (error) throw error;
  return (data ?? []).filter(f => ["ai_interview", "semantic_matching", "career_assistant"].includes(f.key));
}

export const upsertFeatureFlagSchema = z.object({
  key: z.enum(["ai_interview", "semantic_matching", "career_assistant"]),
  enabled: z.boolean(),
  description: z.string().optional(),
});
export type UpsertFeatureFlagInput = z.infer<typeof upsertFeatureFlagSchema>;

export async function upsertFeatureFlag(supabase: Client, organizationId: string, actorId: string, input: UpsertFeatureFlagInput) {
  const { data, error } = await supabase
    .from("feature_flags")
    .upsert(
      { organization_id: organizationId, key: input.key, enabled: input.enabled, description: input.description },
      { onConflict: "organization_id,key" }
    )
    .select("*")
    .single();
  if (error) throw error;

  await logAdminAudit(supabase, {
    organizationId,
    actorId,
    action: `${input.enabled ? "Enabled" : "Disabled"} feature flag "${input.key}"`,
    entityType: "feature_flag",
    entityId: data.id,
  });

  return data;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function listAuditLogs(organizationId: string, limit = 100) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_label, ip_address, metadata, created_at, profiles:actor_id ( full_name, email )")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      actor: actor?.full_name ?? actor?.email ?? row.actor_label ?? "System",
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      ip: row.ip_address ?? "internal",
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// AI usage
// ---------------------------------------------------------------------------

const DEMO_COST_PER_MILLION_TOKENS_USD = 30;

export async function getAiUsageSummary(supabase: Client, organizationId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("provider, model, operation, prompt_tokens, completion_tokens, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as { operation: string; prompt_tokens: number; completion_tokens: number; created_at: string }[];

  let totalTokens = 0;
  const byDay = new Map<string, number>();
  const byOperation = new Map<string, { requests: number; tokens: number }>();

  for (const r of rows) {
    const tokens = (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
    totalTokens += tokens;

    const day = r.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + tokens);

    const op = byOperation.get(r.operation) ?? { requests: 0, tokens: 0 };
    op.requests += 1;
    op.tokens += tokens;
    byOperation.set(r.operation, op);
  }

  const estimatedCostUsd = Math.round((totalTokens / 1_000_000) * DEMO_COST_PER_MILLION_TOKENS_USD * 100) / 100;

  return {
    totals: { tokens: totalTokens, requests: rows.length, estimatedCostUsd },
    series: Array.from(byDay.entries()).map(([day, tokens]) => ({ day, tokens })),
    byOperation: Array.from(byOperation.entries())
      .map(([operation, v]) => ({ operation, ...v }))
      .sort((a, b) => b.tokens - a.tokens),
    costPerMillionTokensUsd: DEMO_COST_PER_MILLION_TOKENS_USD,
  };
}

// ---------------------------------------------------------------------------
// Interview templates ("templates" + "prompts" admin pages)
// ---------------------------------------------------------------------------

export async function listInterviewTemplates(supabase: Client, organizationId: string) {
  const { data, error } = await supabase
    .from("interview_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export const createInterviewTemplateSchema = z.object({
  name: z.string().min(2),
  mode: z.string().min(2).default("behavioral"),
  systemPrompt: z.string().optional(),
});
export type CreateInterviewTemplateInput = z.infer<typeof createInterviewTemplateSchema>;

export async function createInterviewTemplate(supabase: Client, organizationId: string, input: CreateInterviewTemplateInput) {
  const { data, error } = await supabase
    .from("interview_templates")
    .insert({
      organization_id: organizationId,
      name: input.name,
      mode: input.mode,
      system_prompt: input.systemPrompt ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Secrets are encrypted at rest with AES-256-GCM.
function maskSecret(base64Value: string): string {
  try {
    const raw = decryptSecret(base64Value);
    if (raw.length <= 4) return "••••";
    const visible = raw.slice(-4);
    return `${"•".repeat(Math.max(6, raw.length - 4))}${visible}`;
  } catch {
    return "••••••••";
  }
}

export async function listSecrets(supabase: Client, organizationId: string) {
  const { data, error } = await supabase
    .from("app_secrets")
    .select("id, key, value_encrypted, created_at")
    .eq("organization_id", organizationId)
    .order("key");
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, key: s.key, masked: maskSecret(s.value_encrypted), createdAt: s.created_at }));
}

export const upsertSecretSchema = z.object({
  key: z.enum(["ai_provider", "ai_chat_model", "ai_embed_model", "ai_api_key"]),
  value: z.string().min(1),
});
export type UpsertSecretInput = z.infer<typeof upsertSecretSchema>;

export async function upsertSecret(supabase: Client, organizationId: string, actorId: string, input: UpsertSecretInput) {
  if(input.key==='ai_provider'&&!['openrouter','groq','together','fireworks','deepinfra'].includes(input.value)) throw new Error('Unsupported AI provider');
  if(input.key==='ai_embed_model'&&input.value !== (process.env.AI_EMBEDDING_MODEL||'openai/text-embedding-3-small')) throw new Error('Changing the embedding model requires a coordinated vector rebuild. Keep the current deployment model.');
  const encoded = encryptSecret(input.value);
  const { data, error } = await supabase
    .from("app_secrets")
    .upsert(
      { organization_id: organizationId, key: input.key, value_encrypted: encoded },
      { onConflict: "organization_id,key" }
    )
    .select("id, key, created_at")
    .single();
  if (error) throw error;

  await logAdminAudit(supabase, {
    organizationId,
    actorId,
    action: `Updated secret "${input.key}"`,
    entityType: "app_secret",
    entityId: data.id,
  });

  return { id: data.id, key: data.key, masked: maskSecret(encoded), createdAt: data.created_at };
}

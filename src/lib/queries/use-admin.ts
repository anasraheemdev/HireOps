import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher";
import type {
  AdminUser,
  InviteUserInput,
  UpdateUserInput,
  UpdateOrganizationInput,
  UpsertFeatureFlagInput,
  CreateInterviewTemplateInput,
  UpsertSecretInput,
} from "@/lib/services/admin.service";

export type { AdminUser };

export type AdminHealth = {
  candidates: number;
  jobs: number;
  users: number;
  usersByPortalRole: { super_admin: number; hr: number; candidate: number };
  embeddingCoverage: number;
  aiRequestsToday: number;
  database: "healthy" | "down";
  dbLatencyMs: number | null;
  storage: "healthy" | "degraded" | "down";
  auth: "healthy" | "down";
};

export function useAdminHealthQuery() {
  return useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => apiFetch<AdminHealth>("/api/admin/health"),
    refetchInterval: 60_000,
  });
}

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiFetch<AdminUser[]>("/api/admin/users"),
  });
}

export function useInviteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) =>
      apiFetch<{ user: AdminUser; actionLink: string | null }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) =>
      apiFetch<AdminUser>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

export type AdminRole = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCodes: string[];
};
export type AdminPermission = { code: string; description: string | null };

export function useAdminRolesQuery() {
  return useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => apiFetch<{ roles: AdminRole[]; permissions: AdminPermission[] }>("/api/admin/roles"),
  });
}

export type AdminOrganization = {
  id: string;
  name: string;
  registration_id: string | null;
  contact_email: string | null;
  headquarters: string | null;
  logo_url: string | null;
  default_language: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export function useOrganizationQuery() {
  return useQuery({
    queryKey: ["admin", "organization"],
    queryFn: () => apiFetch<AdminOrganization>("/api/admin/organization"),
  });
}

export function useUpdateOrganizationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) =>
      apiFetch<AdminOrganization>("/api/admin/organization", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organization"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

export type FeatureFlag = {
  id: string;
  organization_id: string;
  key: string;
  enabled: boolean;
  description: string | null;
};

export function useFeatureFlagsQuery() {
  return useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => apiFetch<FeatureFlag[]>("/api/admin/feature-flags"),
  });
}

export function useUpsertFeatureFlagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertFeatureFlagInput) =>
      apiFetch<FeatureFlag>("/api/admin/feature-flags", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

export type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function useAuditLogsQuery(limit = 100) {
  return useQuery({
    queryKey: ["admin", "audit", limit],
    queryFn: () => apiFetch<AuditLogEntry[]>(`/api/admin/audit?limit=${limit}`),
  });
}

export type AiUsageSummary = {
  totals: { tokens: number; requests: number; estimatedCostUsd: number };
  series: { day: string; tokens: number }[];
  byOperation: { operation: string; requests: number; tokens: number }[];
  costPerMillionTokensUsd: number;
};

export function useAiUsageQuery() {
  return useQuery({
    queryKey: ["admin", "ai-usage"],
    queryFn: () => apiFetch<AiUsageSummary>("/api/admin/ai-usage"),
  });
}

export type InterviewTemplate = {
  id: string;
  organization_id: string;
  name: string;
  mode: string;
  system_prompt: string | null;
  created_at: string;
};

export function useInterviewTemplatesQuery() {
  return useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => apiFetch<InterviewTemplate[]>("/api/admin/templates"),
  });
}

export function useCreateInterviewTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInterviewTemplateInput) =>
      apiFetch<InterviewTemplate>("/api/admin/templates", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
  });
}

export type MaskedSecret = { id: string; key: string; masked: string; createdAt: string };

export function useSecretsQuery() {
  return useQuery({
    queryKey: ["admin", "secrets"],
    queryFn: () => apiFetch<MaskedSecret[]>("/api/admin/secrets"),
  });
}

export function useUpsertSecretMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertSecretInput) =>
      apiFetch<MaskedSecret>("/api/admin/secrets", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "secrets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Candidate Permanent Deletion
// ---------------------------------------------------------------------------

export type { CandidateDeletionPreview, DeleteCandidateInput } from "@/lib/services/admin.service";

export function useCandidateDeletionPreviewQuery(candidateId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["admin", "candidate-deletion-preview", candidateId],
    queryFn: () => apiFetch<{ data: import("@/lib/services/admin.service").CandidateDeletionPreview }>(`/api/admin/candidates/${candidateId}/deletion-preview`),
    enabled: !!candidateId && enabled,
  });
}

export function useDeleteCandidateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, ...input }: import("@/lib/services/admin.service").DeleteCandidateInput & { candidateId: string }) =>
      apiFetch<{ data: { success: boolean; candidateId: string; email: string } }>(`/api/admin/candidates/${candidateId}`, {
        method: "DELETE",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}


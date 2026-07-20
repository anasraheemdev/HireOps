import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AuthProfile, PortalRole } from "./types";

function mapPortalFromRoleName(name: string | null | undefined): PortalRole {
  if (name === "Super Admin") return "super_admin";
  if (name === "Candidate") return "candidate";
  return "hr";
}

export async function getAuthProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AuthProfile | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      `id, email, full_name, avatar_url, status, organization_id, portal_role, candidate_id,
       roles ( id, name ),
       departments ( name ),
       organizations ( name )`
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return null;

  const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;
  const department = Array.isArray(profile.departments) ? profile.departments[0] : profile.departments;
  const organization = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;

  let permissions: string[] = [];
  if (role?.id) {
    const { data: rolePerms } = await supabase
      .from("role_permissions")
      .select("permissions ( code )")
      .eq("role_id", role.id);
    permissions =
      rolePerms?.flatMap((rp) => {
        const perm = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions;
        return perm?.code ? [perm.code] : [];
      }) ?? [];
  }

  const portalRole =
    (profile.portal_role as PortalRole | null) ?? mapPortalFromRoleName(role?.name);

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    status: profile.status,
    roleName: role?.name ?? null,
    departmentName: department?.name ?? null,
    organizationId: profile.organization_id,
    organizationName: organization?.name ?? null,
    portalRole,
    candidateId: profile.candidate_id ?? null,
    permissions,
  };
}

export type PortalRole = "super_admin" | "hr" | "candidate";

export type AuthProfile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: "active" | "invited" | "suspended";
  roleName: string | null;
  departmentName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  portalRole: PortalRole | null;
  candidateId: string | null;
  permissions: string[];
};

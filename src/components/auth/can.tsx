"use client";

import { useAuth } from "@/lib/auth/auth-provider";

export function Can({
  permission,
  permissions,
  fallback = null,
  children,
}: {
  permission?: string;
  permissions?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasPermission, hasAnyPermission } = useAuth();
  const ok = permission
    ? hasPermission(permission)
    : permissions
      ? hasAnyPermission(...permissions)
      : true;
  if (!ok) return <>{fallback}</>;
  return <>{children}</>;
}

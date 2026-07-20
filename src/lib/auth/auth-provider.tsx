"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthProfile } from "./get-profile";
import type { AuthProfile, PortalRole } from "./types";
import type { User } from "@supabase/supabase-js";
import { portalHome } from "@/lib/nav";

type AuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
  isPortal: (role: PortalRole | PortalRole[]) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  initialProfile,
  children,
}: {
  initialUser: User | null;
  initialProfile: AuthProfile | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<AuthProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getAuthProfile(supabase, user.id);
    setProfile(p);
  }, [user, supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        router.push("/login");
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    router.push("/login");
    router.refresh();
  }, [supabase, router]);

  const hasPermission = useCallback(
    (code: string) => {
      if (!profile) return false;
      if (profile.portalRole === "super_admin" || profile.permissions.includes("portal.admin")) return true;
      return profile.permissions.includes(code);
    },
    [profile]
  );

  const hasAnyPermission = useCallback(
    (...codes: string[]) => codes.some((c) => hasPermission(c)),
    [hasPermission]
  );

  const isPortal = useCallback(
    (role: PortalRole | PortalRole[]) => {
      if (!profile?.portalRole) return false;
      return Array.isArray(role) ? role.includes(profile.portalRole) : profile.portalRole === role;
    },
    [profile]
  );

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, hasPermission, hasAnyPermission, isPortal, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useCan(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function homeForProfile(profile: AuthProfile | null): string {
  if (!profile?.portalRole) return "/hr/dashboard";
  return portalHome[profile.portalRole];
}

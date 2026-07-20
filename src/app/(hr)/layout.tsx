import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth/get-profile";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await getAuthProfile(supabase, user.id);
  if (profile?.portalRole === "candidate") redirect("/candidate");
  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <WorkspaceShell portal="hr">{children}</WorkspaceShell>
    </AuthProvider>
  );
}

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth/get-profile";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await getAuthProfile(supabase, user.id);
  if (profile?.portalRole !== "candidate" && profile?.portalRole !== "super_admin") {
    redirect("/hr/dashboard");
  }
  return (
    <AuthProvider initialUser={user} initialProfile={profile}>
      <WorkspaceShell portal="candidate">{children}</WorkspaceShell>
    </AuthProvider>
  );
}

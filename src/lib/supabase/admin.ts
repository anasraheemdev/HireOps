import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * NEVER import this from a Client Component or anything bundled to the
 * browser (the `server-only` import above makes that a build error).
 * Use only for: admin user invitations, background jobs, and trusted
 * server-side aggregate operations that intentionally need to cross
 * organization/RLS boundaries.
 */
export function createAdminSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    throw new Error("Supabase URL and API Key are required in environment variables.");
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}


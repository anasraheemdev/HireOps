/**
 * Creates the first real login-capable user via the Supabase Admin API,
 * links their profile to the seeded organization, and assigns Super Admin.
 *
 * Usage: npx tsx scripts/create-admin-user.ts <email> <password> <full name>
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const [, , email, password, ...nameParts] = process.argv;
const fullName = nameParts.join(" ") || "Saeed Al Amri";

if (!email || !password) {
  console.error("Usage: npx tsx scripts/create-admin-user.ts <email> <password> [full name]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: existing } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!existing) {
    console.error("No organization found — run `npx tsx scripts/seed.ts` first.");
    process.exit(1);
  }
  const orgId = existing.id;

  const { data: role, error: roleErr } = await supabase
    .from("roles")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", "Super Admin")
    .maybeSingle();
  if (roleErr || !role) {
    console.error("Super Admin role not found — run the seed script first.", roleErr);
    process.exit(1);
  }

  const { data: userRes, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr) {
    console.error("Failed to create user:", createErr.message);
    process.exit(1);
  }

  const userId = userRes.user.id;
  console.log(`auth user created: ${userId}`);

  // handle_new_user() trigger already inserted a base profile row — update it
  // with the real org/role/status now that we know them.
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ organization_id: orgId, role_id: role.id, status: "active", full_name: fullName })
    .eq("id", userId);

  if (updateErr) {
    console.error("Failed to finalize profile:", updateErr.message);
    process.exit(1);
  }

  console.log(`Profile linked to organization ${orgId} with role Super Admin.`);
  console.log(`\nYou can now sign in with:\n  email:    ${email}\n  password: ${password}`);
}

main();

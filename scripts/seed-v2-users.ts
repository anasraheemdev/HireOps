/**
 * Seed V2 demo users: HR + Candidate portals.
 * Usage: npx tsx scripts/seed-v2-users.ts
 */
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function ensureUser(email: string, password: string, fullName: string, roleName: string, portal: string) {
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const pg = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = listed?.users?.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
    console.log(`created ${email}`);
  } else {
    console.log(`exists ${email}`);
  }

  const { rows: roles } = await pg.query(`select id from roles where name = $1 limit 1`, [roleName]);
  const roleId = roles[0]?.id;
  await pg.query(
    `update profiles set full_name = $1, role_id = $2, portal_role = $3::portal_role, status = 'active',
      organization_id = coalesce(organization_id, (select id from organizations order by created_at limit 1))
     where id = $4`,
    [fullName, roleId, portal, user!.id]
  );

  // Ensure HR role has portal.hr
  if (portal === "hr" && roleId) {
    await pg.query(
      `insert into role_permissions (role_id, permission_id)
       select $1, p.id from permissions p where p.code = 'portal.hr'
       on conflict do nothing`,
      [roleId]
    );
  }

  await pg.end();
}

async function main() {
  await ensureUser("hr.demo@oia.gov.om", "OiaHr#2026", "Fatima Al Harthy", "Recruiter", "hr");
  await ensureUser("candidate.demo@example.com", "OiaCand#2026", "Khalid Al Amri", "Candidate", "candidate");
  // Ensure super admin portal_role
  const pg = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  await pg.query(`update profiles set portal_role = 'super_admin' where email = 's.alamri@oia.gov.om'`);

  // Link candidate demo user to a candidates row (create if missing)
  const { rows: candProfiles } = await pg.query(
    `select id, organization_id, full_name, email from profiles where email = 'candidate.demo@example.com'`
  );
  const candProfile = candProfiles[0];
  if (candProfile) {
    let { rows: existing } = await pg.query(`select id from candidates where email = $1 limit 1`, [
      candProfile.email,
    ]);
    if (!existing[0]) {
      const inserted = await pg.query(
        `insert into candidates (organization_id, full_name, email, headline, source)
         values ($1, $2, $3, 'Demo candidate', 'portal')
         returning id`,
        [candProfile.organization_id, candProfile.full_name, candProfile.email]
      );
      existing = inserted.rows;
    }
    await pg.query(`update profiles set candidate_id = $1 where id = $2`, [
      existing[0].id,
      candProfile.id,
    ]);
    console.log(`linked candidate_id ${existing[0].id}`);
  }
  // Seed default workflow stages
  await pg.query(`
    insert into workflow_stages (organization_id, code, label, sort_order, requires_approval)
    select o.id, v.code, v.label, v.sort_order, v.requires_approval
    from organizations o
    cross join (values
      ('applied','Applied',1,false),
      ('screening','AI Screening',2,false),
      ('assessment','Assessment',3,false),
      ('ai_interview','AI Interview',4,false),
      ('manager_review','Hiring Manager Review',5,true),
      ('offer','Offer',6,true),
      ('hired','Hired',7,false)
    ) as v(code, label, sort_order, requires_approval)
    on conflict (organization_id, code) do nothing
  `);
  await pg.query(`
    insert into feature_flags (organization_id, key, enabled, description)
    select o.id, f.key, f.enabled, f.description
    from organizations o
    cross join (values
      ('ai_interview_v2', true, 'Enterprise AI interviewer'),
      ('candidate_portal', true, 'Public candidate portal'),
      ('bias_monitoring', true, 'Bias monitoring analytics'),
      ('mfa_optional', false, 'Optional MFA enrollment')
    ) as f(key, enabled, description)
    on conflict (organization_id, key) do nothing
  `);
  await pg.end();
  console.log("V2 users + workflow/flags seeded");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

-- ============================================================================
-- 019: Admin console fixes
--
-- Migrations 007/008 wrote RLS policies referencing 'admin.org.manage',
-- 'admin.roles.manage', 'admin.users.manage', and 'audit.read', but those
-- permission codes were never inserted into `permissions`, so has_permission()
-- always returned false for them (even for Super Admin) and the policies were
-- unusable. Backfill the catalog and grant them to the appropriate roles.
-- ============================================================================

insert into permissions (code, description) values
  ('admin.org.manage', 'Manage organization profile'),
  ('admin.roles.manage', 'Manage roles and role permissions'),
  ('admin.users.manage', 'Invite, edit, and suspend user accounts'),
  ('audit.read', 'View audit log entries')
on conflict (code) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'Super Admin'
  and p.code in ('admin.org.manage', 'admin.roles.manage', 'admin.users.manage', 'audit.read')
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'Compliance Officer'
  and p.code = 'audit.read'
on conflict do nothing;

-- Seed a default feature flag catalog for every existing organization so the
-- admin console has real rows to toggle on first load.
insert into feature_flags (organization_id, key, enabled, description)
select o.id, f.key, f.enabled, f.description
from organizations o
cross join (
  values
    ('ai_interview', true, 'Allow candidates to start AI-led interviews'),
    ('semantic_matching', true, 'Vector-based job-candidate scoring'),
    ('bias_monitoring', true, 'Track demographic balance in pipelines'),
    ('auto_shortlist', false, 'Auto-advance matches above threshold'),
    ('career_assistant', true, 'Candidate AI chat for role guidance'),
    ('offer_esign', false, 'Digital offer letter signing flow')
) as f(key, enabled, description)
on conflict (organization_id, key) do nothing;

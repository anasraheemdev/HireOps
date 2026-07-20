-- ============================================================================
-- 012: V2 portal roles + expanded permission catalog
-- ============================================================================

do $$ begin
  create type portal_role as enum ('super_admin', 'hr', 'candidate');
exception when duplicate_object then null;
end $$;

alter table profiles add column if not exists portal_role portal_role;
alter table profiles add column if not exists candidate_id uuid references candidates(id) on delete set null;

create index if not exists idx_profiles_portal_role on profiles(portal_role);
create index if not exists idx_profiles_candidate on profiles(candidate_id);

-- Backfill portal_role from existing role names
update profiles p
set portal_role = case
  when r.name = 'Super Admin' then 'super_admin'::portal_role
  when r.name is not null then 'hr'::portal_role
  else 'hr'::portal_role
end
from roles r
where p.role_id = r.id and p.portal_role is null;

update profiles set portal_role = 'hr' where portal_role is null;

-- Expanded permissions (idempotent)
insert into permissions (code, description) values
  ('assessments.read', 'View assessments and results'),
  ('assessments.write', 'Create and manage assessments'),
  ('assessments.launch', 'Launch assessments for candidates'),
  ('interviews.read', 'View AI interviews'),
  ('interviews.write', 'Schedule and configure interviews'),
  ('interviews.conduct', 'Conduct or take AI interviews'),
  ('interviews.review', 'Review interview scores and transcripts'),
  ('offers.read', 'View offer letters'),
  ('offers.write', 'Create and send offers'),
  ('messages.read', 'View messages'),
  ('messages.write', 'Send messages'),
  ('portal.candidate', 'Access candidate portal'),
  ('portal.hr', 'Access HR workspace'),
  ('portal.admin', 'Access super admin console'),
  ('admin.ai.configure', 'Configure AI providers and models'),
  ('admin.ai.prompts', 'Manage AI prompts'),
  ('admin.system.monitor', 'View system health and queues'),
  ('admin.feature_flags', 'Manage feature flags'),
  ('admin.branding', 'Manage branding settings'),
  ('notes.write', 'Add internal notes and comments'),
  ('workflows.manage', 'Configure recruitment workflows')
on conflict (code) do nothing;

-- Ensure Super Admin has all permissions
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'Super Admin'
on conflict do nothing;

-- HR-facing roles get portal.hr + recruitment + assessment/interview basics
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name in ('Hiring Manager', 'Recruiter', 'Interviewer', 'Compliance Officer')
  and p.code in (
    'portal.hr',
    'assessments.read', 'assessments.write', 'assessments.launch',
    'interviews.read', 'interviews.write', 'interviews.review',
    'offers.read', 'messages.read', 'messages.write', 'notes.write'
  )
on conflict do nothing;

-- Super Admin portal.admin
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'Super Admin'
  and p.code in ('portal.admin', 'portal.hr', 'admin.ai.configure', 'admin.ai.prompts', 'admin.system.monitor', 'admin.feature_flags', 'admin.branding', 'workflows.manage')
on conflict do nothing;

-- Candidate role
insert into roles (organization_id, name, description, is_system)
select o.id, 'Candidate', 'External candidate portal user', true
from organizations o
where not exists (
  select 1 from roles r where r.organization_id = o.id and r.name = 'Candidate'
);

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'Candidate'
  and p.code in (
    'portal.candidate',
    'assessments.read', 'interviews.conduct', 'interviews.read',
    'offers.read', 'messages.read', 'messages.write'
  )
on conflict do nothing;

comment on column profiles.portal_role is 'Primary portal routing role: super_admin | hr | candidate';
comment on column profiles.candidate_id is 'Linked candidates row when portal_role = candidate';

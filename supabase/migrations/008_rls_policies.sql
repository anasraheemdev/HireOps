-- ============================================================================
-- 008: Row Level Security
-- ============================================================================

alter table organizations enable row level security;
alter table departments enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table candidates enable row level security;
alter table candidate_experience enable row level security;
alter table candidate_education enable row level security;
alter table candidate_certifications enable row level security;
alter table candidate_languages enable row level security;
alter table candidate_skills enable row level security;
alter table applications enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create policy "org_select_own" on organizations for select
  using (id = current_org_id());
create policy "org_update_admin" on organizations for update
  using (id = current_org_id() and has_permission('admin.org.manage'));

-- ---------------------------------------------------------------------------
-- departments / roles / permissions / role_permissions (reference data)
-- ---------------------------------------------------------------------------
create policy "departments_select_same_org" on departments for select
  using (organization_id = current_org_id());
create policy "departments_write_admin" on departments for all
  using (organization_id = current_org_id() and has_permission('admin.org.manage'))
  with check (organization_id = current_org_id() and has_permission('admin.org.manage'));

create policy "roles_select_same_org" on roles for select
  using (organization_id = current_org_id());
create policy "roles_write_admin" on roles for all
  using (organization_id = current_org_id() and has_permission('admin.roles.manage'))
  with check (organization_id = current_org_id() and has_permission('admin.roles.manage'));

create policy "permissions_select_authenticated" on permissions for select
  using (auth.uid() is not null);

create policy "role_permissions_select_same_org" on role_permissions for select
  using (exists (select 1 from roles r where r.id = role_permissions.role_id and r.organization_id = current_org_id()));
create policy "role_permissions_write_admin" on role_permissions for all
  using (exists (select 1 from roles r where r.id = role_permissions.role_id and r.organization_id = current_org_id()) and has_permission('admin.roles.manage'))
  with check (exists (select 1 from roles r where r.id = role_permissions.role_id and r.organization_id = current_org_id()) and has_permission('admin.roles.manage'));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_same_org" on profiles for select
  using (organization_id = current_org_id() or id = auth.uid());
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "profiles_update_admin" on profiles for update
  using (organization_id = current_org_id() and has_permission('admin.users.manage'))
  with check (organization_id = current_org_id() and has_permission('admin.users.manage'));
create policy "profiles_insert_admin" on profiles for insert
  with check (organization_id = current_org_id() and has_permission('admin.users.manage'));

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create policy "jobs_select_same_org" on jobs for select
  using (organization_id = current_org_id());
create policy "jobs_write" on jobs for all
  using (organization_id = current_org_id() and has_permission('jobs.write'))
  with check (organization_id = current_org_id() and has_permission('jobs.write'));

-- ---------------------------------------------------------------------------
-- candidates + sub-entities
-- ---------------------------------------------------------------------------
create policy "candidates_select_same_org" on candidates for select
  using (organization_id = current_org_id());
create policy "candidates_write" on candidates for all
  using (organization_id = current_org_id() and has_permission('candidates.write'))
  with check (organization_id = current_org_id() and has_permission('candidates.write'));

create policy "candidate_experience_select" on candidate_experience for select
  using (exists (select 1 from candidates c where c.id = candidate_experience.candidate_id and c.organization_id = current_org_id()));
create policy "candidate_experience_write" on candidate_experience for all
  using (exists (select 1 from candidates c where c.id = candidate_experience.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'))
  with check (exists (select 1 from candidates c where c.id = candidate_experience.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'));

create policy "candidate_education_select" on candidate_education for select
  using (exists (select 1 from candidates c where c.id = candidate_education.candidate_id and c.organization_id = current_org_id()));
create policy "candidate_education_write" on candidate_education for all
  using (exists (select 1 from candidates c where c.id = candidate_education.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'))
  with check (exists (select 1 from candidates c where c.id = candidate_education.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'));

create policy "candidate_certifications_select" on candidate_certifications for select
  using (exists (select 1 from candidates c where c.id = candidate_certifications.candidate_id and c.organization_id = current_org_id()));
create policy "candidate_certifications_write" on candidate_certifications for all
  using (exists (select 1 from candidates c where c.id = candidate_certifications.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'))
  with check (exists (select 1 from candidates c where c.id = candidate_certifications.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'));

create policy "candidate_languages_select" on candidate_languages for select
  using (exists (select 1 from candidates c where c.id = candidate_languages.candidate_id and c.organization_id = current_org_id()));
create policy "candidate_languages_write" on candidate_languages for all
  using (exists (select 1 from candidates c where c.id = candidate_languages.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'))
  with check (exists (select 1 from candidates c where c.id = candidate_languages.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'));

create policy "candidate_skills_select" on candidate_skills for select
  using (exists (select 1 from candidates c where c.id = candidate_skills.candidate_id and c.organization_id = current_org_id()));
create policy "candidate_skills_write" on candidate_skills for all
  using (exists (select 1 from candidates c where c.id = candidate_skills.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'))
  with check (exists (select 1 from candidates c where c.id = candidate_skills.candidate_id and c.organization_id = current_org_id()) and has_permission('candidates.write'));

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create policy "applications_select_same_org" on applications for select
  using (exists (select 1 from candidates c where c.id = applications.candidate_id and c.organization_id = current_org_id()));
create policy "applications_write" on applications for all
  using (exists (select 1 from candidates c where c.id = applications.candidate_id and c.organization_id = current_org_id()) and has_permission('applications.write'))
  with check (exists (select 1 from candidates c where c.id = applications.candidate_id and c.organization_id = current_org_id()) and has_permission('applications.write'));

-- ---------------------------------------------------------------------------
-- audit_logs — read-only for privileged roles, writes go through the
-- SECURITY DEFINER trigger (audit_application_stage_change) or the service
-- role, never directly from client roles.
-- ---------------------------------------------------------------------------
create policy "audit_logs_select_privileged" on audit_logs for select
  using (organization_id = current_org_id() and has_permission('audit.read'));

-- ---------------------------------------------------------------------------
-- notifications — strictly personal
-- ---------------------------------------------------------------------------
create policy "notifications_select_own" on notifications for select
  using (recipient_id = auth.uid());
create policy "notifications_update_own" on notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

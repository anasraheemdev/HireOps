-- Enforce ownership independently of UI controls and existing permissive policies.
create or replace function current_candidate_id() returns uuid
language sql stable security definer set search_path = public as $$
  select candidate_id from profiles where id = auth.uid() and status = 'active';
$$;
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id=auth.uid() and status='active' and portal_role in ('hr','super_admin'));
$$;

create policy active_accounts on profiles as restrictive for all to authenticated
using (current_user_status()='active') with check (current_user_status()='active');
create policy profile_visibility on profiles as restrictive for select to authenticated
using (id=auth.uid() or (is_staff() and organization_id=current_org_id()));

create or replace function protect_profile_authority() returns trigger language plpgsql set search_path=public as $$
begin
  if auth.role()='authenticated' and (
    new.role_id is distinct from old.role_id or new.portal_role is distinct from old.portal_role or
    new.organization_id is distinct from old.organization_id or new.candidate_id is distinct from old.candidate_id or
    new.status is distinct from old.status or new.email is distinct from old.email
  ) then raise exception 'Account authority must be changed through the administrator API'; end if;
  return new;
end $$;
create trigger protect_profile_authority before update on profiles for each row execute function protect_profile_authority();

create policy candidate_boundary on candidates as restrictive for all to authenticated
using (current_user_status()='active' and organization_id=current_org_id() and (is_staff() or id=current_candidate_id()))
with check (current_user_status()='active' and organization_id=current_org_id() and (is_staff() or id=current_candidate_id()));
create policy candidate_self_update on candidates for update to authenticated
using (id=current_candidate_id()) with check (id=current_candidate_id() and organization_id=current_org_id());

create policy jobs_boundary on jobs as restrictive for select to authenticated
using (current_user_status()='active' and organization_id=current_org_id() and (is_staff() or status='open'));
create policy application_boundary on applications as restrictive for all to authenticated
using (current_user_status()='active' and exists(select 1 from candidates c where c.id=candidate_id and c.organization_id=current_org_id()) and (is_staff() or candidate_id=current_candidate_id()))
with check (current_user_status()='active' and exists(select 1 from candidates c where c.id=candidate_id and c.organization_id=current_org_id()) and exists(select 1 from jobs j where j.id=job_id and j.organization_id=current_org_id()) and (is_staff() or candidate_id=current_candidate_id()));
create policy candidate_apply on applications for insert to authenticated with check (
  candidate_id=current_candidate_id() and stage='applied' and shortlisted=false and created_by=auth.uid()
  and exists(select 1 from jobs j where j.id=job_id and j.status='open' and j.organization_id=current_org_id())
);

-- Exam answers and scoring are server-managed. A candidate can read their assignment,
-- but cannot query answer keys or change their score through PostgREST.
create policy question_staff_only on assessment_questions as restrictive for all to authenticated
using (is_staff()) with check (is_staff());
create policy assessment_staff_write on assessments as restrictive for insert to authenticated with check (is_staff());
create policy assessment_staff_update on assessments as restrictive for update to authenticated using(is_staff()) with check(is_staff());
create policy assessment_staff_delete on assessments as restrictive for delete to authenticated using(is_staff());
create policy assignment_boundary on assessment_assignments as restrictive for all to authenticated
using (current_user_status()='active' and (is_staff() or exists(select 1 from applications a where a.id=application_id and a.candidate_id=current_candidate_id())))
with check (is_staff());
create policy assignment_delete_staff on assessment_assignments as restrictive for delete to authenticated using(is_staff());

create policy interview_boundary on interview_sessions as restrictive for all to authenticated
using (current_user_status()='active' and organization_id=current_org_id() and (is_staff() or candidate_id=current_candidate_id())) with check(is_staff() and organization_id=current_org_id());
create policy interview_delete_staff on interview_sessions as restrictive for delete to authenticated using(is_staff());
create policy interview_message_boundary on interview_messages as restrictive for all to authenticated
using (exists(select 1 from interview_sessions s where s.id=session_id)) with check(is_staff());
create policy interview_message_delete_staff on interview_messages as restrictive for delete to authenticated using(is_staff());

do $$ declare t text; begin
  foreach t in array array['internal_notes','feature_flags','workflow_stages','app_secrets','interview_templates'] loop
    execute format('create policy staff_only on %I as restrictive for all to authenticated using(is_staff() and organization_id=current_org_id()) with check(is_staff() and organization_id=current_org_id())',t);
  end loop;
  foreach t in array array['candidate_documents','portal_messages','offers'] loop
    execute format('create policy owner_boundary on %I as restrictive for all to authenticated using(current_user_status()=''active'' and organization_id=current_org_id() and (is_staff() or candidate_id=current_candidate_id())) with check(current_user_status()=''active'' and organization_id=current_org_id() and (is_staff() or candidate_id=current_candidate_id()))',t);
  end loop;
end $$;
create policy saved_job_owner on saved_jobs as restrictive for all to authenticated
using(current_user_status()='active' and (is_staff() or candidate_id=current_candidate_id()))
with check(current_user_status()='active' and (is_staff() or candidate_id=current_candidate_id()));
create policy storage_owner on storage.objects as restrictive for all to authenticated
using (current_user_status()='active' and (storage.foldername(name))[1]=current_org_id()::text and (is_staff() or (storage.foldername(name))[2]=current_candidate_id()::text))
with check (current_user_status()='active' and (storage.foldername(name))[1]=current_org_id()::text and (is_staff() or (storage.foldername(name))[2]=current_candidate_id()::text));

create or replace function protect_candidate_application() returns trigger language plpgsql set search_path=public as $$
begin
  if auth.role()='authenticated' and not is_staff() then
    if TG_OP='UPDATE' then raise exception 'Application updates require HR'; end if;
    new.match_score := null; new.ai_score := null; new.confidence_score := null;
    new.match_reasoning := null; new.ai_recommendation := null;
    new.strengths := '{}'; new.weaknesses := '{}'; new.shortlisted := false; new.stage := 'applied';
  end if;
  return new;
end $$;
create trigger protect_candidate_application before insert or update on applications for each row execute function protect_candidate_application();

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare org uuid; candidate_role uuid; cid uuid;
begin
  select id into org from organizations order by created_at limit 1;
  if new.raw_user_meta_data->>'portal_role' = 'candidate' then
    select id into candidate_role from roles where organization_id=org and name='Candidate' limit 1;
    if candidate_role is null then raise exception 'Candidate registration is not configured'; end if;
    insert into candidates(organization_id,full_name,email,source)
    values(org,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)),new.email,'portal_signup') returning id into cid;
    insert into profiles(id,organization_id,full_name,email,status,role_id,portal_role,candidate_id)
    values(new.id,org,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email,'active',candidate_role,'candidate',cid);
  else
    insert into profiles(id,organization_id,full_name,email,status)
    values(new.id,org,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email,'invited');
  end if;
  return new;
end $$;

alter view v_candidate_latest_application set (security_invoker=true);
alter view v_job_pipeline_stats set (security_invoker=true);
alter view v_organization_kpis set (security_invoker=true);

alter table assessment_assignments add column if not exists answers jsonb not null default '{}';
alter table assessment_assignments add column if not exists grading_details jsonb not null default '{}';

-- Prevent arbitrary uploaded content and excessive document sizes.
update storage.buckets set file_size_limit=10485760, allowed_mime_types=array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'] where id='resumes';

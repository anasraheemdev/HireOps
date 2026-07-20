-- ============================================================================
-- 005: Triggers
-- ============================================================================

-- Generic updated_at bumper, applied to every table that has the column.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['organizations','profiles','jobs','candidates','applications'] loop
    execute format(
      'drop trigger if exists trg_set_updated_at on %I; create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- Auto-provision a profile row whenever a new auth.users record is created
-- (email/password signup, magic link, or OAuth). Defaults to the first
-- organization and an 'invited' status pending admin role assignment.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_org_id uuid;
begin
  select id into default_org_id from organizations order by created_at asc limit 1;

  insert into public.profiles (id, organization_id, full_name, email, status)
  values (
    new.id,
    default_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'invited'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep last_login_at fresh whenever Supabase Auth records a sign-in.
create or replace function handle_user_login()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles set last_login_at = new.last_sign_in_at where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_handle_user_login on auth.users;
create trigger trg_handle_user_login
  after update on auth.users
  for each row execute function handle_user_login();

-- Automatically write an audit_logs row whenever an application's stage
-- changes (e.g. AI moves a candidate from 'ai_interview' to 'offer').
create or replace function audit_application_stage_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into audit_logs (organization_id, actor_id, actor_label, action, entity_type, entity_id, metadata)
    select
      c.organization_id,
      new.created_by,
      case when new.created_by is null then 'System (AI Engine)' else null end,
      format('Application stage changed: %s -> %s', old.stage, new.stage),
      'application',
      new.id,
      jsonb_build_object('from_stage', old.stage, 'to_stage', new.stage, 'job_id', new.job_id, 'candidate_id', new.candidate_id)
    from candidates c where c.id = new.candidate_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_application_stage_change on applications;
create trigger trg_audit_application_stage_change
  after update on applications
  for each row execute function audit_application_stage_change();

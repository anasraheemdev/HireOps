-- ============================================================================
-- 007: RLS helper functions
--
-- These run SECURITY DEFINER so they can read `profiles`/`role_permissions`
-- without recursing into the RLS policies defined on those same tables.
-- ============================================================================

create or replace function current_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function current_role_name()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.name from profiles p join roles r on r.id = p.role_id where p.id = auth.uid();
$$;

create or replace function current_user_status()
returns user_status
language sql
security definer
stable
set search_path = public
as $$
  select status from profiles where id = auth.uid();
$$;

create or replace function has_permission(perm_code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join role_permissions rp on rp.role_id = p.role_id
    join permissions perm on perm.id = rp.permission_id
    where p.id = auth.uid()
      and perm.code = perm_code
      and p.status = 'active'
  );
$$;

comment on function has_permission(text) is 'True if the currently authenticated user''s role grants the given permission code and the account is active.';

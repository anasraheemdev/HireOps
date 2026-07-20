-- ============================================================================
-- 002: Core tables — organizations, departments, roles, permissions, profiles
-- ============================================================================

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_id text,
  contact_email text,
  headquarters text,
  logo_url text,
  default_language text not null default 'en' check (default_language in ('en', 'ar')),
  timezone text not null default 'Asia/Muscat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table organizations is 'Tenant root — multi-tenant ready (HireOps).';

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- e.g. 'candidates.write', 'jobs.publish', 'admin.users.manage'
  description text
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- 1:1 extension of auth.users. Row is created automatically by the
-- handle_new_user() trigger (see 006_triggers.sql) whenever someone signs up.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  role_id uuid references roles(id) on delete set null,
  full_name text,
  email text not null,
  phone text,
  avatar_url text,
  status user_status not null default 'invited',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_organization on profiles(organization_id);
create index if not exists idx_profiles_role on profiles(role_id);
create index if not exists idx_profiles_department on profiles(department_id);

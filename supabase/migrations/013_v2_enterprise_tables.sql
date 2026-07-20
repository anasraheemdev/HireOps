-- ============================================================================
-- 013: Assessments, interviews, notes, AI usage, feature flags, offers
-- ============================================================================

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  difficulty text not null default 'medium',
  duration_minutes integer not null default 60,
  status text not null default 'draft',
  question_count integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  prompt text not null,
  question_type text not null default 'multiple_choice',
  options jsonb not null default '[]',
  correct_answer text,
  points integer not null default 1,
  sort_order integer not null default 0
);

create table if not exists assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  status text not null default 'pending',
  score numeric(5,2),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assessment_id, application_id)
);

create table if not exists interview_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  mode text not null default 'behavioral',
  system_prompt text,
  created_at timestamptz not null default now()
);

create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  template_id uuid references interview_templates(id) on delete set null,
  mode text not null default 'behavioral',
  status text not null default 'scheduled',
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  summary text,
  recommendation text,
  scores jsonb not null default '{}',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  role text not null check (role in ('system','assistant','user')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_interview_messages_session on interview_messages(session_id, created_at);

create table if not exists internal_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  actor_id uuid references profiles(id) on delete set null,
  provider text not null,
  model text,
  operation text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  description text,
  unique (organization_id, key)
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  salary_text text,
  start_date date,
  status text not null default 'draft',
  document_path text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  requires_approval boolean not null default false,
  unique (organization_id, code)
);

create table if not exists app_secrets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  value_encrypted text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);

-- RLS
alter table assessments enable row level security;
alter table assessment_questions enable row level security;
alter table assessment_assignments enable row level security;
alter table interview_templates enable row level security;
alter table interview_sessions enable row level security;
alter table interview_messages enable row level security;
alter table internal_notes enable row level security;
alter table ai_usage_logs enable row level security;
alter table feature_flags enable row level security;
alter table offers enable row level security;
alter table workflow_stages enable row level security;
alter table app_secrets enable row level security;

drop policy if exists "assessments_org" on assessments;
create policy assessments_org on assessments for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

drop policy if exists "assessment_questions_via_parent" on assessment_questions;
create policy assessment_questions_via_parent on assessment_questions for all using (
  exists (select 1 from assessments a where a.id = assessment_id and a.organization_id = current_org_id())
) with check (
  exists (select 1 from assessments a where a.id = assessment_id and a.organization_id = current_org_id())
);

drop policy if exists "assessment_assignments_via_parent" on assessment_assignments;
create policy assessment_assignments_via_parent on assessment_assignments for all using (
  exists (select 1 from assessments a where a.id = assessment_id and a.organization_id = current_org_id())
) with check (
  exists (select 1 from assessments a where a.id = assessment_id and a.organization_id = current_org_id())
);

drop policy if exists "interview_templates_org" on interview_templates;
create policy interview_templates_org on interview_templates for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

drop policy if exists "interview_sessions_org" on interview_sessions;
create policy interview_sessions_org on interview_sessions for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

drop policy if exists "interview_messages_via_session" on interview_messages;
create policy interview_messages_via_session on interview_messages for all using (
  exists (select 1 from interview_sessions s where s.id = session_id and s.organization_id = current_org_id())
) with check (
  exists (select 1 from interview_sessions s where s.id = session_id and s.organization_id = current_org_id())
);

drop policy if exists "internal_notes_org" on internal_notes;
create policy internal_notes_org on internal_notes for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

drop policy if exists "ai_usage_logs_org" on ai_usage_logs;
create policy ai_usage_logs_org on ai_usage_logs for select using (organization_id = current_org_id() or has_permission('admin.system.monitor'));

drop policy if exists "ai_usage_logs_insert" on ai_usage_logs;
create policy ai_usage_logs_insert on ai_usage_logs for insert with check (true);

drop policy if exists "feature_flags_org" on feature_flags;
create policy feature_flags_org on feature_flags for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

drop policy if exists "offers_org" on offers;
create policy offers_org on offers for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

drop policy if exists "workflow_stages_org" on workflow_stages;
create policy workflow_stages_org on workflow_stages for all using (organization_id = current_org_id()) with check (organization_id = current_org_id());

drop policy if exists "app_secrets_admin" on app_secrets;
create policy app_secrets_admin on app_secrets for all using (has_permission('admin.ai.configure') and organization_id = current_org_id()) with check (has_permission('admin.ai.configure') and organization_id = current_org_id());

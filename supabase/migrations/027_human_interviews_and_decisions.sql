-- ============================================================================
-- 027: Human Interviews & Hiring Decisions
-- ============================================================================

create table if not exists human_interviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  scheduled_by uuid references profiles(id) on delete set null,
  interviewer_name text not null,
  interviewer_email text,
  interview_type text not null default 'video', -- 'in_person', 'video', 'phone'
  scheduled_at timestamptz not null,
  timezone text not null default 'GST',
  meeting_link text,
  location text,
  candidate_instructions text,
  internal_notes text,
  status text not null default 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'rescheduled'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_human_interviews_org on human_interviews(organization_id);
create index if not exists idx_human_interviews_app on human_interviews(application_id);

create table if not exists hiring_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  decision text not null, -- 'selected', 'rejected'
  decided_by uuid references profiles(id) on delete set null,
  candidate_message text,
  internal_notes text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id)
);

create index if not exists idx_hiring_decisions_org on hiring_decisions(organization_id);
create index if not exists idx_hiring_decisions_app on hiring_decisions(application_id);

alter table human_interviews enable row level security;
alter table hiring_decisions enable row level security;

drop policy if exists "human_interviews_org" on human_interviews;
create policy human_interviews_org on human_interviews for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

drop policy if exists "hiring_decisions_org" on hiring_decisions;
create policy hiring_decisions_org on hiring_decisions for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

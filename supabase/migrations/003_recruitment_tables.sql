-- ============================================================================
-- 003: Recruitment domain — jobs, candidates, candidate sub-entities, applications
-- ============================================================================

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  department_id uuid references departments(id) on delete set null,
  title text not null,
  location text not null default 'Muscat, Oman',
  employment_type job_type not null default 'full_time',
  level text,
  status job_status not null default 'draft',
  priority job_priority not null default 'medium',
  posted_date date not null default current_date,
  closing_date date,
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'OMR',
  description text,
  required_skills text[] not null default '{}',
  nice_to_have_skills text[] not null default '{}',
  min_experience_years integer not null default 0,
  hiring_manager_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_jobs_organization on jobs(organization_id);
create index if not exists idx_jobs_department on jobs(department_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_title_trgm on jobs using gin (title gin_trgm_ops);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  full_name_ar text,
  email text not null,
  phone text,
  location text,
  nationality text,
  headline text,
  experience_years numeric(4,1) not null default 0,
  source text,
  avatar_color text not null default 'from-blue-500 to-indigo-600',
  resume_url text,
  resume_file_path text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);
create index if not exists idx_candidates_organization on candidates(organization_id);
create index if not exists idx_candidates_name_trgm on candidates using gin (full_name gin_trgm_ops);

create table if not exists candidate_experience (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  role text not null,
  company text not null,
  location text,
  start_date date,
  end_date date,          -- null = present
  description text,
  sort_order integer not null default 0
);
create index if not exists idx_candidate_experience_candidate on candidate_experience(candidate_id);

create table if not exists candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  degree text not null,
  institution text not null,
  start_date date,
  end_date date,
  grade text,
  sort_order integer not null default 0
);
create index if not exists idx_candidate_education_candidate on candidate_education(candidate_id);

create table if not exists candidate_certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  name text not null,
  issuer text,
  year text
);
create index if not exists idx_candidate_certifications_candidate on candidate_certifications(candidate_id);

create table if not exists candidate_languages (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  name text not null,
  level language_level not null default 'professional'
);
create index if not exists idx_candidate_languages_candidate on candidate_languages(candidate_id);

create table if not exists candidate_skills (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  skill text not null,
  unique (candidate_id, skill)
);
create index if not exists idx_candidate_skills_candidate on candidate_skills(candidate_id);
create index if not exists idx_candidate_skills_skill_trgm on candidate_skills using gin (skill gin_trgm_ops);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  stage application_stage not null default 'applied',
  match_score numeric(5,2),
  ai_score numeric(5,2),
  confidence_score numeric(5,2),
  shortlisted boolean not null default false,
  tags text[] not null default '{}',
  ai_recommendation text,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  applied_date date not null default current_date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, job_id)
);
create index if not exists idx_applications_candidate on applications(candidate_id);
create index if not exists idx_applications_job on applications(job_id);
create index if not exists idx_applications_stage on applications(stage);

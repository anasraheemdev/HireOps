-- ============================================================================
-- 014: Extra storage buckets + candidate portal tables
-- ============================================================================

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
  ('documents', 'documents', false, 20971520, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']),
  ('offers', 'offers', false, 20971520, array['application/pdf']),
  ('recordings', 'recordings', false, 104857600, array['audio/webm','audio/mpeg','audio/wav','video/webm','video/mp4'])
on conflict (id) do nothing;

-- Allow org members to manage objects under their org folder for new buckets
do $$
declare
  b text;
begin
  foreach b in array array['avatars','documents','offers','recordings']
  loop
    execute format('drop policy if exists %I on storage.objects', b || '_select_org');
    execute format(
      'create policy %I on storage.objects for select using (bucket_id = %L and (storage.foldername(name))[1] = current_org_id()::text)',
      b || '_select_org', b
    );
    execute format('drop policy if exists %I on storage.objects', b || '_insert_org');
    execute format(
      'create policy %I on storage.objects for insert with check (bucket_id = %L and (storage.foldername(name))[1] = current_org_id()::text)',
      b || '_insert_org', b
    );
    execute format('drop policy if exists %I on storage.objects', b || '_delete_org');
    execute format(
      'create policy %I on storage.objects for delete using (bucket_id = %L and (storage.foldername(name))[1] = current_org_id()::text)',
      b || '_delete_org', b
    );
  end loop;
end $$;

-- Candidates can upload their own resumes (in addition to HR candidates.write)
drop policy if exists "resumes_insert_candidate_self" on storage.objects;
create policy "resumes_insert_candidate_self" on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = current_org_id()::text
    and (
      has_permission('candidates.write')
      or exists (
        select 1 from profiles p
        where p.id = auth.uid()
          and p.candidate_id is not null
          and (storage.foldername(name))[2] = p.candidate_id::text
      )
    )
  );

-- Saved jobs
create table if not exists saved_jobs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (candidate_id, job_id)
);
create index if not exists idx_saved_jobs_candidate on saved_jobs(candidate_id);

alter table saved_jobs enable row level security;
drop policy if exists saved_jobs_org on saved_jobs;
create policy saved_jobs_org on saved_jobs for all using (
  exists (select 1 from candidates c where c.id = candidate_id and c.organization_id = current_org_id())
) with check (
  exists (select 1 from candidates c where c.id = candidate_id and c.organization_id = current_org_id())
);

-- Candidate documents metadata
create table if not exists candidate_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  label text not null,
  file_path text not null,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_candidate_documents_candidate on candidate_documents(candidate_id);

alter table candidate_documents enable row level security;
drop policy if exists candidate_documents_org on candidate_documents;
create policy candidate_documents_org on candidate_documents for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- Candidate ↔ recruiter messages (simple threads per application or general)
create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  sender_id uuid references profiles(id) on delete set null,
  sender_role text not null default 'hr',
  subject text,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_portal_messages_candidate on portal_messages(candidate_id, created_at desc);

alter table portal_messages enable row level security;
drop policy if exists portal_messages_org on portal_messages;
create policy portal_messages_org on portal_messages for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- Help articles (static CMS-lite for help center)
create table if not exists help_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  slug text not null,
  title text not null,
  body text not null,
  category text not null default 'general',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

alter table help_articles enable row level security;
drop policy if exists help_articles_read on help_articles;
create policy help_articles_read on help_articles for select using (
  published = true and (organization_id is null or organization_id = current_org_id())
);
drop policy if exists help_articles_admin on help_articles;
create policy help_articles_admin on help_articles for all using (
  has_permission('portal.admin') and (organization_id is null or organization_id = current_org_id())
) with check (
  has_permission('portal.admin') and (organization_id is null or organization_id = current_org_id())
);

-- Seed default help articles per org
insert into help_articles (organization_id, slug, title, body, category, sort_order)
select o.id, v.slug, v.title, v.body, v.category, v.sort_order
from organizations o
cross join (values
  ('getting-started', 'Getting started', 'Create your profile, upload a resume, and browse open roles. Apply with one click when ready.', 'general', 1),
  ('applications', 'Tracking applications', 'My Applications shows stage progress from Applied through Offer. You will receive notifications when HR updates your status.', 'applications', 2),
  ('interviews', 'AI interviews', 'Start an AI interview from Interviews. Answer thoughtfully with STAR examples. You can review your score after completion.', 'interviews', 3),
  ('offers', 'Offers', 'When you receive an offer it appears under Offers. Accept or decline; HR is notified immediately.', 'offers', 4)
) as v(slug, title, body, category, sort_order)
on conflict (organization_id, slug) do nothing;

-- Search helper: simple trgm search RPC for candidates + jobs
create or replace function search_org_entities(p_query text, p_limit integer default 20)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  rank real
)
language sql
stable
security invoker
as $$
  with q as (select nullif(trim(p_query), '') as term)
  select * from (
    select
      'candidate'::text as entity_type,
      c.id as entity_id,
      c.full_name as title,
      coalesce(c.headline, c.email) as subtitle,
      similarity(c.full_name, q.term) as rank
    from candidates c, q
    where q.term is not null
      and c.organization_id = current_org_id()
      and c.full_name % q.term
    union all
    select
      'job'::text,
      j.id,
      j.title,
      j.location,
      similarity(j.title, q.term)
    from jobs j, q
    where q.term is not null
      and j.organization_id = current_org_id()
      and j.title % q.term
  ) s
  order by rank desc
  limit greatest(p_limit, 1);
$$;

grant execute on function search_org_entities(text, integer) to authenticated;

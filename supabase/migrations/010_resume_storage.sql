-- ============================================================================
-- 010: Supabase Storage — resumes bucket
--
-- Objects are stored at "{organization_id}/{candidate_id-or-tmp}/{filename}"
-- so RLS can scope access using the first path segment.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
on conflict (id) do nothing;

drop policy if exists "resumes_select_same_org" on storage.objects;
create policy "resumes_select_same_org" on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

drop policy if exists "resumes_insert_same_org" on storage.objects;
create policy "resumes_insert_same_org" on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = current_org_id()::text
    and has_permission('candidates.write')
  );

drop policy if exists "resumes_delete_same_org" on storage.objects;
create policy "resumes_delete_same_org" on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = current_org_id()::text
    and has_permission('candidates.write')
  );

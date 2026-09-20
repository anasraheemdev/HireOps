-- ============================================================================
-- 022: Candidate Onboarding & Profile Confirmation Fields
-- ============================================================================

alter table candidates add column if not exists summary text;
alter table candidates add column if not exists is_confirmed boolean not null default false;

comment on column candidates.summary is 'Professional summary extracted from resume or edited by candidate';
comment on column candidates.is_confirmed is 'True once candidate has reviewed and confirmed their profile data';
notify pgrst, 'reload schema';

-- ============================================================================
-- 006: Views
-- ============================================================================

create or replace view v_job_pipeline_stats as
select
  j.id as job_id,
  j.organization_id,
  j.title,
  count(a.id) filter (where a.id is not null) as applicant_count,
  count(a.id) filter (where a.shortlisted) as shortlisted_count,
  count(a.id) filter (where a.stage in ('ai_interview','final_interview')) as interviewing_count,
  count(a.id) filter (where a.stage = 'offer') as offer_count,
  count(a.id) filter (where a.stage = 'hired') as hired_count
from jobs j
left join applications a on a.job_id = j.id
group by j.id, j.organization_id, j.title;

comment on view v_job_pipeline_stats is 'Denormalized per-job funnel counts, used by the Jobs list page.';

create or replace view v_candidate_latest_application as
select distinct on (a.candidate_id)
  a.candidate_id,
  a.id as application_id,
  a.job_id,
  j.title as job_title,
  j.department_id,
  a.stage,
  a.match_score,
  a.ai_score,
  a.confidence_score,
  a.shortlisted,
  a.applied_date
from applications a
join jobs j on j.id = a.job_id
order by a.candidate_id, a.applied_date desc, a.created_at desc;

comment on view v_candidate_latest_application is 'Each candidate''s most recent application, used by the Candidates list page.';

create or replace view v_organization_kpis as
select
  o.id as organization_id,
  (select count(*) from candidates c where c.organization_id = o.id) as total_candidates,
  (select count(*) from jobs j where j.organization_id = o.id and j.status = 'open') as open_positions,
  (select count(*) from applications a join candidates c on c.id = a.candidate_id where c.organization_id = o.id and a.shortlisted) as shortlisted_count,
  (select round(avg(a.match_score), 1) from applications a join candidates c on c.id = a.candidate_id where c.organization_id = o.id and a.match_score is not null) as avg_match_score
from organizations o;

comment on view v_organization_kpis is 'Executive dashboard KPI rollup per organization.';

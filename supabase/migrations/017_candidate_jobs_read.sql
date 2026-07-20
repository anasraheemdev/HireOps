-- Candidates need to browse open jobs
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'Candidate'
  and p.code in ('jobs.read')
on conflict do nothing;

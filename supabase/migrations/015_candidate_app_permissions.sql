-- Grant candidate application + notification self-access permissions
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'Candidate'
  and p.code in ('applications.read', 'offers.write')
on conflict do nothing;

-- Ensure notifications readable by recipient
drop policy if exists "notifications_own" on notifications;
create policy "notifications_own" on notifications for all
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid() or has_permission('portal.hr') or has_permission('portal.admin'));

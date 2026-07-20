-- Allow authenticated users to insert notifications (self or HR broadcasting)
drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert" on notifications for insert
  with check (
    recipient_id = auth.uid()
    or has_permission('portal.hr')
    or has_permission('portal.admin')
  );

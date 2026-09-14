-- Keep computed results and offer terms behind trusted APIs.
create or replace function protect_candidate_computed_fields() returns trigger language plpgsql set search_path=public as $$
begin
  if auth.role()='authenticated' and not is_staff() and (
    new.organization_id is distinct from old.organization_id or new.embedding is distinct from old.embedding or
    new.embedding_updated_at is distinct from old.embedding_updated_at or new.created_by is distinct from old.created_by
  ) then raise exception 'Computed candidate fields are server-managed'; end if;
  return new;
end $$;
create trigger protect_candidate_computed_fields before update on candidates for each row execute function protect_candidate_computed_fields();

create policy offer_insert_staff on offers as restrictive for insert to authenticated with check(is_staff() and has_permission('offers.write'));
create policy offer_update_staff on offers as restrictive for update to authenticated using(is_staff() and has_permission('offers.write')) with check(is_staff() and has_permission('offers.write'));
create policy offer_delete_staff on offers as restrictive for delete to authenticated using(is_staff() and has_permission('offers.write'));
create policy notifications_boundary on notifications as restrictive for insert to authenticated with check(
  current_user_status()='active' and (recipient_id=auth.uid() or (is_staff() and exists(select 1 from profiles p where p.id=recipient_id and p.organization_id=current_org_id())))
);
create policy message_sender on portal_messages as restrictive for insert to authenticated with check(
  sender_id=auth.uid() and ((is_staff() and sender_role='hr') or (candidate_id=current_candidate_id() and sender_role='candidate'))
);
create policy message_update_staff on portal_messages as restrictive for update to authenticated using(is_staff()) with check(is_staff());
create policy message_delete_staff on portal_messages as restrictive for delete to authenticated using(is_staff());
create policy ai_usage_trusted on ai_usage_logs as restrictive for insert to authenticated with check(is_staff() and organization_id=current_org_id());

do $$ declare t text; perm text; begin
  for t,perm in select * from (values ('feature_flags','admin.feature_flags'),('assessments','assessments.write'),('assessment_questions','assessments.write'),('assessment_assignments','assessments.launch'),('workflow_stages','workflows.manage')) x(t,p) loop
    execute format('create policy permitted_insert on %I as restrictive for insert to authenticated with check(has_permission(%L))',t,perm);
    execute format('create policy permitted_update on %I as restrictive for update to authenticated using(has_permission(%L)) with check(has_permission(%L))',t,perm,perm);
    execute format('create policy permitted_delete on %I as restrictive for delete to authenticated using(has_permission(%L))',t,perm);
  end loop;
end $$;

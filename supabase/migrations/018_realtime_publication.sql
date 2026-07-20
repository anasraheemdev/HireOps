-- Enable realtime for live interview / notifications / applications
do $$
begin
  begin
    alter publication supabase_realtime add table interview_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table notifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table applications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table interview_sessions;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
-- 004: Audit logs & notifications
-- ============================================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  actor_label text,                    -- denormalized fallback, e.g. 'System (AI Engine)'
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_organization on audit_logs(organization_id);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_recipient on notifications(recipient_id, is_read);

-- 0009_audit_log.sql
-- audit_log: append-only trail for sensitive actions (SRS §41).
-- No UPDATE or DELETE policy is ever granted to authenticated users -
-- only service_role (used server-side) can bypass RLS if a correction is
-- ever truly required, and that should be exceptional and out-of-band.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null
    check (action in (
      'create','update','delete','verify',
      'ownership_change','financial_correction','document_verification'
    )),
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Append-only audit trail. Insert-only from the application; no client update/delete path exists (SRS §41).';

create index if not exists idx_audit_log_entity on public.audit_log(entity_table, entity_id);
create index if not exists idx_audit_log_actor on public.audit_log(actor_user_id);

alter table public.audit_log enable row level security;

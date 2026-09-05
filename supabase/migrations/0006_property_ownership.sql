-- 0006_property_ownership.sql
-- property_ownership: normalized many-to-many between properties and owners,
-- with a full history (effective_from/effective_to). Never overwritten -
-- a change in ownership is a new row, the old row gets effective_to set (SRS §10).

create table if not exists public.property_ownership (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete restrict,
  ownership_percent numeric(5,2) not null
    check (ownership_percent > 0 and ownership_percent <= 100),
  effective_from date not null,
  effective_to date,
  legal_title_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_effective_range
    check (effective_to is null or effective_to >= effective_from)
);

comment on table public.property_ownership is 'Historized ownership stakes. A change in ownership is a new row; existing rows are closed via effective_to, never deleted (SRS §10, Master Prompt §6).';

drop trigger if exists trg_property_ownership_updated_at on public.property_ownership;
create trigger trg_property_ownership_updated_at
  before update on public.property_ownership
  for each row execute function public.set_updated_at();

create index if not exists idx_ownership_property on public.property_ownership(property_id);
create index if not exists idx_ownership_owner on public.property_ownership(owner_id);
create index if not exists idx_ownership_active
  on public.property_ownership(property_id) where effective_to is null;

alter table public.property_ownership enable row level security;

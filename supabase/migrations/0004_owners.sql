-- 0004_owners.sql
-- owners: a legal/beneficial owner entity (person, company, trust...).
-- profile_id links an owner record to a login (profiles.id) when that owner
-- is also a system user. Nullable + unique: not every owner logs in
-- (e.g. a co-owned company might not have its own login), and a profile
-- maps to at most one owner record.

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  owner_type text not null default 'person'
    check (owner_type in ('person','company','trust','other')),
  profile_id uuid unique references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.owners is 'Legal/beneficial owners of properties. profile_id links to a login when the owner is also a system user (SRS §10).';

drop trigger if exists trg_owners_updated_at on public.owners;
create trigger trg_owners_updated_at
  before update on public.owners
  for each row execute function public.set_updated_at();

alter table public.owners enable row level security;

-- 0002_profiles.sql
-- profiles: one row per Supabase Auth user.
-- ADR-012: role column exists from V1 onward even though only 'owner' is used today,
-- so future multi-user/RBAC does not require a schema rebuild.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'owner'
    check (role in ('owner','admin','viewer','family_member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application-level profile for each Supabase Auth user. role is architecture-ready for future RBAC (SRS §3).';

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

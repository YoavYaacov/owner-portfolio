-- 0003_usernames.sql
-- ADR-011: username login is implemented via this table plus a Server-side
-- Edge Function that resolves username -> internal auth email before calling
-- Supabase Auth. This table is NEVER queried directly from the client with
-- the anon key: RLS below intentionally has NO policies for authenticated/anon,
-- so only the service_role (used exclusively inside the Edge Function) can
-- read or write it.

create table if not exists public.usernames (
  username text primary key
    check (username = lower(username))
    check (length(username) between 3 and 32),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.usernames is
  'Username -> auth.users mapping. Access restricted to service_role only (Edge Function). No client-side RLS policy is intentional (deny-by-default).';

alter table public.usernames enable row level security;
-- No policies created here on purpose: RLS enabled + zero policies = all
-- access denied to anon/authenticated roles. Only service_role bypasses RLS.

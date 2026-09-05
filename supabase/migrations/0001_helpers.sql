-- 0001_helpers.sql
-- Shared helper functions used across the schema.
-- Reproducible, idempotent (safe to re-run on a fresh database).

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- Generic trigger function: keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at = now() on every row update. Attached as a BEFORE UPDATE trigger on all mutable tables.';

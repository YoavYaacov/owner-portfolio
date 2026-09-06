-- 0014_fx_rates.sql
-- fx_rates: explicit, auditable currency conversion layer (SRS §39).
-- ILS and USD amounts are NEVER summed directly anywhere in the app —
-- portfolio-level aggregation always goes through a rate from this table,
-- and the UI always shows which rate/date was used (ADR-024).
--
-- V1 is manual entry only (source='manual'); an automated daily-rate fetch
-- (e.g. via a scheduled Edge Function hitting a public FX API) is a
-- documented deferred feature, not built now (Anti-Complexity Rule).

create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,
  from_currency text not null check (from_currency in ('ILS','USD')),
  to_currency text not null check (to_currency in ('ILS','USD')),
  rate numeric(12,6) not null check (rate > 0),
  source text not null default 'manual' check (source in ('manual','api')),
  created_at timestamptz not null default now(),
  constraint chk_fx_different_currencies check (from_currency <> to_currency),
  constraint uq_fx_rate_per_day unique (rate_date, from_currency, to_currency)
);

comment on table public.fx_rates is 'Explicit FX conversion table (SRS §39). Portfolio aggregation looks up the latest rate on/before the amount''s date; if none exists within a reasonable window, aggregation reports "not calculable" rather than guessing (ADR-023/ADR-024).';

create index if not exists idx_fx_rates_lookup
  on public.fx_rates(from_currency, to_currency, rate_date desc);

alter table public.fx_rates enable row level security;

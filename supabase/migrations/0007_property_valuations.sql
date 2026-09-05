-- 0007_property_valuations.sql
-- property_valuations: full valuation history per property (SRS §11).
-- document_id is a plain uuid column (no FK yet) because the `documents`
-- table does not exist until Phase 11. The FK constraint will be added then
-- via a dedicated migration - this is intentional, documented forward debt,
-- not an oversight.

create table if not exists public.property_valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  valuation_date date not null,
  market_value numeric(14,2) not null check (market_value >= 0),
  currency text not null check (currency in ('ILS','USD')),
  valuation_type text not null
    check (valuation_type in (
      'owner_estimate','appraisal','purchase_price',
      'broker_estimate','tax_assessment','other'
    )),
  source text,
  document_id uuid, -- FK deferred to Phase 11 (documents table)
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.property_valuations is 'Append-only valuation history. Never delete on value change (SRS §11, Master Prompt §6). document_id FK deferred to Phase 11.';

create index if not exists idx_valuations_property_date
  on public.property_valuations(property_id, valuation_date desc);

alter table public.property_valuations enable row level security;

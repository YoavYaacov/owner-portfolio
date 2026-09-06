-- 0012_loans.sql
-- loans: reflects financing without being a Mortgage Servicing System
-- (SRS §16). This is NOT a payment ledger — actual payments are recorded as
-- 'financing' transactions (0013_transactions.sql); loans holds the terms
-- and the current known balance as of a given date.
--
-- balance_as_of is required: a debt figure with no known "as of" date is
-- exactly the kind of silently-stale number Master Prompt §6 warns against
-- ("נתון שגוי גרוע מנתון חסר") — the UI must always be able to say how old
-- the balance is.

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  lender text not null,
  loan_type text,
  original_principal numeric(14,2) not null check (original_principal >= 0),
  current_balance numeric(14,2) not null check (current_balance >= 0),
  balance_as_of date not null,
  currency text not null check (currency in ('ILS','USD')),
  interest_rate numeric(6,3),
  interest_type text not null default 'unknown'
    check (interest_type in ('fixed','variable','mixed','unknown')),
  indexation_type text not null default 'unknown'
    check (indexation_type in ('none','CPI','prime','other','unknown')),
  start_date date,
  maturity_date date,
  monthly_payment numeric(14,2),
  payment_frequency text not null default 'monthly'
    check (payment_frequency in ('monthly','quarterly','annual','other')),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_loan_maturity_after_start
    check (maturity_date is null or start_date is null or maturity_date >= start_date)
);

comment on table public.loans is 'Financing terms + last-known balance per property (SRS §16). Actual debt-service cash flow is read from financing transactions, not from monthly_payment alone — monthly_payment is a fallback estimate only, always labeled as such in the UI (ADR-023).';

drop trigger if exists trg_loans_updated_at on public.loans;
create trigger trg_loans_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();

create index if not exists idx_loans_property on public.loans(property_id);
create index if not exists idx_loans_active on public.loans(active);
create index if not exists idx_loans_maturity on public.loans(maturity_date) where active;

alter table public.loans enable row level security;

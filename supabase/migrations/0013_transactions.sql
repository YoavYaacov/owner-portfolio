-- 0013_transactions.sql
-- transactions: the central Fact table (SRS §13). is_income/is_operating_expense/
-- is_capex/is_financing are NEVER set directly by the client — a BEFORE
-- INSERT/UPDATE trigger derives them from the chosen category's
-- category_group (0011_transaction_categories.sql). This makes it
-- structurally impossible for a transaction to disagree with its own
-- category about what kind of money it is (Master Prompt §13 — one
-- definition, never duplicated/contradicted across the app).
--
-- lease_id is included as a plain uuid (no FK yet) for forward compatibility
-- with SRS §13 — the `leases` table itself is a later, deferred phase. This
-- mirrors the documented document_id pattern in 0007_property_valuations.sql.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  lease_id uuid, -- FK deferred until the Leases phase
  loan_id uuid references public.loans(id) on delete set null,
  transaction_date date not null,
  posting_date date,
  transaction_type text not null default 'actual'
    check (transaction_type in ('actual','planned','adjustment')),
  category_id uuid not null references public.transaction_categories(id) on delete restrict,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency in ('ILS','USD')),
  -- Derived by trigger from transaction_categories.category_group — see below.
  is_income boolean not null default false,
  is_operating_expense boolean not null default false,
  is_capex boolean not null default false,
  is_financing boolean not null default false,
  vendor text,
  document_id uuid, -- FK deferred to Phase 11 (documents table)
  source text not null default 'manual'
    check (source in ('manual','import','ai_extraction')),
  extraction_confidence numeric(3,2) check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  reviewed boolean not null default true, -- manual entries are self-reviewed by definition
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.transactions is 'Central financial fact table (SRS §13). Category flags are derived, never client-supplied — see trg_transactions_set_flags.';

-- Derive the four boolean flags from the category's group. This runs BEFORE
-- the generic set_updated_at trigger conceptually, but trigger order among
-- same-timing triggers is alphabetical by name in Postgres, and
-- "trg_transactions_set_flags" sorts before "trg_transactions_updated_at" —
-- harmless either way since the two triggers touch disjoint columns.
create or replace function public.set_transaction_flags()
returns trigger
language plpgsql
as $$
declare
  grp text;
begin
  select category_group into grp
  from public.transaction_categories
  where id = new.category_id;

  if grp is null then
    raise exception 'Unknown or inactive transaction category: %', new.category_id;
  end if;

  new.is_income := (grp = 'income');
  new.is_operating_expense := (grp = 'operating');
  new.is_capex := (grp = 'capital');
  new.is_financing := (grp = 'financing');

  return new;
end;
$$;

comment on function public.set_transaction_flags() is 'Single source of truth for is_income/is_operating_expense/is_capex/is_financing — always derived from transaction_categories.category_group (Master Prompt §13).';

drop trigger if exists trg_transactions_set_flags on public.transactions;
create trigger trg_transactions_set_flags
  before insert or update of category_id on public.transactions
  for each row execute function public.set_transaction_flags();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create index if not exists idx_transactions_property_date
  on public.transactions(property_id, transaction_date desc);
create index if not exists idx_transactions_category on public.transactions(category_id);
create index if not exists idx_transactions_loan on public.transactions(loan_id) where loan_id is not null;

alter table public.transactions enable row level security;

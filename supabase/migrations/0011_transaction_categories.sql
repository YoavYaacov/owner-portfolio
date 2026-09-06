-- 0011_transaction_categories.sql
-- transaction_categories: data-driven, not a hardcoded enum (SRS §14 explicitly
-- requires this). category_group drives which financial bucket a transaction
-- falls into (income / operating / capital / financing) — see 0012_transactions.sql,
-- where a trigger derives the transaction's is_income/is_operating_expense/
-- is_capex/is_financing flags FROM this table, so those flags can never drift
-- out of sync with the chosen category (Master Prompt §6 — reliability).

create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  category_key text not null unique,
  category_group text not null
    check (category_group in ('income','operating','capital','financing')),
  label_he text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.transaction_categories is 'Data-driven transaction categories (SRS §14). category_group is the single source of truth for how a transaction rolls up into NOI/CapEx/Debt Service — never re-derived ad hoc in components (Master Prompt §13).';

drop trigger if exists trg_transaction_categories_updated_at on public.transaction_categories;
create trigger trg_transaction_categories_updated_at
  before update on public.transaction_categories
  for each row execute function public.set_updated_at();

alter table public.transaction_categories enable row level security;

-- Seed the categories required by SRS §14. Safe to re-run.
insert into public.transaction_categories (category_key, category_group, label_he) values
  -- Income
  ('rent', 'income', 'שכר דירה'),
  ('reimbursement', 'income', 'החזר הוצאה'),
  ('other_income', 'income', 'הכנסה אחרת'),
  -- Operating
  ('property_tax', 'operating', 'ארנונה'),
  ('hoa', 'operating', 'ועד בית'),
  ('insurance', 'operating', 'ביטוח'),
  ('maintenance', 'operating', 'אחזקה'),
  ('repairs', 'operating', 'תיקונים'),
  ('utilities', 'operating', 'חשמל/מים/גז'),
  ('management_fee', 'operating', 'דמי ניהול'),
  ('legal_operating', 'operating', 'הוצאות משפטיות שוטפות'),
  ('landscaping', 'operating', 'גינון'),
  ('pest_control', 'operating', 'הדברה'),
  ('other_operating', 'operating', 'הוצאה תפעולית אחרת'),
  -- Capital
  ('renovation', 'capital', 'שיפוץ'),
  ('major_replacement', 'capital', 'החלפה גדולה'),
  ('construction', 'capital', 'בנייה'),
  ('capex_other', 'capital', 'השקעה הונית אחרת'),
  -- Financing
  ('mortgage_interest', 'financing', 'ריבית משכנתה'),
  ('mortgage_principal', 'financing', 'קרן משכנתה'),
  ('loan_fee', 'financing', 'עמלת הלוואה')
on conflict (category_key) do nothing;

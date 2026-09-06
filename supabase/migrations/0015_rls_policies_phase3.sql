-- 0015_rls_policies_phase3.sql
-- RLS for the four Phase 3 tables, same choke point as 0010_rls_policies.sql
-- (public.is_portfolio_authorized()) — no new authorization concept
-- introduced. Also wires transactions/loans mutations into the existing
-- audit_log (SRS §41 explicitly lists "financial_correction" and
-- "ownership_change" as audited actions; create/update/delete on the core
-- financial fact tables belong in the same trail).

-- Generic audit trigger: works for any table with a uuid `id` column.
-- Reused as-is by every future table that needs the same trail — one
-- definition, not copy-pasted per table (Master Prompt §13's spirit applied
-- to audit logging, not just financial formulas).
create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_action text;
  v_entity_id uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_entity_id := new.id;
  else
    v_action := 'delete';
    v_entity_id := old.id;
  end if;

  insert into public.audit_log (actor_user_id, action, entity_table, entity_id, before_data, after_data)
  values (
    auth.uid(),
    v_action,
    tg_table_name,
    v_entity_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.log_audit_change() is 'Generic audit trail writer (SRS §41). security definer so it can insert into audit_log even though clients have no direct insert policy misuse path — the row always reflects auth.uid(), never a client-supplied actor.';

drop trigger if exists trg_loans_audit on public.loans;
create trigger trg_loans_audit
  after insert or update or delete on public.loans
  for each row execute function public.log_audit_change();

drop trigger if exists trg_transactions_audit on public.transactions;
create trigger trg_transactions_audit
  after insert or update or delete on public.transactions
  for each row execute function public.log_audit_change();

-- transaction_categories: readable by any authorized user. Not user-editable
-- in Phase 3 UI (seeded, curated list) — write policies exist for
-- completeness/future admin tooling, not because a screen calls them yet.
create policy transaction_categories_select on public.transaction_categories
  for select using (public.is_portfolio_authorized());
create policy transaction_categories_insert on public.transaction_categories
  for insert with check (public.is_portfolio_authorized());
create policy transaction_categories_update on public.transaction_categories
  for update using (public.is_portfolio_authorized());

-- loans: full CRUD for authorized users. Delete is permitted (unlike
-- valuations) because a wrongly-entered loan is a data-entry mistake, not
-- financial history — SRS §42 requires an audit trail for the deletion
-- (trg_loans_audit above), not a ban on deletion itself.
create policy loans_select on public.loans
  for select using (public.is_portfolio_authorized());
create policy loans_insert on public.loans
  for insert with check (public.is_portfolio_authorized());
create policy loans_update on public.loans
  for update using (public.is_portfolio_authorized());
create policy loans_delete on public.loans
  for delete using (public.is_portfolio_authorized());

-- transactions: full CRUD for authorized users, same reasoning as loans.
create policy transactions_select on public.transactions
  for select using (public.is_portfolio_authorized());
create policy transactions_insert on public.transactions
  for insert with check (public.is_portfolio_authorized());
create policy transactions_update on public.transactions
  for update using (public.is_portfolio_authorized());
create policy transactions_delete on public.transactions
  for delete using (public.is_portfolio_authorized());

-- fx_rates: reference/supporting data, not a financial fact of the
-- portfolio itself — authorized users can freely correct a wrong rate.
create policy fx_rates_select on public.fx_rates
  for select using (public.is_portfolio_authorized());
create policy fx_rates_insert on public.fx_rates
  for insert with check (public.is_portfolio_authorized());
create policy fx_rates_update on public.fx_rates
  for update using (public.is_portfolio_authorized());
create policy fx_rates_delete on public.fx_rates
  for delete using (public.is_portfolio_authorized());

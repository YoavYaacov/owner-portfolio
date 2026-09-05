-- 0010_rls_policies.sql
-- RLS strategy (SRS §49): User -> authorized owner -> permitted resources.
-- Never "authenticated users can access everything".
--
-- V1 simplification (documented, not hidden): the portfolio has a single
-- owning family, so any authenticated profile with role 'owner' or 'admin'
-- is treated as authorized across the whole portfolio. When real multi-family
-- support arrives (SRS §57), this function is the ONE place that changes -
-- no policy needs to be touched.

create or replace function public.is_portfolio_authorized()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner','admin')
  );
$$;

comment on function public.is_portfolio_authorized() is
  'Single choke point for portfolio-wide authorization. V1: role-based (owner/admin). Future multi-family: extend this function only, not individual policies.';

-- profiles: a user can see and update only their own profile row.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());
-- No insert/delete policy for clients: profile rows are created server-side
-- (Edge Function, on signup) using service_role.

-- owners: readable/writable by authorized portfolio users.
create policy owners_select on public.owners
  for select using (public.is_portfolio_authorized());
create policy owners_insert on public.owners
  for insert with check (public.is_portfolio_authorized());
create policy owners_update on public.owners
  for update using (public.is_portfolio_authorized());
-- No delete policy: SRS §42 prefers archive/inactive over hard delete.

-- properties: readable/writable by authorized portfolio users.
create policy properties_select on public.properties
  for select using (public.is_portfolio_authorized());
create policy properties_insert on public.properties
  for insert with check (public.is_portfolio_authorized());
create policy properties_update on public.properties
  for update using (public.is_portfolio_authorized());
-- No delete policy: use `active = false` (soft delete) per SRS §42.

-- property_ownership: same authorization scope.
create policy ownership_select on public.property_ownership
  for select using (public.is_portfolio_authorized());
create policy ownership_insert on public.property_ownership
  for insert with check (public.is_portfolio_authorized());
create policy ownership_update on public.property_ownership
  for update using (public.is_portfolio_authorized());
-- No delete: close a stake via effective_to, do not delete the history.

-- property_valuations: same authorization scope. Insert-only in practice
-- (no update/delete policy) - valuation history must never be edited or
-- removed once recorded (SRS §11, Master Prompt §6).
create policy valuations_select on public.property_valuations
  for select using (public.is_portfolio_authorized());
create policy valuations_insert on public.property_valuations
  for insert with check (public.is_portfolio_authorized());

-- configuration: readable by any authorized user, writable only by owner/admin
-- (same role set today, but kept as an explicit separate check so tightening
-- this later, e.g. to 'owner' only, doesn't require touching other tables).
create policy configuration_select on public.configuration
  for select using (public.is_portfolio_authorized());
create policy configuration_update on public.configuration
  for update using (public.is_portfolio_authorized());

-- audit_log: readable by authorized users, insert-only, no client update/delete.
create policy audit_log_select on public.audit_log
  for select using (public.is_portfolio_authorized());
create policy audit_log_insert on public.audit_log
  for insert with check (public.is_portfolio_authorized());
-- usernames table intentionally has ZERO policies (see 0003_usernames.sql).

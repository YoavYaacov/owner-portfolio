# ADRs — Phase 3 (Real Dashboard Content)

These extend ADR-011 through ADR-020 (Phase 0-2). No prior ADR is superseded.

## ADR-021 — Phase 3 decomposition

**Decision.** Phase 3 is built and verified as three internally-ordered
slices, each with its own exit criterion, rather than one undifferentiated
change (Master Prompt §17 — incremental, defined steps):

- **3a — Database foundation.** Migrations `0011`-`0015`: `transaction_categories`,
  `loans`, `transactions`, `fx_rates`, plus RLS and audit-log triggers for
  the mutable ones. Exit criterion: schema applies cleanly and RLS follows
  the existing `is_portfolio_authorized()` choke point (0010_rls_policies.sql) —
  no new authorization concept introduced.
- **3b — Financial calculation engine.** `src/lib/finance/**`: pure,
  framework-free functions for FX conversion, NOI, Cash Flow After Debt
  Service, Cap Rate, LTV, portfolio aggregation, and the rules-based
  attention engine. Exit criterion: full Vitest coverage of the "insufficient
  data" paths, not just the happy path (SRS §55).
- **3c — Dashboard UI + minimal data entry.** Real `DashboardPage`, plus
  `Properties`/`Add Property`/`Add Loan`/`Add Transaction` screens — the last
  three were added to Phase 3's scope out of hard necessity, not scope creep;
  see ADR-026.

**Explicitly deferred out of Phase 3** (each needs its own schema + its own
phase later, following this same process): Leases, Insurance, Maintenance,
Urban Renewal, Development/Construction, Documents. `transactions.lease_id`
and `transaction_categories`/`transactions`/`property_valuations.document_id`
already carry forward-compatible nullable columns for these (same pattern as
`property_valuations.document_id` from Phase 1), so their eventual phases add
a table + an FK constraint, not a redesign.

## ADR-022 — Financial calculations live in TypeScript, not SQL views

**Decision.** SRS §48 recommends reporting views (`portfolio_summary`,
`property_financial_summary`, etc.). Phase 3 does **not** build them yet.
Instead, `src/lib/finance/**` fetches raw rows via the existing RLS-protected
tables and computes NOI/Cash Flow/Cap Rate/LTV/attention client-side, as
pure functions with no Supabase calls inside them.

**Why.** At family-portfolio scale (not enterprise), the data volume never
threatens client-side aggregation performance, and pure TypeScript functions
are directly unit-testable with Vitest — a SQL view would need a live
Postgres instance and integration-style tests to verify the same logic
(SRS §55 requires unit tests specifically for NOI/Cash Flow/Cap Rate/LTV).
Master Prompt §13 requires **one** central definition, never duplicated per
component — `src/lib/finance/**` is that one place; every page imports from
it rather than recomputing anything inline.

**Not rejected, deferred:** if/when query performance ever becomes a real
problem (more properties, longer history), SQL views are the documented
next step — they would wrap the same logic, not replace it, so this decision
does not need reversing, only extending.

## ADR-023 — Missing/unreliable data never becomes 0 or a silent guess

**Decision.** Every function in `src/lib/finance/**` returns
`{ ok: true, value }` or `{ ok: false, reason, missing }` — there is no
third path that quietly substitutes 0, `null` treated as zero, or a stale
estimate. Concretely:

- `computeCapRate`/`computeLTV` refuse to divide by a missing or zero
  property value (SRS §38 — "לא ניתן לחשב", never `0`).
- `computeCashFlowAfterDebtService` reads debt service from actual
  `is_financing` transactions in the period, **not** from `loans.monthly_payment`
  — a contractual figure can go stale or be mid-renegotiation. If active
  loans exist but no financing transactions were recorded for the period,
  the result is "insufficient data", not a guess from the loan's stated
  terms. `monthly_payment` is still captured and shown in the loan's own
  detail, always labeled as an estimate, never fed into a calculation.
- Portfolio-level totals (`aggregatePortfolio`) use a **partial-total**
  shape rather than an all-or-nothing block: a total sums every property
  that had complete, convertible data, and separately lists (by name) every
  property it had to exclude and why. This was a deliberate choice over
  either extreme — refusing to show any portfolio total because one of five
  properties lacks a valuation would be less useful than showing "₪X (לא כולל
  1 נכס)", as long as the exclusion is always visible next to the number,
  never hidden in a tooltip.
- `equity` (value − debt) is the one figure that IS all-or-nothing: it is
  only shown when **both** total value and total debt are fully known for
  every active property — a partial equity figure is too easy to
  misread as final.

## ADR-024 — Multi-currency portfolio aggregation (FX)

**Decision.** A new `fx_rates` table (`rate_date`, `from_currency`,
`to_currency`, `rate`, `source`) is manually populated by the user in V1;
`src/lib/finance/fx.ts` looks up the latest known rate on or before the
amount's own date (never a future rate) for the requested pair, falling back
to the inverse pair if that direction is what was recorded. ILS and USD
amounts are never summed directly anywhere in the codebase — every
portfolio-level total goes through `convertAmount`/`aggregatePortfolio.`
When no usable rate exists, the affected property is excluded from the
total and named (ADR-023), never silently converted at rate `1`.

**Why manual, not automated.** The portfolio genuinely holds both ILS and
US properties now (confirmed 2026-09-06), so this is not a
theoretical concern. An automated daily-rate fetch (e.g. a scheduled Edge
Function against a public FX API) is a natural next step, but it is a
second, independent piece of work (a new scheduled job, a new external
dependency, error handling for that job failing silently) — building it
now, before the manual version has even been used, would be exactly the
kind of "sophistication without proven benefit" the Anti-Complexity Rule
(Master Prompt §27) warns against. Logged as a Deferred Feature.

## ADR-025 — Attention/alerts: which rules ship in Phase 3, and why the rest wait

**Decision.** `src/lib/finance/attention.ts` computes each active property's
attention status **live, on every dashboard load**, from three rules:

1. `missing_critical_data` — no current market value at all.
2. `loan_maturity` — an active loan matures within `loan_alert_days` (config-driven,
   already seeded in `0008_configuration.sql`), or has already passed
   maturity while still marked active.
3. `unusual_expense` — a recent operating-expense transaction exceeds the
   trailing-12-month average for its own category by `anomaly_multiplier`,
   and exceeds `minimum_anomaly_amount` (SRS §31) — compared only within the
   same currency, to avoid folding an FX assumption into a data-quality
   check.

Every reason is a named, explained rule — never an unexplained score
(Master Prompt §15).

**Not built yet, and why:** `lease_expiration`, `insurance_expiration`,
`overdue_milestone`, `low_reserve` (SRS §29) have no data source in the
schema yet — Leases, Insurance, Urban Renewal/Development, and
`reserve_snapshots` are all still-deferred domains (ADR-021). Building their
alert *rule* before their underlying table exists would be dead code.

**No persisted `alerts` table yet.** SRS §28 models Alerts as a persisted
entity with an acknowledge/resolve lifecycle. Phase 3 does not build that —
attention status is recomputed on the fly from live data every time the
dashboard loads, which is honest (it can never show a stale, previously-
acknowledged alert for a problem that no longer exists) and cheap at this
data volume. The persisted `alerts` table, with real ack/resolve UI, is
deferred until there are enough alert *sources* (once Leases/Insurance/Urban
Renewal exist) that a dismissible, stateful list actually earns its
complexity over live computation.

## ADR-026 — Properties/Loans/Transactions data entry added to Phase 3's scope

**Decision (per user confirmation, 2026-09-06).** The live database has
zero rows in any table beyond `profiles`/`usernames`/`owners`/`configuration`
— Phase 1 only created schema, Phase 2 was auth-only. Master Prompt §6
forbids fabricating demo data in Production, so there was no way to
demonstrate real Dashboard content without also building *some* way to
enter real properties, loans, and transactions. This was raised explicitly
before building (not discovered after), and the chosen answer was: **basic,
un-polished forms shipped as part of Phase 3** — `AddPropertyPage`,
`AddLoanPage`, `AddTransactionPage`, and a minimal `PropertiesPage` list.

**What this explicitly is not.** These are not the full data-entry UX SRS
§36 eventually wants (no autocomplete, no smart defaults beyond
currency-follows-country, no inline document upload) — the SRS §36
requirements are a Deferred Feature for a later, dedicated data-entry
polish pass, not abandoned. Owners/`property_ownership` CRUD is **not**
included — the Dashboard's totals (value/debt/NOI/cash flow) do not require
per-owner ownership splits, only Equity as a portfolio-wide figure, so this
was deferred without blocking Phase 3's own goal.

**Property value updates and history.** Saving a property with an initial
value, or later updating one's `current_market_value`, always also inserts
a `property_valuations` row (`valuation_type='owner_estimate'`) — SRS §11's
append-only valuation history starts from day one without needing its own
separate screen yet.

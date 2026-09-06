# MASTER PROJECT DOCUMENT — v1.4
Owner Real Estate Portfolio Intelligence System

## Current Phase
**Phase 1 — COMPLETED** (Supabase Foundation)
**Phase 2 — COMPLETED** (Authentication + Application Shell)
**Phase 3 — DELIVERED, NOT YET APPLIED/TESTED** (Real Dashboard content) ← Next: apply + field-test

Phase 3 was built in a session with **read-only** access to the real,
public GitHub repo (cloned directly — see Known Issues #2) but still no
write access to it and no access to the real Supabase project (its
Supabase MCP connection resolves to an unrelated project, `tourism-dashboard`
— confirmed and left untouched this session). Everything below was verified
locally against the actual current codebase (not a guess at its structure):
`npm run typecheck`, `npx vite build`, and `npm test` all pass (45/45 tests,
30 of them new). It has **not** been applied to the live Supabase project or
tested end-to-end yet — that is the explicit next step, per the same
handoff pattern Phase 2 used.

## Phase 3 Deliverables (this session)

**Database — 5 new migrations (`supabase/migrations/0011-0015`)**
- `transaction_categories` — data-driven (SRS §14), seeded with all 20
  categories from the SRS, `category_group` drives NOI/CapEx/Financing
  classification.
- `loans` — financing terms + last-known balance with a mandatory
  `balance_as_of` date (SRS §16).
- `transactions` — the central fact table (SRS §13). A trigger derives
  `is_income`/`is_operating_expense`/`is_capex`/`is_financing` from the
  chosen category — these flags can never be set inconsistently with the
  category (ADR-013's forerunner formalized as a DB-level guarantee).
- `fx_rates` — explicit currency-conversion table (SRS §39); ILS and USD
  are never summed directly anywhere in the app.
- RLS for all four (same `is_portfolio_authorized()` choke point as
  Phase 1 — no new authorization concept), plus a generic `log_audit_change()`
  trigger wired to `transactions`/`loans` create/update/delete into the
  existing `audit_log` table (SRS §41).

**Financial calculation engine — `src/lib/finance/**`**
- Pure, framework-free TypeScript: FX conversion, NOI, Cash Flow After
  Debt Service, Cap Rate, LTV, portfolio-wide aggregation, and a rules-based
  property attention engine.
- Every function returns either a real value or an explicit
  "insufficient data" result with a human reason — never a silent `0` or a
  guess (ADR-023; Master Prompt §6).
- 30 new Vitest unit tests (`src/tests/finance/*.test.ts`) — including
  tests that specifically assert the *insufficient-data* paths, not just
  successful calculations.

**Data-access layer — `src/lib/dataApi/**`**
Typed Supabase query wrappers for properties/loans/transactions/transaction
categories/fx rates/configuration, each with a human Hebrew error message
on failure (Master Prompt §23) and no raw error ever reaching the UI.

**Dashboard + minimal data entry — `src/pages/**`, `src/hooks/usePortfolioData.tsx`**
- Real `DashboardPage`: מצב כללי (7 stat cards with tooltips explaining
  every financial term), דורש תשומת לב (live rules-based attention list),
  נכסים (table with per-property value + status). Empty/loading/error
  states throughout (SRS §45/§46).
- `PropertiesPage` (list) + `AddPropertyPage`, `AddLoanPage`,
  `AddTransactionPage`, `AddFxRatePage` — minimal forms, added to Phase 3's
  scope out of necessity (the database had zero rows in any table beyond
  auth-related ones; there was no way to show real numbers without some way
  to enter them — see ADR-026).
- New top nav in `AppShell` (Dashboard / נכסים).

**Docs**
- `docs/adr/ADR-021-026-phase3.md` — six new ADRs (phase decomposition,
  calc-engine architecture, missing-data handling, FX approach,
  attention/alerts scope, data-entry scope decision).
- `docs/PHASE_3_APPLY_GUIDE.md` — apply guide with the exact file diff
  (5 modified, ~26 new files), migration order, FX-rate seeding step, and a
  field-test checklist specific to real financial data.

## Decisions Made This Session
- **ADR-021**: Phase 3 split into 3a (schema) / 3b (calc engine) / 3c
  (dashboard + data entry), each with its own exit criterion. Leases,
  Insurance, Maintenance, Urban Renewal, Development, Documents explicitly
  deferred to their own future phases.
- **ADR-022**: Financial calculations live in TypeScript
  (`src/lib/finance/**`), not SQL views — chosen for direct unit-testability
  at family-portfolio data volume; SQL views remain a documented option if
  performance ever demands it.
- **ADR-023**: No calculation ever returns 0/a guess for missing data;
  Cash Flow After Debt Service is computed from actual financing
  transactions, never from `loans.monthly_payment`; portfolio totals use a
  partial-total shape (sum what's known + name what's excluded), except
  Equity, which is all-or-nothing.
- **ADR-024**: New `fx_rates` table, manual entry via a real screen
  (`AddFxRatePage`) — not SQL — because the portfolio confirmed to hold both
  ILS and USD properties now. Automated FX-rate fetching is a Deferred
  Feature.
- **ADR-025**: Attention status is computed live on every dashboard load
  from three rules (missing valuation, loan maturity, unusual expense); no
  persisted `alerts` table yet — deferred until more alert sources
  (Leases/Insurance/Urban Renewal) exist and a stateful ack/resolve list
  earns its complexity over live computation.
- **ADR-026** (per user confirmation, 2026-09-06): basic/minimal Properties,
  Loans, Transactions, and FX-rate data-entry forms added to Phase 3's scope
  — a hard prerequisite for showing real numbers, not scope creep. Full
  SRS §36 data-entry polish (autocomplete, smart defaults, etc.) and
  Owners/`property_ownership` CRUD remain deferred.

No prior ADR (ADR-011 through ADR-020) is superseded.

## Verified (Tested)
Locally, against the actual current repo (cloned read-only this session):
- `npm run typecheck` — clean
- `npx vite build` — succeeds
- `npm test` (Vitest) — **45/45 passing** (15 carried over from Phase 2 +
  30 new financial-engine tests), including explicit tests for every
  "insufficient data" branch (missing FX rate, missing property value,
  active loan with no recorded financing transactions, property with no
  valuation, unusual-expense detection, mixed-currency portfolio exclusion)
- No stray `tsc -b` build output files (re-confirmed Known Issue #6 from
  Phase 2 stays fixed)

## NOT Yet Tested
- Everything in this phase against the **real, live** Supabase project and
  the real GitHub Pages deployment — this is explicitly the next step
  (`docs/PHASE_3_APPLY_GUIDE.md` §5), not assumed done.
- RLS on the four new tables against real authenticated requests (only
  `profiles_select_own` has been live-tested so far, per Phase 2's Known
  Issues; Phase 3 is the first phase where this actually matters, since
  there is now real financial data to protect).
- Mobile/responsive check of the new Dashboard and forms (Master Prompt
  §4/§44) — carried forward from Phase 2, still not done.
- The FX-rate lookup/exclusion behavior against genuinely two-currency real
  data (unit-tested with synthetic data; not yet exercised with the user's
  actual USD property).

## Known Issues / Technical Debt
1. ~~This session has no access to the user's real Supabase project or
   GitHub repo~~ — **partially resolved this session**: the GitHub repo is
   public, so this session cloned it read-only and built Phase 3 directly
   against the real current code (no more blind-guessing file structure).
   Still true: no *write* access to the repo, and no access to the real
   Supabase project (its connected Supabase MCP resolves to an unrelated
   project, `tourism-dashboard` — confirmed, not touched). The
   apply-and-report-back loop from Phase 2 continues for the database side.
2. No `alerts` table yet / no ack-resolve UI — attention status is
   recomputed live on every load (ADR-025, deliberate, not an oversight).
3. No Property detail page (SRS §34 tabs) yet — Dashboard and the
   Properties list are the only ways to see property data. Editing an
   existing property's fields beyond its market value has no UI yet either
   (only `updatePropertyValue` exists in the data layer).
4. No Owners/`property_ownership` UI — schema and RLS exist since Phase 1,
   no screen uses them yet (ADR-026 — not required for Phase 3's dashboard
   totals).
5. `src/types/finance.ts` and `src/types/auth.ts` are both hand-written,
   not generated — same deferred item as Phase 2, growing slightly with
   Phase 3's new tables.
6. `AddTransactionPage`/`AddLoanPage`/`AddPropertyPage` are intentionally
   minimal (ADR-026) — no autocomplete, no duplicate-transaction detection,
   no smart defaults beyond currency-follows-country. Full SRS §36 polish
   is deferred.
7. The unusual-expense rule (`attention.ts`) compares amounts only within
   the same currency and needs at least 3 historical data points in the
   trailing 12 months before it will flag anything — by design (avoids
   false positives on a brand-new category), but means it will stay silent
   for every category until enough real history accumulates.

## Deferred Features (explicit, not forgotten)
- Leases, Insurance, Maintenance, Urban Renewal/Pinui-Binui, Development/
  Construction, Documents — each is its own future phase with its own
  schema, following this same process (ADR-021).
- Persisted `alerts` entity with acknowledge/resolve lifecycle (SRS §28) —
  deferred until the above domains give it enough real alert sources to be
  worth the added complexity over live computation (ADR-025).
- `reserve_snapshots` table and the `low_reserve` alert type — no reserve
  data source yet (needs a management-company-fed process); the
  `low_reserve_threshold` config key already exists (seeded in Phase 1)
  waiting for it.
- SQL reporting views (`portfolio_summary`, `property_financial_summary`,
  etc. — SRS §48) — deferred until client-side aggregation actually shows a
  performance problem (ADR-022).
- Automated daily FX-rate fetching (e.g. scheduled Edge Function against a
  public FX API) — V1 is manual entry via `AddFxRatePage` (ADR-024).
- Full SRS §36 data-entry UX polish (autocomplete, smart defaults,
  duplicate-transaction detection) across the new forms (ADR-026).
- Owners/`property_ownership` management UI — schema/RLS already exist
  since Phase 1.
- Property detail page with SRS §34's tabs (סקירה/פיננסים/שכירות/מימון/...).
- Generated TypeScript types from the live schema (carried over from Phase 2).
- Custom SMTP provider for Supabase Auth emails (carried over from Phase 2).
- Admin-only "invite family member" Edge Function (carried over from
  Phase 2, ADR-017).

## Database Status
14 tables total. Unchanged from Phase 1 (8): `profiles`, `usernames`,
`owners`, `properties`, `property_ownership`, `property_valuations`,
`configuration`, `audit_log`. New in Phase 3 (5): `transaction_categories`,
`loans`, `transactions`, `fx_rates`, plus the RLS/audit migration
(`0015_rls_policies_phase3.sql`, not a table itself). RLS is written and
locally reasoned about for all 5 new objects using the existing
`is_portfolio_authorized()` function — **not yet confirmed live** against
the real project (apply guide §1 includes a quick post-apply check).

## Security Status
- Same `is_portfolio_authorized()` choke point as Phase 1/2 — no new
  authorization concept introduced for the new tables.
- `transactions`/`loans` mutations (create/update/delete) are written to
  the existing `audit_log` via a new generic `log_audit_change()` trigger
  (`security definer`, always uses `auth.uid()` server-side — never a
  client-supplied actor).
- `transactions.is_income`/`is_operating_expense`/`is_capex`/`is_financing`
  cannot be set directly by any client — a DB trigger derives them from the
  category, closing off an entire class of "financial figures disagree with
  their own category" bugs at the database level, not just in the UI.
- No secrets introduced; the new tables and Edge-Function-free UI add no
  new secret surface.

## UX Status
- Real Dashboard content per Master Prompt §20 (מצב כללי / תשומת לב /
  נכסים), replacing Phase 2's placeholder screen.
- Every financial term shown (שווי, חוב, הון עצמי, NOI, תזרים, Cap Rate/LTV
  where used) has a `Tooltip` with a plain-Hebrew explanation — Master
  Prompt §3/§19, SRS §35 — keyboard-accessible, not hover-only.
- Status is always icon + label + color together (`AttentionBadge`),
  never color alone (Master Prompt §5/§25).
- Empty states with a clear next action exist for: no properties yet, no
  properties for a form that needs one, no attention items. Loading and
  error states exist on every new screen (SRS §45/§46).
- New forms follow §19/§36: labels, required markers, helper text, human
  error messages, currency/date pickers, select-not-free-text for
  enum-like fields, double-submit prevention (disabled submit button while
  saving), save feedback.
- Still not done: full mobile/responsive pass (carried over from Phase 2).

## Test Status
- Unit: 45/45 passing — 15 carried over (validation + route-guard) + 30 new
  (`src/tests/finance/**`) covering NOI, Cash Flow After Debt Service, Cap
  Rate, LTV, FX conversion, the attention rules engine, and portfolio
  aggregation, with explicit coverage of every "insufficient data" branch
  (SRS §55's requirement for NOI/Cash Flow/Cap Rate/LTV unit tests is now
  met).
- Integration/E2E against the real, live project: **not yet run** for
  Phase 3 — this is the explicit next step (apply guide §5's checklist).
- RLS: written and internally consistent with the existing
  `is_portfolio_authorized()` pattern; not yet confirmed against real
  authenticated requests (see NOT Yet Tested).

## Deployment Status
Unchanged infrastructure: the existing GitHub Actions workflow
(`.github/workflows/deploy.yml`) requires no changes for Phase 3 — pushing
the new/changed files will typecheck, test, build, and deploy exactly as it
already does. Not yet actually run against Phase 3's code on the real
repo/Pages site.

## Next Recommended Step
1. Apply Phase 3 per `docs/PHASE_3_APPLY_GUIDE.md`: run the 5 migrations,
   add the frontend/backend files to the repo, push, and confirm the
   GitHub Actions deploy succeeds.
2. Add at least one real property, one FX rate (portfolio has both ILS and
   USD), a few real transactions, and (if applicable) a loan — then work
   through the apply guide's checklist end-to-end against the live site,
   the same way Phase 2's SRS §22 checklist was worked through live.
3. Report back what actually happened (pass/fail per checklist item, any
   real-world issues hit) — expect the same kind of field-testing loop
   Phase 2 went through (real deployment/configuration issues are normal
   and get fixed here, not assumed away).
4. Once Phase 3 is confirmed working live, the next phase (per SRS §43's
   route list and the deferred items above) should again start with:
   confirm scope, propose ADRs if needed, then build — most likely either
   **Leases** (closes the SRS §33 "נכסים" tenancy story and adds the first
   deferred alert type, `lease_expiration`) or a **Property detail page**
   (SRS §34) to give the new financial data somewhere deeper to live than
   the Dashboard and the properties list.

## Change Log
**Session 1 (Phase 0)** — Read all 3 source docs. Architecture summary,
entity unification, ERD-level relationships, ADR-011 through ADR-014.

**Session 2 (Phase 1)** — Wrote 10 migrations + RLS. User set up local
environment (Git, Node.js, Supabase CLI as dev dependency), created private
GitHub repo, created Supabase project, ran all migrations via SQL Editor.
Verified all 8 tables exist and RLS is enabled on each. Phase 1 exit
criteria met: database is deployable and RLS is confirmed active. Some
migrations-in-repo debt carried forward (see Known Issues). Next: Phase 2.

**Session 3 (Phase 2)** — Built full Phase 2 deliverable (frontend app
shell, auth Edge Functions, migrations reorganized into version control,
CI/CD workflow, ADRs 015-020) in an isolated session with no access to the
user's real Supabase project or GitHub repo; verified everything verifiable
locally and packaged it with a full apply guide. User applied it to the
real project and worked through the full SRS §22 critical-flow checklist
live, hitting and fixing several real-world deployment/configuration issues
along the way (CORS/"Verify JWT", GitHub Pages repo-visibility, Site URL
redirect config, email rate limits, a missing hidden-dotfile upload, and
more — all logged in v1.3). Confirmed **"הכל עובד כראוי"** end-to-end
against the real, live, publicly-hosted site, including the
password-recovery-link flow (ADR-018's highest-risk item). Phase 2 marked
COMPLETED. `docs/MASTER_PROJECT_DOCUMENT_v1.3.md` prepared as a
self-contained handoff package. Next: Phase 3.

**Session 4 (Phase 3)** — Began by reading the attached Master Prompt, SRS
v3.0, and Master Project Document v1.3, and confirming Phase 3's scope with
the user (SRS §33, Master Prompt §20). Identified upfront that the live
database has zero rows in any table beyond auth-related ones, and that
Master Prompt §6 (never fabricate demo data) meant real dashboard content
was impossible without also building minimal data entry — raised as an
explicit question before building (ADR-026), along with confirming the
portfolio genuinely holds both ILS and USD properties (relevant to
ADR-024's FX design). Checked this session's Supabase MCP connection and
found it resolves to an unrelated project (`tourism-dashboard`) — confirmed
and left untouched; then cloned the real, public GitHub repo read-only to
build directly against the actual current codebase instead of guessing its
structure (an improvement over Phase 2's fully-blind build). Delivered:
5 new migrations (`transaction_categories`, `loans`, `transactions`,
`fx_rates`, RLS+audit), a pure/tested TypeScript financial calculation
engine (`src/lib/finance/**`, 30 new unit tests, all passing) with an
explicit "insufficient data, never a guess" contract (ADR-023), a typed
Supabase data-access layer, a real Dashboard replacing Phase 2's
placeholder, and minimal Properties/Loans/Transactions/FX-rate entry forms.
`npm run typecheck` / `npx vite build` / `npm test` (45/45) all verified
locally against the real cloned repo. Six new ADRs (021-026) and a
Phase 3 apply guide with the exact file diff were written. Phase 3 is
**DELIVERED, NOT YET APPLIED/TESTED** against the live system — that is
explicitly the next step, not assumed done. This document (v1.4) prepared
as the handoff package alongside the ADRs and apply guide.

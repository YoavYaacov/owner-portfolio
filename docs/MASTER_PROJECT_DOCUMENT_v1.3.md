# MASTER PROJECT DOCUMENT — v1.3
Owner Real Estate Portfolio Intelligence System

## Current Phase
**Phase 1 — COMPLETED** (Supabase Foundation)
**Phase 2 — DELIVERED, NOT YET APPLIED/TESTED** (Authentication + Application Shell)
**Phase 3 — NOT STARTED** (Real Dashboard content) ← Next after Phase 2 is applied & verified

Phase 2 is described as "delivered, not yet applied/tested" rather than
"completed" deliberately (Master Prompt §29 — never say something works
without checking): this session has no access to the user's actual
Supabase project or GitHub repository (see Known Issues), so everything
below was verified as far as this session could — type-checking, build,
unit tests, Deno lint/check on the Edge Functions — but NOT verified
end-to-end against the real, running system. Phase 2 becomes COMPLETED
only after the user applies it (docs/PHASE_2_APPLY_GUIDE.md) and confirms
the checklist in that guide passes.

## Phase 2 Deliverables (this session)

**Frontend — React + TypeScript + Vite, HashRouter**
- App shell: `src/App.tsx`, route map per ADR-018
- Auth context/hook (`src/hooks/useAuth.tsx`) — single subscription to
  Supabase's `onAuthStateChange`, exposes session/profile/phase/
  recoveryPending to the whole tree (ADR-019)
- `ProtectedRoute`, `PublicOnlyRoute`, `RootRedirect` — pure-function route
  guards (`src/lib/routeGuard.ts`) driving the actual components, unit
  tested
- Pages: Login, Forgot Password, Reset Password, placeholder Dashboard
- Shared `FormField` component; validation helpers
  (`src/lib/validation.ts`) — unit tested
- `ConfigurationError` screen for missing env vars (fails loudly, not a
  blank page)
- Global RTL/Hebrew CSS with the Master Prompt §5 status-color language
  (good/attention/critical/neutral/info)
- `.env.example` (no real secrets)

**Backend — Supabase Edge Functions (Deno)**
- `login-with-username` — implements ADR-011/ADR-015: resolves username →
  email server-side using the service role, then performs the real
  sign-in with the anon key; returns only session tokens, never the email;
  identical generic error for "unknown username" and "wrong password"
- `request-password-reset` — implements ADR-016: same
  resolve-then-anon-call pattern for `resetPasswordForEmail`; always
  returns the same generic success message regardless of outcome
- Both verified with `deno check` (type-check) and `deno lint` — clean

**Database**
- The 10 Phase 1 migrations copied into `supabase/migrations/` with
  proper `<timestamp>_<name>.sql` naming — **closes Known Issue #1** from
  v1.2 (migrations were previously not in version control)
- `scripts/bootstrap_first_user.sql` — the manual first-user creation path
  (ADR-017)

**CI/CD**
- `.github/workflows/deploy.yml` — install → typecheck → test → build →
  deploy to GitHub Pages via `actions/deploy-pages`; fails the build on
  any TypeScript error or failing test (SRS §51)

**Docs**
- `docs/adr/ADR-015-020-phase2.md` — six new ADRs (login flow, password
  reset flow, no-signup-in-V1, route map, session handling, Edge Function
  CORS)
- `docs/PHASE_2_APPLY_GUIDE.md` — full manual apply/deploy walkthrough +
  testing checklist, written for Dashboard/GitHub-web-UI workflow (no CLI
  required, though CLI alternatives are noted)

## Decisions Made This Session
- **ADR-015**: username-login Edge Function resolves username→email
  server-side (service role) then signs in with the anon key; email never
  reaches the client.
- **ADR-016**: password-reset request follows the same pattern; always
  returns a generic message (anti-enumeration).
- **ADR-017** (per explicit user choice, 2026-09-05): **no self-service
  signup UI in V1.** New users (including the first owner) are created via
  Supabase Dashboard + `scripts/bootstrap_first_user.sql`. An admin-invite
  Edge Function is a **deferred feature**, not built now.
- **ADR-018**: HashRouter route map for Phase 2, and — importantly — how
  the password-recovery link is detected via the `PASSWORD_RECOVERY` auth
  event (`recoveryPending` in context) rather than via URL-path matching,
  because Supabase's recovery tokens and the app's HashRouter routes share
  the same URL fragment. This is the trickiest correctness point in Phase
  2 and is *not yet verified against a real email link* — see Known
  Issues.
- **ADR-019**: session handling relies entirely on supabase-js's built-in
  `autoRefreshToken`/`persistSession`; one Context subscription for the
  whole app; no custom refresh logic.
- **ADR-020**: Edge Function CORS restricted to an explicit `ALLOWED_ORIGIN`
  env var, never `*`.

No prior ADR (ADR-011 through ADR-014) is superseded — Phase 2 only adds
implementation detail to what ADR-011 already promised.

## Verified (Tested, this session)
- `npm run typecheck` — clean (no TypeScript errors)
- `npx vite build` — succeeds, produces `dist/`
- `npm test` (Vitest) — 15/15 passing, covering username/password
  validation and route-guard redirect decisions
- `deno check` + `deno lint` on both Edge Functions — clean

## NOT Yet Tested (requires the user's real project — see Apply Guide §7)
- Actual login against a real Supabase Auth user (end-to-end)
- The password-reset email round-trip, and specifically the
  recovery-link → `/reset-password` landing under HashRouter (ADR-018) —
  this is the single highest-risk unverified piece of Phase 2 and should
  be the first thing tested
- RLS behavior with a real authenticated user hitting `profiles_select_own`
  etc. (SRS §49 — this was already partly deferred from Phase 1 for the
  same reason: no real auth users existed yet)
- GitHub Actions deploy end-to-end (secrets configured, Pages source set to
  "GitHub Actions")
- Edge Function CORS against the real deployed origin
- Mobile/responsive check of the auth screens (Master Prompt §4/§44)

## Known Issues / Technical Debt
1. ~~Migrations not yet committed to the repo~~ — **RESOLVED this session**:
   `supabase/migrations/` now contains all 10 files with proper naming,
   ready to upload.
2. This session has no access to the user's real Supabase project (the
   Supabase MCP connection available here points at an unrelated project,
   `tourism-dashboard`) or their private GitHub repo. Everything above was
   built and verified locally in an isolated environment and handed off as
   a package + apply guide, per the user's explicit choice this session.
   Consequence: Phase 2 cannot be marked COMPLETED until the user applies
   it and works through `docs/PHASE_2_APPLY_GUIDE.md` §7.
3. The password-recovery flow's interaction with HashRouter (ADR-018) is
   architecturally sound and reasoned through carefully, but has real
   platform-specific risk (exactly how Supabase's hosted GoTrue appends
   recovery tokens to a redirect URL that already has a `#` route). It is
   designed to degrade gracefully either way, but must be tested against a
   real email before Phase 2 is called done.
4. ~~`_shared/cors.ts` cannot be imported when deploying via the Supabase
   Dashboard's function editor~~ — **RESOLVED** (found by the user hitting
   exactly this "Module not found" error while deploying): both Edge
   Functions now inline the CORS helper directly instead of importing a
   shared file, so a straight copy-paste of `index.ts` works identically
   in the Dashboard editor and via the CLI. The shared file was removed.
   (Small fix made at the same time: the inlined version also now
   correctly fails closed — it only echoes back `ALLOWED_ORIGIN` when the
   request's own `Origin` header matches it, rather than always returning
   it regardless of origin, which the original had as dead logic.)
5. `src/types/auth.ts`'s `Profile` type is hand-written, not generated.
   Deferred: wire up `supabase gen types typescript` once the schema is
   less actively changing.
6. ~~`tsconfig.node.json` (composite, no `noEmit`) caused `tsc -b` — run by
   both `npm run typecheck` and `npm run build` — to write compiled
   `vite.config.js` / `vite.config.d.ts` into the project root next to
   `vite.config.ts`~~ — **RESOLVED**: found while re-verifying the delivered
   ZIP after the user reported the file layout didn't match the apply
   guide's description. Root cause: a composite TS project without
   `noEmit` emits build output by default. Added `"noEmit": true` to
   `tsconfig.node.json` (TypeScript allows this alongside `composite` for a
   project nothing else references); confirmed the stray files no longer
   appear across a clean typecheck + build. The delivered ZIP was also
   changed to wrap everything in a single `owner-portfolio/` folder
   (previously it extracted flat), to match the apply guide's file tree
   exactly and make "unzip, then look inside `owner-portfolio/`" unambiguous.

## Deferred Features (explicit, not forgotten)
- Admin-only "invite family member" Edge Function + Settings-page UI
  (declined for V1 per ADR-017; revisit when a second real user is needed)
- Generated TypeScript types from the live schema

## Database Status
Unchanged from Phase 1: 8 tables (`profiles`, `usernames`, `owners`,
`properties`, `property_ownership`, `property_valuations`,
`configuration`, `audit_log`), RLS confirmed enabled on all 8 as verified
in v1.2. No schema changes in Phase 2 (Phase 2 is application-layer only).

## Security Status
- `usernames` table: zero RLS policies, deny-by-default, service-role-only
  — unchanged, and now actively relied upon by the two new Edge Functions.
- Both new Edge Functions run with the service role **only** server-side
  (Deno runtime, never shipped to the browser); the anon key is the only
  Supabase key in frontend code, as required (Master Prompt §10).
- Login and password-reset endpoints both return identical
  generic responses on failure/unknown-username to prevent enumeration.
- CORS locked to a single configured origin (ADR-020), not `*`.

## UX Status
- Hebrew, RTL, status-color language (Master Prompt §5) established at the
  CSS level for reuse in every future screen.
- Forms follow §19 rules: labels, required markers, human error text,
  double-submit prevention, loading states. Empty/error states exist for
  the "invalid reset link" and "missing configuration" cases.
- No Dashboard content yet by design (Master Prompt §20 — placeholder only,
  real content is Phase 3).

## Test Status
- Unit: validation + route-guard logic (15 tests, Vitest) — passing
- Integration/E2E/RLS/security tests against the real project: not yet run
  (blocked on the user applying Phase 2 — see Known Issues #2)

## Deployment Status
- GitHub Actions workflow written and included; not yet run against the
  real repo (requires repo secrets + Pages source configuration — Apply
  Guide §5)

## Next Recommended Step
1. Work through `docs/PHASE_2_APPLY_GUIDE.md` end to end.
2. Complete the testing checklist there, in particular the password-reset
   email → HashRouter landing flow (highest risk item).
3. Report back what passed/failed; fix anything broken before Phase 2 is
   marked COMPLETED.
4. Only then begin Phase 3: real Dashboard content (portfolio value, debt,
   NOI, cash flow, attention items — Master Prompt §20, SRS §33), which
   will also be the first phase touching real financial calculations and
   therefore the first with meaningful unit tests beyond validation logic.

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
user's real Supabase project or GitHub repo; verified everything
verifiable locally (typecheck, build, unit tests, Deno check/lint) and
packaged it with a full apply guide. User chose: dashboard-only user
creation (no signup UI) and zip-package delivery. Phase 2 is DELIVERED but
NOT YET APPLIED/TESTED against the real system — that is explicitly the
next step, not assumed done.

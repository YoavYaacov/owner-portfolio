# ADRs — Phase 2 (Authentication + Application Shell)

These extend ADR-011 through ADR-014 (Phase 0/1). No prior ADR is superseded;
Phase 2 only adds implementation detail for what ADR-011 already promised.

## ADR-015 — Username login flow (implements ADR-011)

**Decision.** The client never learns a user's internal email address, and the
`usernames` table is never queried with the anon key (it has zero RLS
policies — see `0003_usernames.sql`). Instead:

1. Client submits `{ username, password }` to the `login-with-username` Edge
   Function.
2. The function (using the **service role** key, server-side only) looks up
   `usernames.user_id` for the given username, then reads that user's email
   via `supabase.auth.admin.getUserById`.
3. The function then calls Supabase's password-grant token endpoint with the
   **anon** key and the resolved `{ email, password }` — this is the same
   call `supabase-js`'s `signInWithPassword` makes internally, just executed
   server-side.
4. On success, the function returns the resulting session
   (`access_token`, `refresh_token`, `expires_in`) to the client. The email is
   **never** included in the response.
5. The client calls `supabase.auth.setSession(...)` with those tokens, which
   Supabase's client SDK then keeps refreshed automatically
   (`autoRefreshToken: true`, `persistSession: true`).
6. On any failure (unknown username OR wrong password), the function returns
   the **same generic error** ("שם המשתמש או הסיסמה שגויים") with the same
   HTTP status and roughly the same timing — this prevents username
   enumeration (Master Prompt §10, IDOR/least-privilege principle).

**Why not resolve the email and sign in from the client?** That would require
either (a) exposing the email to the browser (leaks PII, and usernames become
guessable-by-email-pattern), or (b) querying `usernames` from the client
(requires an RLS policy on a table that is explicitly deny-by-default per
`0003_usernames.sql`'s own documented design). Doing the whole exchange
server-side keeps the deny-by-default table genuinely inaccessible to any key
except `service_role`.

## ADR-016 — Password reset flow

**Decision.** Same pattern as login: the client only ever provides a
**username** (consistent with the "username + password" UX promised in
Master Prompt §9 — the user should never need to remember which email they
registered with). The `request-password-reset` Edge Function resolves the
username to an email server-side and calls
`supabase.auth.resetPasswordForEmail(email, { redirectTo: <app>/#/reset-password })`.

The function **always returns a generic success message** ("אם שם המשתמש
קיים במערכת, נשלח אליו מייל לאיפוס סיסמה"), regardless of whether the
username was found — otherwise the endpoint becomes a username-enumeration
oracle.

The actual password reset (setting a new password after clicking the emailed
link) happens entirely client-side via `supabase.auth.updateUser({ password })`
once Supabase's redirect has placed a valid recovery session in the URL hash —
no Edge Function is needed for that step, since by that point the user holds
a legitimate Supabase-issued recovery token.

## ADR-017 — No self-service signup in V1

**Decision (per user confirmation, 2026-09-05).** V1 has no signup UI and no
public "create account" Edge Function at all. SRS §3 scopes V1 to
Owner/Admin only, and the Anti-Complexity Rule (Master Prompt §27) argues
against building invite/signup machinery for a single-family user base before
it's needed.

New logins (the initial owner, and any future family member) are created by:

1. Creating the `auth.users` row via the Supabase Dashboard
   (Authentication → Add User → set email + password).
2. Running the bootstrap SQL (provided in the Phase 2 apply guide) to insert
   the matching `profiles` row (`role='owner'` for the first user) and
   `usernames` row, using the new user's `auth.users.id`.

This keeps the `usernames`/`profiles` creation path entirely out of the
client's reach, matching `0003_usernames.sql`'s "service_role only" design
without needing any new server code in Phase 2. **Deferred, not rejected:**
if/when a second family member needs self-service invites, that becomes an
admin-only "invite user" Edge Function — noted in the Master Project Document
as a deferred feature, not built now.

## ADR-018 — HashRouter route map (Phase 2 slice of SRS §43)

```
/#/login              — public
/#/forgot-password    — public
/#/reset-password     — public (only meaningful with a Supabase recovery
                          token in the URL; otherwise redirects to /login)
/#/dashboard           — protected (placeholder content only in Phase 2;
                          full Dashboard per Master Prompt §20/SRS §33 is
                          Phase 3+)
/#/                    — redirects to /dashboard if authenticated, else /login
```

Unmatched routes redirect to `/dashboard` (which itself redirects to
`/login` if unauthenticated) rather than a bare 404, since GitHub Pages +
HashRouter means the server never sees the hash portion anyway.

## ADR-019 — Session handling

- `supabase-js`'s built-in `autoRefreshToken` + `persistSession` (backed by
  `localStorage`) handle token refresh and cross-tab persistence — no custom
  refresh logic is written.
- A single `AuthProvider` (React Context) subscribes once to
  `supabase.auth.onAuthStateChange` and exposes `{ session, profile, loading }`
  to the whole tree. `ProtectedRoute` reads this context; it does not make its
  own Supabase calls.
- On sign-in, the provider also fetches the caller's own `profiles` row
  (allowed by `profiles_select_own`) to get `display_name` or `role` for the
  UI — never assumes role from client state alone (server-side RLS is still
  the real gate on every table).

## ADR-020 — Edge Function CORS

Both Edge Functions restrict `Access-Control-Allow-Origin` to an explicit
allow-list read from the function's own environment variable
(`ALLOWED_ORIGIN`, set to the GitHub Pages origin, e.g.
`https://YoavYaacov.github.io`), not `*`. This is documented in the apply
guide as a required secret to set before first deploy.

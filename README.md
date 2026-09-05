# Owner Real Estate Portfolio Intelligence System

מערכת פרטית לניהול, מעקב וניתוח פורטפוליו נדל"ן משפחתי בישראל ובארה"ב.
ראה `docs/` למסמכי הרקע המלאים (Master Prompt, SRS, Master Project
Document) ולהחלטות הארכיטקטורה (ADRs).

**סטטוס נוכחי:** Phase 2 (Authentication + Application Shell) —
ראה `docs/MASTER_PROJECT_DOCUMENT_v1.3.md` לפירוט מלא, ו-
`docs/PHASE_2_APPLY_GUIDE.md` להוראות יישום.

## Stack

- Frontend: React + TypeScript + Vite, HashRouter, RTL/Hebrew-first
- Hosting: GitHub Pages (via GitHub Actions — `.github/workflows/deploy.yml`)
- Backend: Supabase (Postgres + Auth + Edge Functions)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's URL + anon key
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build to `dist/` |

## Project layout

```
src/            React app (components, pages, hooks, lib, types)
supabase/
  migrations/   SQL migrations, version-controlled (SRS §51/§53)
  functions/    Edge Functions (Deno)
scripts/        One-off operational SQL (e.g. bootstrap_first_user.sql)
docs/           ADRs, Master Project Document, apply guides
```

## Security notes

- `.env.local` is gitignored. Only `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` ever reach the frontend — both are public by
  design. The service role key lives only in Supabase's Edge Function
  environment, never in this repo or in browser code.
- See `docs/adr/` for the reasoning behind the username-login flow, the
  password-reset flow, and the RLS strategy.

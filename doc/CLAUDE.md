# {{PRODUCT_NAME}} — project guide for Claude

Read this first in every session. Keep it short. Deeper detail lives in `docs/`.

## What we are building

A social media management SaaS for startups, agencies and multi-country teams. Pay for what you use, with the lowest flat price at every capacity.

Three modules, shipped in stages:

- **Publish**: compose, schedule, publish, approve, analytics, reports. This is the first public release.
- **Engage**: unified inbox for comments, DMs and reviews, with replies. Later.
- **Operate**: Google Business Profile and app-store operations. Later.

**Differentiator:** video pre-flight checks and per-platform previews. Before a post goes out, the user sees how it will look on each platform and gets a warning if the aspect ratio, resolution, bitrate, duration or file size will cause a quality drop or a rejection. Every other feature is secondary to getting this right.

**Current phase:** Phase 0 (foundations). See `docs/PROJECTFLOW.md` for the phase map. Update this line when a phase starts.

## Stack

- Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui
- TanStack Query, react-hook-form + zod, next-intl
- Supabase: Postgres, Auth, Storage, Realtime, RLS
- Background jobs: Inngest (decision pending; Trigger.dev is the alternative)
- Media: Cloudflare R2 with presigned multipart uploads; a separate Node + FFmpeg worker (Fly.io or Railway)
- Billing: Lemon Squeezy (Stripe is not available in Pakistan)
- Email: Resend. Errors: Sentry. Product analytics: PostHog.

## Commands

Never assume a command exists; check `package.json` first.

Frontend (`frontend/my-project`, npm — see `docs/DECISIONS.md`):

```
npm install
npm run dev            # http://localhost:3000; demo login demo@example.com with any password (mock API)
npm run build
npm run lint
npm run typecheck
npm run i18n:check
npm test               # Vitest: unit tests, plus the migrations' RLS and grants on PGlite (no Docker needed)
npm run db:start       # local Supabase in Docker; prints the URL and keys for .env.local
npm run db:reset       # rebuild the local database from supabase/migrations
npm run db:stop
```

The backend runs inside this app (`app/api/v1`, `src/server/`); set the keys from `.env.example` in `.env.local`. Not set up yet: `test:e2e` (Playwright).

## Target repo layout

```
app/[locale]/(marketing)/      public site, SEO pages, blog
app/[locale]/(app)/dashboard/  signed-in product
app/api/                       route handlers (webhooks, OAuth callbacks)
src/features/<feature>/        feature code: components, hooks, server actions
src/providers/<platform>/      the only place platform-specific code lives
src/lib/                       shared helpers (billing, crypto, time, supabase)
supabase/migrations/           SQL migrations
supabase/tests/                RLS and function tests
worker/                        FFmpeg / media worker
messages/                      translation files per locale
docs/                          plan, flow, SEO, decisions
e2e/                           end-to-end tests
```

## Non-negotiable rules

1. **Tenancy.** Every tenant table has `workspace_id`, RLS enabled, and policies using `is_member()`. Every new table ships with an RLS test (`supabase/tests/database.test.ts`) that proves a non-member cannot read or write it. Clients can reach the database directly with the public anon key, so the database is the boundary: new tables start with no client grants (Supabase's defaults are revoked), the migration grants only the columns clients need, and link tables reference `(id, workspace_id)` on both sides.
2. **Secrets.** OAuth tokens and store credentials are encrypted at rest. Never log tokens, keys, or full request bodies from providers. Never commit secrets.
3. **Server-side checks.** Plan limits, seat limits, roles and approvals are enforced on the server. The UI hiding a button is not enforcement.
4. **Validation.** Every input crossing a boundary (forms, route handlers, webhooks, provider responses) is parsed with zod.
5. **Publishing goes through jobs.** One job per `post_target`, with an idempotency key, retries and backoff. A post must never publish twice and never fail silently.
6. **Platform code stays in `src/providers/<platform>`.** The rest of the app talks to the adapter interface only.
7. **i18n from day one.** No hard-coded user-facing strings. Use logical CSS properties (`ms-`, `ps-`, `start`, `end`) so RTL works.
8. **Accessibility.** WCAG 2.2 AA. Keyboard reachable, visible focus, labelled controls, sufficient contrast.
9. **Every screen has four states:** empty, loading, error, and partial (some targets worked, some did not).
10. **Blank is not zero.** If a metric is unavailable, show it as unavailable, never as `0`.
11. **No scraping.** Use official APIs only. If an API does not exist for a feature, the feature does not ship for that platform.
12. **Entitlements** come from one place (`src/lib/billing/plans.ts`, once it exists). Do not scatter plan checks.

## Conventions

- Store all timestamps as UTC `timestamptz`. In the UI, the user picks a timezone first, then a time.
- File names `kebab-case`; React components `PascalCase`; DB tables and columns `snake_case`.
- Provider errors use one of: `rate_limited`, `token_expired`, `permission_revoked`, `media_invalid`, `content_rejected`, `transient`, `unknown`, each with a `retryable` flag.
- Brand colours: lime `#DEFF00`, ink `#1D1E20`, coral `#FF4B32`. Use tokens from `docs/FRONTEND.md`, never raw hex in components. Never white text on coral (fails contrast; use ink). Coral and lime never signal errors or success.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Small PRs, one concern each.
- Tests ship with the code, not after it. The full test plan is `docs/TEST.md`; cite test IDs (for example `RLS-04`, `DBL-01`) in test names and PRs.
- Every button or action that changes data needs a double-submit test (`DBL-01`) and an idempotency key on the server. Every production bug gets a regression test.

## How to work with me

- For anything touching more than one file, state a short plan first, then do it.
- If a requirement is ambiguous, ask one focused question instead of guessing.
- Record decisions in `docs/DECISIONS.md` (date, decision, reason, alternatives).
- Keep diffs small. Run lint, typecheck and tests before saying a task is done.
- Do not add a dependency without saying why and what it replaces.
- Do not invent platform API behaviour. If you are not sure, say so and check the official docs.
- Ask before destructive actions: dropping tables, rewriting migrations that have been applied, deleting data, force-pushing.

## Product facts (hypothesis, validate with ~20 buyers before launch)

| Plan | Price / month | Accounts | Seats |
|---|---|---|---|
| Free | $0 | 3 | 1 |
| Solo | $12 | 10 | 1 |
| Pro | $24 | 25 | 3 |
| Agency | $59 | 75 | 10 |
| Scale | $119 | 200 | 25 |

- Yearly billing = 2 months free. 14-day trial, no card. Founding customers (first 100) get a 24-month price lock.
- Lemon Squeezy fee is 5% + $0.50 per sale. Confirm Pakistan payout before committing to launch date.
- Single source of truth for plans in code will be `src/lib/billing/plans.ts`.

## Where things are

- `docs/PRODUCT-PLAN.md`: full product plan (features, schema, architecture, costs, competitors)
- `docs/PROJECTFLOW.md`: phases, weekly rhythm, task template, quality gates
- `docs/FRONTEND.md`: colours and design tokens, components, routes, all user flows, screens, UI patterns
- `docs/BACKEND.md`: architecture, data model and RLS, API, publishing jobs, media, billing, security, operations
- `docs/TEST.md`: test plan: automated, end-user, security, payments, double-click, slow network, mobile
- `docs/SEO-AEO.md`: SEO, AI search, schema, programmatic pages, blog
- `docs/DECISIONS.md`: decision log
- `.claude/skills/scheduler-dev/SKILL.md`: recipes for adapters, migrations, jobs, billing, UI

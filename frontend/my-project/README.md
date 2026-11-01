# AgentiqSocial — frontend

The web app for the social media scheduler: marketing site, sign-up, onboarding, and the signed-in Publish module (composer with pre-flight checks, calendar, posts, connections, team, billing, settings). Product rules live in [`../../doc/CLAUDE.md`](../../doc/CLAUDE.md); the design system and flows in [`../../doc/FRONTEND.md`](../../doc/FRONTEND.md).

The product is **AgentiqSocial** (agentiqsocial.com). The name and domain are set in one place: `src/config/site.ts`.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000, development mode (below)
npm run build && npm start   # production mode
npm run lint
npm run typecheck
npm run i18n:check     # every locale has every key, same placeholders, valid ICU
npm test               # unit tests, plus the migrations' RLS on PGlite
npm run check:api      # end-to-end backend checks against the running dev server (below)
```

Requires Node 20.9+. This is **Next.js 16** with Cache Components on: read `node_modules/next/dist/docs/` before changing routing, caching or the proxy (see `AGENTS.md`). Copy `.env.example` to `.env.local` and fill in the Supabase keys first.

### Development and production mode

Both modes use the **real backend and database** (Supabase). The only difference is how sign-up and password-reset codes reach you:

| | Development mode | Production mode |
| --- | --- | --- |
| Started by | `npm run dev` | `npm run build && npm start`, and every deployment |
| Codes | Shown on the page (already filled in) and printed in the terminal; **no email is sent** | Emailed through Supabase's SMTP (Resend) |
| Addresses | Any address works, even made-up ones, so you can create as many test accounts as you like | Real inboxes only |
| On screen | A "Development mode" badge on the sign-in pages | Nothing extra |

Everything else is the same real flow: accounts and workspaces are saved in the database, wrong codes are refused, 5 wrong codes lock the address, a new code replaces the old one, a password reset signs out every device. To test real emails on your machine, set `NEXT_PUBLIC_APP_MODE=production` in `.env.local` and restart `npm run dev`. A production build can never run in development mode, so codes are never shown to real users.

Test accounts made in development mode live in the same database as real ones. Delete them in Supabase → Authentication → Users (delete the user's workspace first in Table Editor → `workspaces` if Supabase refuses).

### Backend checks

With `npm run dev` running, `npm run check:api` signs up two throwaway accounts (`qa+…@agentiqsocial.com`), drives every flow over HTTP the way the browser does, and deletes both accounts at the end: sign-up and codes (wrong codes, the 5-try lock, resend, reuse), sign-in and sign-out, password reset (wrong code, same password, every device signed out), profile, tags, posts (versions, filters, search), idempotency keys, isolation between workspaces, and request hygiene (cross-site requests, bad JSON). It prints one line per check and exits non-zero if any fails.

### Sample data without a backend

`NEXT_PUBLIC_MOCK_API=true` swaps the backend for an in-browser mock (`src/lib/api/mock.ts`) with sample data in `localStorage`: sign in with **`demo@example.com`** and any password, and use the code **123456**. It is for the landing page recordings (`scripts/clips`) and demos without Supabase; nothing is saved on a server.

## How it is put together

```text
app/[locale]/(marketing)/   home, pricing, free video checker
app/[locale]/(auth)/        login, signup, verify-email, forgot-password, reset-password (email codes)
app/[locale]/onboarding/    who you are → connect accounts → done
app/[locale]/(app)/dashboard/  home, create, posts (+ calendar/scheduled/posted/draft),
                            connections, teams, billing, settings
proxy.ts                    locale routing (next-intl) + signed-out redirect
messages/<locale>.json      UI text: en, es, pt-BR, fr, de, ar, ur
src/components/ui/          primitives on Radix (button, dialog, tabs, field…)
src/components/             app-wide pieces (status chip, banners, theme, language switcher)
src/features/<feature>/     screens and their hooks
src/lib/api/                typed API contract, HTTP client, mock client
src/lib/preflight/          browser probe + pre-flight rules (shared with the server later)
src/lib/billing/plans.ts    the single source of truth for plans and prices
src/lib/time.ts             timezone-first scheduling, DST gap/overlap rules
src/providers/<platform>/   per-platform limits and capabilities (data only)
```

Key choices:

- **Locale is the root segment** (`app/[locale]`), read with `next/root-params`, so every page prerenders per language. `ar` and `ur` render right-to-left; layouts use logical properties (`ms-`, `ps-`, `start`, `end`).
- **Signed-in data is fetched in the browser** with TanStack Query; every query key starts with `["ws", workspaceId, userId]`. With Cache Components, client views that read the clock sit behind `<Suspense>`.
- **Every mutating button** ignores repeat activation, and creates carry an idempotency key made once per intent (`src/lib/use-intent-key.ts`). Autosave and submit share one serial queue, so a slow first save cannot create two drafts.
- **Design tokens** from FRONTEND.md §2.7 are in `app/globals.css`; components use token names, never raw hex. Dark theme follows the system and is applied before first paint.
- **Platforms are data.** The UI reads capabilities and limits from `src/providers/catalog.ts` and never branches on platform names.

## Backend contract

`src/lib/api/types.ts` defines the `ApiClient` interface; `src/lib/api/http.ts` implements it. The backend runs inside this app (`app/api/v1`, `src/server/`), on the same origin unless `NEXT_PUBLIC_API_URL` says otherwise, using cookie sessions and the error envelope from BACKEND.md §7.3:

| Area | Routes |
| --- | --- |
| Auth | `GET /auth/session` → `{ session }`; `POST /auth/sign-in`, `/auth/sign-up`, `/auth/sign-out`; codes: `POST /auth/verify-email` `{ email, code }`, `/auth/resend-verification` `{ email }`, `/auth/password-reset` `{ email }`, `/auth/password-update` `{ email, code, password }`. In development mode the code-sending routes also return `dev: { code }`. |
| Profile | `PATCH /me` |
| Accounts | `GET /workspaces/:ws/accounts`; `POST …/accounts/connect` → `{ kind: "redirect", url }` or `{ kind: "connected", account }`; `POST …/accounts/:id/reconnect`; `DELETE …/accounts/:id` |
| Posts | `GET /workspaces/:ws/posts?status&from&to&q&tag` (`status` and `tag` repeat; a post matches if it has any of the tags); `GET …/posts/:id`; `POST …/posts`; `PATCH …/posts/:id` (`If-Match: <version>`); `POST …/posts/:id/reschedule`; `POST …/posts/:id/retry`; `DELETE …/posts/:id`. Posts carry `tagIds` and `aiGenerated`. |
| Tags | `GET /workspaces/:ws/tags`; `POST …/tags` `{ name, color }`; `PATCH …/tags/:id`; `DELETE …/tags/:id` (also removes the tag from its posts). Names are unique per workspace, case-insensitive (`409 conflict`); colours are `blue`, `violet`, `green`, `amber`, `rose`, `peach`. Owners, admins and editors can change tags. |
| AI | `POST /workspaces/:ws/ai/generate` `{ prompt, platforms, maxLength, locale }` and `POST …/ai/rewrite` `{ text, action, maxLength, locale }` (`action`: `rephrase`, `shorten`, `expand`, `casual`, `formal`) → `{ text, creditsRemaining, creditsLimit }`. Out of credits returns `plan_limit_reached`. The model call stays on the server; the browser never holds an AI key. |
| Media | `POST /workspaces/:ws/media/uploads` → `{ assetId, uploadUrl }`; `POST …/media/uploads/:id/complete` |
| Team | `GET …/members`, `GET …/invites`, `POST …/invites`, `DELETE …/invites/:id`, `DELETE …/members/:userId` |
| Billing | `POST /workspaces/:ws/billing/checkout` → `{ url }` |
| Notifications | `GET …/notifications`, `POST …/notifications/read-all` |

`POST` routes accept an `Idempotency-Key` header. Version conflicts return `409 conflict`; a time in the past returns `422 validation_failed` with `details.reason = "past"`.

## Before launch (known gaps)

- **Platform limits are unverified.** Every file in `src/providers/*/limits.ts` has `verifiedAt: null`; check each against the vendor docs linked there and set the date (TEST.md PRE-13).
- **Translations need native review** (TEST.md I18N-12). They are complete and pass `i18n:check`, but were not written by native speakers.
- **Browser end-to-end tests** (Playwright) are still to add; `npm test` and `npm run check:api` cover the database and the API.
- **Content-Security-Policy with nonces** is not on yet (baseline security headers are, in `next.config.ts`).
- Google sign-in, real OAuth connect, the customer billing portal, legal pages and client approval links wait for the backend.
- **The AI assistant uses a sample writer in preview mode** (`src/lib/api/mock.ts`, 50 credits a month). It fills templates from the prompt and does not call a model; the real text comes from the backend's `/ai` routes.

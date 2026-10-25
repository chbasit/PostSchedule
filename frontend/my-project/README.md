# PostSchedule — frontend

The web app for the social media scheduler: marketing site, sign-up, onboarding, and the signed-in Publish module (composer with pre-flight checks, calendar, posts, connections, team, billing, settings). Product rules live in [`../../doc/CLAUDE.md`](../../doc/CLAUDE.md); the design system and flows in [`../../doc/FRONTEND.md`](../../doc/FRONTEND.md).

"PostSchedule" is a working name, set in one place: `src/config/site.ts`.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
npm run lint
npm run typecheck
npm run i18n:check     # every locale has every key, same placeholders, valid ICU
```

Requires Node 20.9+. This is **Next.js 16** with Cache Components on: read `node_modules/next/dist/docs/` before changing routing, caching or the proxy (see `AGENTS.md`).

### Preview mode (no backend yet)

With `NEXT_PUBLIC_API_URL` empty, the app uses an in-browser mock API (`src/lib/api/mock.ts`) that keeps sample data in `localStorage`. Sign in with **`demo@example.com`** and any password. Settings → *Reset preview data* starts over. The mock simulates publishing, the due-time scan, a webhook after checkout, plan limits, idempotency keys and version conflicts, so the UI's states can be exercised end to end.

## How it is put together

```text
app/[locale]/(marketing)/   home, pricing, free video checker
app/[locale]/(auth)/        login, signup, forgot-password, verify-email, auth/confirm
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

`src/lib/api/types.ts` defines the `ApiClient` interface; `src/lib/api/http.ts` implements it against `NEXT_PUBLIC_API_URL`. The backend in `E:\PostSchedule\backend` should serve these routes under `/api/v1`, using cookie sessions (`credentials: include`) and the error envelope from BACKEND.md §7.3:

| Area | Routes |
| --- | --- |
| Auth | `GET /auth/session` → `{ session }`; `POST /auth/sign-in`, `/auth/sign-up`, `/auth/sign-out`, `/auth/password-reset`, `/auth/resend-verification`, `/auth/verify-email` |
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
- **Tests are not set up yet.** Installing Vitest hit an npm installer bug (`Cannot read properties of null (reading 'edgesOut')`); Playwright end-to-end tests are also still to add.
- **Content-Security-Policy with nonces** is not on yet (baseline security headers are, in `next.config.ts`).
- Google sign-in, real OAuth connect, the customer billing portal, legal pages and client approval links wait for the backend.
- **The AI assistant uses a sample writer in preview mode** (`src/lib/api/mock.ts`, 50 credits a month). It fills templates from the prompt and does not call a model; the real text comes from the backend's `/ai` routes.

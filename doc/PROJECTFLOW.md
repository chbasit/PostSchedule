# Project flow

How we go from an empty repo to a launched product, and how each week of work runs. Companion to `CLAUDE.md` (rules) and `docs/PRODUCT-PLAN.md` (what we are building).

Week numbers assume one full-time builder. They are estimates, not promises. Re-plan at the end of each phase.

---

## 1. The build loop

Every task, big or small, goes through the same six steps.

1. **Spec**: write the story and acceptance criteria (template in section 5). If you cannot write the acceptance criteria, the task is not ready.
2. **Build**: smallest change that satisfies the criteria. Behind a feature flag if it is user-visible and unfinished.
3. **Verify**: lint, typecheck, unit tests, RLS tests, the happy path by hand, and the main failure by hand.
4. **Review**: read your own diff first. Then a second pass by Claude or a person, focused on tenancy, secrets, error handling and states.
5. **Ship**: merge to `main`, deploy to staging automatically, promote to production when the checklist passes.
6. **Measure**: confirm the analytics event fires, check Sentry for new errors, note what you learned in `docs/DECISIONS.md` if it changes the plan.

---

## 2. Phase map

Each phase has an exit test: a thing you can do end-to-end that proves the phase is done. Do not start the next phase until the exit test passes.

| # | Phase | Weeks | What is built | Exit test |
|---|---|---|---|---|
| 0 | Foundations | 1 | Repo, CI, Supabase project, environments, design tokens, error tracking, decision log | A hello-world page deploys from a PR to a preview URL; CI blocks a failing test |
| 1 | Auth, workspaces, app shell, i18n | 2–3 | Sign-up/in, workspaces, roles, invites, app shell, language switcher, base locales | Two users in two workspaces cannot see each other's data (RLS test); UI switches language and direction |
| 2 | Billing | 3–4 | Lemon Squeezy checkout, webhooks, plans, entitlements, trial, customer portal | A test purchase upgrades a workspace; a cancellation downgrades it without deleting data |
| 3 | Provider framework | 4–6 | Adapter interface, OAuth connect/disconnect, token encryption and refresh, first 2–3 platforms | Connect an account, force a token expiry, and see it refresh; revoke access and see a clear reconnect prompt |
| 4 | Media | 6–8 | Presigned multipart uploads to R2, media library, ffprobe worker, thumbnails | Upload a large video, close the tab mid-upload, resume it; probe data appears |
| 5 | Composer and publishing | 8–11 | Composer, per-platform captions, calendar, schedule queue, jobs, retries, notifications | Schedule posts to three platforms; kill the worker mid-publish; the post still publishes once and only once. **Private beta starts here.** |
| 6 | Video quality | 11–13 | Pre-flight rules, per-platform previews, explicit fix actions, "send original" default | A 16:9 clip headed to a Reel is flagged, previewed with the crop, fixed on request, and publishes without silent re-encoding |
| 7 | Collaboration | ~5 weeks | Approval chains, versions, comments pinned to media, tasks/boards, presence, roles | An agency workflow runs end to end: draft, client comment, change, approve, schedule |
| 8 | Bulk and studio | — | CSV/bulk scheduling, templates, recurring posts, asset tools | 100 posts import with row-level errors reported, none lost |
| 9 | Analytics and reports | — | Daily metrics, definitions, dashboards, branded PDF/share-link reports | A report for a month of data matches the platforms' own numbers within a documented tolerance |
| 10 | API, MCP, webhooks | — | Public API, API keys, outbound webhooks, MCP server for AI agents | An agent schedules a post through MCP with a scoped key; the key cannot touch another workspace |
| 11 | Remaining platforms | — | Add platforms in order of customer demand and approval status | Each platform passes the adapter test suite |
| 12 | Launch prep | ~wk 29 | Marketing site, pricing page, docs, status page, legal pages, onboarding, support flow, SEO base | Launch checklist (section 10) fully ticked |
| 13 | Engage inbox | later | Unified inbox, replies, assignment, saved replies | Reply to a comment from the inbox and see it on the platform |
| 14 | Google Business Profile | later | Posts, reviews, replies (after API access is granted) | Reply to a review from the inbox |
| 15 | Multi-market planning | later | Markets, content pieces, per-market variants, localized calendars | One piece produces three market variants with different languages and times |
| 16 | App operations | later | App store review replies and release notes (only if still wanted) | Reply to a store review from the inbox |
| 17 | Unified analytics | later | Cross-source reporting, benchmarks | One report combines social, reviews and app data |
| 18 | Language wave 2 | later | More locales after wave 1 is stable | Each new locale passes the locale checklist in `SKILL.md` |

Rough totals: Publish only, about 6–7 months to first public release. Everything, about 14–16 months solo.

Phases 0–6 are the critical path. If time is short, cut from 7 onward, never from 4–6.

---

## 3. Parallel workstreams

These run alongside the build, in small weekly slices.

- **Platform approvals** (start in Phase 0, they take weeks): Meta app review, TikTok, YouTube/Google verification, LinkedIn, X, Pinterest, Google Business Profile access request. See the tracker in section 8.
- **SEO and growth** (see `docs/SEO-AEO.md`): technical base at Phase 1, comparison and alternatives pages from Phase 5, blog from Phase 3 onward, programmatic pages after launch prep.
- **Customer conversations**: talk to 20 prospective buyers before pricing is final, and keep talking through the private beta.
- **Legal and finance**: terms, privacy policy, DPA for agencies, Lemon Squeezy payout confirmation for Pakistan, business registration questions.

---

## 4. Weekly rhythm

| Day | Focus |
|---|---|
| Monday | Pick the week's 3–5 tasks from the current phase. Write acceptance criteria. Check approval tracker. |
| Tuesday–Thursday | Build. Deploy to staging daily. |
| Friday | Review the week: what shipped, what slipped, what was learned. Update `CLAUDE.md` current phase if it changed. Log decisions. One SEO/content slice. Talk to at least one customer or prospect. |

Keep a short `CHANGELOG.md` for user-facing changes. It becomes the public changelog later.

---

## 5. Task template

Copy into the issue or PR description.

```
## Story
As a <role>, I want <capability> so that <outcome>.

## Acceptance criteria
- [ ] ...
- [ ] ...

## States
- [ ] Empty   - [ ] Loading   - [ ] Error   - [ ] Partial

## Security and data
- [ ] RLS policy and test for any new table
- [ ] Server-side permission and plan-limit check
- [ ] No secrets or tokens in logs

## i18n and accessibility
- [ ] Strings in messages files   - [ ] RTL checked
- [ ] Keyboard path works   - [ ] Contrast and labels checked

## Tests
- [ ] Unit   - [ ] RLS   - [ ] E2E (if a core flow)

## Analytics
Event name and properties:

## Docs
- [ ] Docs / DECISIONS.md updated if behaviour or plan changed

## Out of scope
(what we are deliberately not doing)
```

---

## 6. Branching, PRs, environments

**Branching**
- `main` is always deployable. Work happens on short-lived branches named `feat/…`, `fix/…`, `chore/…`.
- Squash-merge with a Conventional Commit title.
- One concern per PR. If a PR needs a long description to explain several things, split it.

**Environments**

| Env | Purpose | Data |
|---|---|---|
| Local | Development with `supabase start` | Seed data only |
| Preview | One per PR | Throwaway Supabase branch or shared dev project |
| Staging | Merged `main`; mirrors production config | Test data; sandbox Lemon Squeezy and platform test accounts |
| Production | Customers | Real data; backups on; alerts on |

**Migrations**
- Forward-only in production. Never edit an applied migration.
- Destructive changes use expand → migrate → contract across separate deploys.
- Test every migration on a copy of staging data before production.

**Feature flags**
- Anything unfinished and user-visible ships dark behind a flag.
- Flags are removed within two phases of full rollout.

**Rollback**
- Code: redeploy the previous build.
- Database: write a forward fix; keep backups; take a manual backup before risky migrations.
- Jobs: pause the queue first, fix, then resume. Posts due during a pause are marked `lapsed` and the owner is told.

---

## 7. CI quality gates

A PR cannot merge unless all of these pass:

1. Lint and format
2. Typecheck (strict)
3. Unit tests
4. RLS tests (`supabase/tests`)
5. Missing-translation check (every key in every locale)
6. Build succeeds
7. E2E smoke test for sign-in and one core flow (from Phase 5)
8. Accessibility check on key pages (automated axe run; manual pass at phase end)
9. Dependency audit with no unreviewed high-severity findings
10. Secret scan

Phase-end gate (manual): walk the phase's exit test on staging, with a phone as well as a desktop.

---

## 8. Platform approval tracker

Keep this table current. Approvals gate the whole plan. Dates are filled in as you go.

| Platform | Needs | Submitted | Status | Blocker / notes |
|---|---|---|---|---|
| Meta (Facebook, Instagram, Threads) | App review, business verification, test users, screencast | | Not started | |
| TikTok | App review, content posting API audit | | Not started | |
| YouTube / Google | OAuth verification, API quota | | Not started | |
| LinkedIn | Marketing/Community Management API access | | Not started | |
| X | API tier and cost check | | Not started | Confirm current pricing before committing |
| Pinterest | Standard access | | Not started | |
| Google Business Profile | Separate API access request | | Not started | Needed for Phase 14 |
| Apple App Store Connect | API key flow (user-supplied) | | Not started | Only if app operations is built |
| Google Play | Service account flow (user-supplied) | | Not started | Only if app operations is built |

Start the Meta, TikTok and Google submissions in Phase 0–1. Build against sandbox/test modes while waiting.

---

## 9. Decision log

`docs/DECISIONS.md`, newest first. One entry per decision.

```
## 2026-MM-DD — Short title
Decision: what we chose
Why: the reason, with the facts it rests on
Alternatives: what we rejected and why
Revisit when: the condition that would change this
```

Decisions still open:

1. Product name, domain and brand colour
2. Job runner: Inngest or Trigger.dev
3. Sign-up flow: value-first (recommended) or pay-first
4. Wave-1 languages for the language switcher (shipping now: en, es, pt-BR, fr, de and ar; Urdu removed on 2026-10-23)
5. Which module follows Publish
6. Whether app operations is in the first release at all
7. Final prices, after talking to ~20 buyers
8. Lemon Squeezy payout path for Pakistan

---

## 10. Launch checklist

**Product**
- [ ] Exit tests for phases 0–6 pass on production
- [ ] Private beta feedback triaged; top issues fixed
- [ ] Failed-publish, token-expiry and plan-limit paths tested by hand
- [ ] Backups restored successfully at least once

**Billing and legal**
- [ ] Payments tested live with a real card, including refund and cancellation
- [ ] Payout to your bank confirmed
- [ ] Terms, privacy policy, cookie notice, DPA, refund policy published
- [ ] Platform approvals in place for every platform advertised

**Operations**
- [ ] Sentry alerts, uptime check, and a status page
- [ ] Support inbox and canned replies
- [ ] On-call plan for "posts are not publishing" (who looks, where, how fast)
- [ ] Rate limits and abuse controls on sign-up and API

**Marketing and SEO**
- [ ] Pricing page, comparison pages and docs live (see `docs/SEO-AEO.md`)
- [ ] Sitemap submitted to Google Search Console and Bing Webmaster Tools
- [ ] Schema validated; Core Web Vitals checked
- [ ] Product Hunt, directories and community posts prepared
- [ ] Founding-customer offer page live (first 100, 24-month price lock)

---

## 11. Start here

Do these in order. Each is small enough for one sitting.

1. Choose a working name and domain (can change later; keep the code on `{{PRODUCT_NAME}}`).
2. Create the GitHub repo, copy `CLAUDE.md` to the root, `SKILL.md` to `.claude/skills/scheduler-dev/`, and these docs to `docs/`.
3. Export the product plan to `docs/PRODUCT-PLAN.md`.
4. Scaffold Next.js (App Router, TypeScript strict, Tailwind) and add shadcn/ui and next-intl.
5. Create the Supabase project (and a second one for staging). Add `supabase/` to the repo.
6. Set up CI with the gates in section 7 (start with lint, typecheck, test, build).
7. Deploy a hello-world page to a preview URL.
8. Open the Meta, TikTok and Google developer accounts and start the approval paperwork.
9. Fill in the Commands section of `CLAUDE.md` with the real scripts.
10. Start Phase 1.

---

## 12. Progress log

Newest first. What is actually built, so the phase map can be checked against it. The reasons live in `DECISIONS.md`; screen details in `FRONTEND.md`.

### 2026-10-26 — New hero headline, deep green footer

- **Hero:** "Post to all your social accounts from one dashboard" with a new subheading in all six languages; no gradient glow; the clip in a lavender frame.
- **Footer:** `#213130` with white text and white focus rings, in both themes.

### 2026-10-26 — Five-colour landing, AI section, three plans

- **Colours:** the founder's aqua, yellow, pink, salmon and lavender on the facts row, the feature cards (framed, Buffer-style), the hero's video frame and the icon chips; deep versions in dark mode.
- **AI section:** the AI assistant (built) and AI agents through the API and MCP server (coming soon), with a mock-up agent console that fills in when scrolled to and a glowing edge; a new FAQ answer about AI.
- **Pricing:** three plans on the landing (Free, Pro, Agency); every plan card (landing, Pricing, Billing) is short, with "Everything in …, plus" for the higher plans.
- **Checks:** typecheck, lint, 77 unit tests, the message check and the production build pass; checked in light, dark, phone width and Arabic, and the billing screen.

### 2026-10-26 — Navbar, footer and plan cards; lime retired

- **Navbar:** a floating rounded bar over the hero glow (logo, centred links, language, theme, Log in, Start free); a menu sheet on phones.
- **Footer:** a rounded panel with brand, Product, Free tools and Account columns, platform marks and a large faint wordmark.
- **Colour:** lime removed everywhere, logo included (ink tile with a sky-to-mint check); the announcement strip is light green.
- **Labels:** no small labels above headings on the landing, pricing and tool pages; the facts row's pause button now shows on keyboard focus only.
- **Plan cards:** who each plan is for, limits in bold, and the full list of included features (10 lines on Free, 14 on Scale); the pricing table lists the same features.
- **Checks:** typecheck, lint, 77 unit tests, the message check and the production build pass; checked in light, dark, phone width and Arabic.

### 2026-10-26 — Light landing page with product clips

- **Landing:** centred hero with a "free tools" pill, the platform logos and a clip of the composer (preview, fix to 9:16, schedule); a moving row of product facts with a pause button; feature cards with clips of the previews, calendar, home screen and carousel splitter, plus a short feature list and links to four free tools; restyled steps, pricing, FAQ and final call to action. Checked in light, dark, phone width and Arabic.
- **Clips:** five recordings of the sample workspace in `public/clips` (about 9 MB in all on desktop, 4.3 MB on phones, each loaded only when shown). They play while a third is on screen, pause when scrolled away or by the visitor, and stay on the poster with reduced motion or data saving.
- **Fonts:** Plus Jakarta Sans (headlines) and DM Sans (text) on the landing, pricing and tool pages, menus included; Inter stays in the app.
- **Tooling:** `scripts/clips` records the flows in headless Chrome and encodes them (no dependencies; see its README).
- **Tests:** 77 unit tests (new: headline full stops). Typecheck, lint, the message check (1,271 keys in each locale) and the production build pass.

### 2026-10-25 — Dashboard redesign, free tools, real product shot

- **Dashboard home:** slim title row (greeting, plan for the week, Open calendar, New post) instead of the dark hero card. Stat cards have icon chips and a change against the previous 7 days. "Needs attention" is a compact list with Retry or Publish now on each row. The light green highlight is used across the app, with sky for icons and a black primary button. Checked in light, dark and phone width.
- **Free tools** (no account, nothing uploaded): `/tools` index, Instagram carousel splitter, Instagram grid maker (tiles numbered in posting order), LinkedIn text formatter (bold, italic, underline, lists, "see more" fold), YouTube title checker (phone and computer cut-off), and Instagram and TikTok username checkers (rules and ideas; availability is the person's own click, no scraping). The video checker moved onto the same page shell. All six languages, in the sitemap with hreflang.
- **Footer:** brand column, then Product, Free tools (every tool) and Account.
- **Landing:** the hero shows real dashboard screenshots (light and dark; Arabic in right-to-left) instead of the illustration.
- **Tests:** 39 new unit tests (ZIP writer, tile geometry, styled text, username rules, title checks); 75 in total. Downloads were checked end to end in a browser: four 1080 × 1350 slides and nine 1080 × 1440 tiles, opened by Windows' own unzip.
- **Still to verify:** platform facts behind the tools are marked VERIFY (see DECISIONS.md).

### 2026-10-23 — Backend slice: sign-in, workspaces, posts, billing (Supabase + Lemon Squeezy)

- **Where:** inside the Next.js app (`app/api/v1`, `src/server/`, `supabase/`). The app keeps using the mock until `NEXT_PUBLIC_API_URL` and the Supabase keys are set.
- **Database:** one migration with every core table and its row-level security. A new sign-up gets a profile, a personal workspace, owner membership and a 14-day Free trial. Account and seat limits are enforced in the database. Posts are saved through one `save_post` function with version checks.
- **Sign-in:** sign up with email confirmation, sign in, sign out, resend the confirmation, forgot and reset password (resetting signs out every device), Google (shown once enabled). Clear messages for an unconfirmed email, too many tries, and a server that isn't set up yet.
- **Login and signup pages:** a simple centred card on the shell colour; the dark side panel and its image are gone. New `/reset-password` page.
- **API:** accounts (list, remove), posts (list, get, create, edit, reschedule, delete), members, invites, tags, notifications, with idempotency keys and same-origin checks. Connecting accounts, uploads, publishing, insights and AI answer 503 `not_configured` until their services are added.
- **Billing:** Lemon Squeezy checkout (owners only, repeat clicks reuse the checkout), customer portal, and a signed webhook recorded once and applied in order. 16 unit tests cover signatures, status mapping, stale events and the checkout body.
- **Database security, tested:** the migration runs on PGlite (Postgres 17 in-process) in `npm test`; 20 tests attack it as a signed-in user would through Supabase's public API. They found and now guard against: linking your account, tag or file to another workspace's post (now refused by `(id, workspace_id)` foreign keys); changing your profile email, the workspace owner, the plan, an invite's acceptance or a notification; registering files that point at any stored key; editors taking over or deleting colleagues' drafts; clients marking posts as published. Clients now get only the columns they need, and signed-out callers get nothing.
- **Not yet run on Supabase itself:** Docker Desktop was not responding, so the routes have not been tried through Supabase's API and Auth.

### 2026-10-23 — Composer: media in the caption box, real previews, YouTube settings, platform logos

- **Media:** several photos per post (carousel), uploaded side by side; drag files onto the caption box, paste an image, or use Add. Thumbnails with progress, pause/resume, remove and a warning badge sit inside the box. The post type follows the files.
- **Preview:** per platform, from each descriptor's `preview` spec. The uploaded video plays (muted, with play/pause and sound); photos swipe or show as a grid; Stories, feed cards and the Shorts/Reels/TikTok player each look like their platform. Fixed: the preview kept showing "Add media" after a failed load, and drafts lost their media after a reload (files now kept in IndexedDB in preview mode).
- **YouTube settings:** title (falls back to the caption's first line), visibility, made for kids, notify subscribers, allow embedding; stored per account and shown on the post sheet.
- **Checks:** "Number of photos" per platform (e.g. Bluesky 4) and "Title" for YouTube; with several files, the report lists issues per file and sums up the rest.
- **Platform logos** replace the YT / IG monograms everywhere (Simple Icons, CC0).

### 2026-10-23 — Account pages, settings area, export (frontend, mock API)

- **Accounts in the sidebar:** every connected account is listed with its scheduled count and a dot when it needs reconnecting; the open account shows Insights and Posts. Platform marks under "Connect more" open the connect flow for that platform.
- **Account Insights** (`/dashboard/accounts/[id]`): 7 / 30 / 90 days, stat tiles in each platform's own terms (Instagram reach and saves, YouTube subscribers, LinkedIn reactions and reposts, Bluesky replies…), change against the previous period, a chart with a metric switcher, and a sortable per-post table that includes posts made outside the app. Posts tab (`/accounts/[id]/posts`) reuses the Posts list for that account.
- **Export:** CSV, Markdown and PDF (print dialog) from an account's Insights.
- **Settings area** with its own sidebar: Profile, Preferences (saves on change), Workspace, Team, Social accounts, Billing, Tags. Old `/dashboard/connections`, `/teams`, `/billing` moved under `/dashboard/settings/`. Resetting preview data now asks first.
- **Profile button** at the bottom of the sidebar with the account menu (theme, sign out).
- **Fixes:** the settings page no longer leaves empty space below the frame (hidden inputs escaped the scrolling panel); the header no longer shrinks on long pages; chart axes use round numbers for large counts.
- **Backend contract added:** `GET /workspaces/{ws}/accounts/{id}/insights` (BACKEND.md §12). Metric lists per platform are marked unverified until checked against each platform's insights API.

### 2026-10-23 — Dashboard polish (frontend, mock API)

- **Shell:** Buffer-style frame. The sidebar sits on `#F7F6F3` (hover `#EAE8E5`) with tighter items and no section headings; pages sit in a white, rounded panel that scrolls on its own from `lg` up.
- **Posts:** one route, `/dashboard/posts`, with All posts, Scheduled, Posted and Drafts as tabs (`?tab=`). Search and filters carry across tabs. The sidebar keeps only Calendar and All posts under Posts; Home and the composer link straight to a tab.
- **Filter bars:** a small rounded search box and borderless platform and tag dropdowns, on Posts and Calendar.
- **Calendar:** borderless previous/next arrows and a pill Month/Week/List toggle, shared with Billing's Monthly/Yearly.
- **Billing:** one current-plan card with usage as pill tags (amber at the limit) instead of meters.
- **Page headers:** no eyebrow labels; icon and title only.
- **Languages:** Urdu removed; six locales (en, es, pt-BR, fr, de, ar). Arabic still covers the right-to-left part of the Phase 1 exit test.

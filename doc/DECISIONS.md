# Decision log

Newest first. Format from `PROJECTFLOW.md` §9.

## 2026-11-13 — TikTok: connect and post videos (Login Kit + Content Posting API, Direct Post)

Decision:
- **Connect.** `POST /accounts/connect {provider:"tiktok"}` answers with TikTok's Login Kit v2 address:
  - scopes `user.info.basic` and `video.publish` only;
  - a random `state` kept in an httpOnly cookie (`ps_tiktok`, 10 minutes);
  - Reconnect uses the same address.

  `GET /api/v1/oauth/tiktok/callback` then:
  - checks the state and that the person still has `account.connect`;
  - swaps the code for tokens (form-encoded `POST /v2/oauth/token/`) and requires the `video.publish` grant;
  - reads the name, picture and @username (`creator_info`) and saves the account with both tokens encrypted.

  Every outcome redirects: to the account's page with `?connected=tiktok`, or to Settings > Accounts with `?connect_error=<reason>`, which shows a toast. Disconnecting revokes the token at TikTok.
- **Tokens.** Access tokens last 2 hours; each refresh returns a new refresh token and kills the old one. `freshToken` refreshes when less than 5 minutes are left and saves the new pair only if the stored refresh token is unchanged (compare-and-swap); if another process refreshed first, the loser reads its token instead.
- **Posting (Direct Post, video only).**
  - The video goes by `PULL_FROM_URL` from `https://<site>/api/v1/media/pull/<token>`: a one-hour HMAC-signed link that streams the stored file (`src/server/media/pull-token.ts`, tested). TikTok's guidelines say files already on our servers must not use `FILE_UPLOAD`.
  - The site's domain must be verified in the TikTok portal (URL properties).
  - `creator_info` is read again before each post.
  - The send waits up to 45 seconds for `PUBLISH_COMPLETE`. If TikTok is still processing, the account is marked `needs_check` with the publish id, and the every-minute job finishes it (`resolveTikTokChecks`, gives up after 2 hours). The post stays "publishing" until then.
  - Errors map to plain reasons (`explain`).
- **Composer, per TikTok's Content Sharing Guidelines** (`creator-controls.tsx`, driven by the descriptor's `publishOptions.creatorControls`, not by platform name):
  - the creator's nickname, read fresh;
  - "Who can view" from `privacy_level_options`, with no default and required (the server checks too);
  - Comment, Duet and Stitch unticked, and greyed out where the creator turned them off;
  - the disclosure switch, off by default, with "Your brand" and "Branded content", the label notices, and "Only me" disabled for branded content;
  - TikTok's consent sentence beside the post button, in the branded version when needed;
  - the video length checked against `max_video_post_duration_sec`;
  - a "may take a few minutes" notice after posting.
- **Not yet.** TikTok photo posts are off (`capabilities.image: false`). Insights need `video.list` and `user.info.stats`, which go in a second review. Comments have no TikTok API we can use. The connect dialog promises "read results" only for `INSIGHTS_READY` platforms.
- **Unaudited apps** (TikTok's rules): posts are "Only me" (SELF_ONLY), the TikTok account must be private, and at most 5 users can post in 24 hours.
Why: The founder needs a working, real integration to record TikTok's review video; a staged video would fail review.
Alternatives: `FILE_UPLOAD` from our server (simpler, no domain verification, but against TikTok's guidelines for server-held files). Asking for Display API scopes now (they must all be shown in the review video).
Revisit when: The app passes TikTok's audit (public posts), or insights and photo posts are added (new scopes, second review).

## 2026-11-13 — Real insights and replies for Bluesky; OAuth callback addresses fixed

Decision:
- **Insights from the platform when asked.** `GET /accounts/{id}/insights` returns real numbers for Bluesky:
  - Posts come from `getAuthorFeed` (own posts, no replies or reposts, 2,000 at most) and followers from `getProfile`, both public reads with no login.
  - Each post counts likes, replies (as comments), reposts plus quotes (as shares) and bookmarks (as saves, labelled "Bookmarks"). The engagement rate is engagements over followers, left blank with no followers.
  - The numbers are kept in memory for 3 minutes per account and period. "Updated …" shows when they were read, and answering a reply clears them.
  - The arithmetic is in `src/server/insights-build.ts`, with tests.
- **No made-up history.** Bluesky gives only today's follower count:
  - followers show "As of today" (`previous: null`);
  - `followerHistory: false` hides the "new followers" chart;
  - a metric with no posts in the earlier period shows "No posts in the N days before" instead of a percentage.
  - Daily follower snapshots (a table and a job) would give history later.
- **Replies (Engage, started early at the founder's request).**
  - The Replies number in the per-post table opens a dialog with the post's replies as a tree (name, handle, time, likes; the account's own marked "You").
  - "Reply" answers any of them, and the box answers the post itself.
  - `GET/POST /accounts/{id}/comments`:
    - reads `getPostThread`;
    - answers with `createRecord` and the root and parent refs;
    - accepts only the account's own posts (`at://<its DID>/…`), checks that the reply belongs to that post's thread, and limits replies to 300 graphemes;
    - needs `post.create` and an `Idempotency-Key`.
  - `COMMENTS_READY` in the catalogue lists the platforms that support replies (Bluesky).
- **OAuth callback addresses** for the platform connections still to build: `https://agentiqsocial.com/api/v1/oauth/{meta|tiktok|youtube|linkedin}/callback`, plus the `http://localhost:3000` version where the platform allows it (TikTok does not).
Why: The founder wants likes, comments, shares per post and to answer people from the dashboard. Bluesky is connectable today and its public API allows all of it without approval.
Alternatives: A nightly sync into tables (needed for follower history and for scale; later). Showing 0 for unknown history (rule 10: blank is not zero).
Revisit when: Each OAuth platform ships (insights and replies per platform), or reading on request becomes slow at scale (move to scheduled syncs).

## 2026-11-13 — The connect dialog says which platforms can be connected

Decision:
- `CONNECT_READY` in `src/providers/catalog.ts` lists the platforms whose sign-in is built; today that is Bluesky only.
- The connect dialog marks the other platforms "Soon" in its picker.
- Opening one shows "Connecting {platform} is coming soon. Bluesky works today." at once, without the consent text and without a button. Before, the button called the server, which answers `not_configured` (HTTP 503). On the live site that reply can arrive as the generic "We could not connect this account", presumably because Hostinger's proxy replaces 503 bodies.
Why: The founder tried TikTok and got an error that suggested trying again. The truth is that the platform is not built yet.
Alternatives: Keep the button and change the status code (the message would still promise a sign-in that cannot happen).
Revisit when: Each platform's OAuth flow ships: add it to `CONNECT_READY`.

## 2026-11-13 — Scheduled posts send themselves (Inngest); Post now; post details as a dialog

Decision:
- **Job runner: Inngest.** The founder chose the option that scales to thousands of users and posts a day without slowing the app.
  - Every minute, `find-due-posts` (cron) does three things:
    - Marks posts more than 30 minutes late as `lapsed`. They are never sent late without the person choosing "Post now" (BACKEND.md §8.5).
    - Claims every other due post in one statement (`scheduled` → `publishing`), so two checks never take the same post.
    - Sends one `post/publish.due` event per post (id `publish:<post>:<time>`, so a repeat is dropped).
  - `publish-post` sends each one:
    - Each account is claimed on its own (`pending` → `publishing`), so a job that runs twice never posts twice.
    - At most 5 posts at once overall and 2 per workspace (fairness). 5 is the most Inngest's free plan allows; with 10, Inngest refused to sync the live app. Raise it on a paid plan.
    - 3 retries.
  - Posts stuck in `publishing` for 15 minutes are sent again by the next check.
  - There is no `singleton` lock: a stuck run held it in testing and blocked every later check. The atomic claim already makes overlapping checks safe.
  - Code: `src/server/jobs/`, `app/api/inngest/route.ts`, `claimDuePosts` / `sendClaimedPost` in `src/server/publish.ts`.
- **Running it.**
  - Locally, `npm run dev:jobs` starts Inngest's dev server (CLI 1.49.0) next to `npm run dev`.
  - In production, Hostinger needs `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`, and the app is synced in Inngest's dashboard at `https://agentiqsocial.com/api/inngest`. `serveOrigin` is the site URL, because Hostinger's proxy hides it.
  - **The local app and the live site share one database.** While `dev:jobs` runs on a laptop it sends everyone's due posts, so only one of them needs to run at a time.
- **Dependency.** `inngest` 4.26.2 adds about 326 packages, all server side.
  - Its optional SvelteKit peer makes npm check SvelteKit's Vite 8 peer against our Vite 7. So `.npmrc` sets `legacy-peer-deps=true`, which Hostinger's install also reads.
  - An override for SvelteKit only moved the conflict to `@sveltejs/vite-plugin-svelte`.
- **Post now and Retry.** `POST /posts/{id}/retry`, the endpoint the client already had:
  - sends a scheduled or lapsed post at once, moved to the time it went out;
  - for a failed or partial post, tries the failed accounts again.

  It runs while the person waits, like the composer's "Post now", so the toast says how it went. A post's final status now counts every account, so a retry that fixes the last failure ends `published`.
- **Post details** are a centred dialog instead of a side sheet:
  - Header: time, status and type.
  - Left: the photos or video (playable) and the caption.
  - Right: each account's status and reason, and the tags.
  - Footer: Delete, Reschedule, Edit, and Post now or Retry failed.
- **Calendar.** Each post is a small card: platforms and time, two lines of caption, and the first photo or video as a thumbnail (`MediaThumb`). The list view shows the thumbnail too.
- **Homepage and layout.**
  - The steps section ("From upload to scheduled in minutes") is gone.
  - The hero grid lines are 1 px `#f2f4f3`.
  - The footer wordmark is no longer cut off at the bottom.
  - The theme script goes through `next/script` (`beforeInteractive`), so React no longer warns about a script tag.
  - `<body>` has `suppressHydrationWarning` for attributes browser extensions add (ColorZilla's `cz-shortcut-listen` was the founder's "1 Issue").

Why: Scheduled posts never went out (no job runner), and the founder wants it to scale. They also asked for a way to post a scheduled post at once, a professional details dialog, and pictures on the calendar.
Alternatives:
- A loop inside the web app: no new package, but sending runs in the process that serves pages, so it is slower under load, and a restart can drop posts mid-send.
- Supabase pg_cron pinging an endpoint: no retries or flow control.
- Trigger.dev: comparable to Inngest; Inngest keys already existed.
Revisit when:
- Video posts or more platforms arrive: move to one job per account (rule 5) and per-platform throttles.
- We need a reconciliation of accounts stuck in `publishing` (`needs_check`).
- Inngest's free tier no longer covers the every-minute check.

## 2026-11-13 — Homepage in the AI page's style, with the centred hero kept

Decision:
- **Hero.** It stays centred as before: headline, sub, Start free and Google, trial note, platform icons. Behind it, on white, is a grid of light grey lines (64 px squares, `--hero-line` `#e9edeb`) that fades toward the next section (`.hero-grid`). The forest hero band and the hub picture (`hub-visual.tsx`) are gone.
- **Site header.**
  - Links are 16 px (were 14 px).
  - Features opens on mouse hover. It closes 150 ms after the pointer leaves, so the pointer can cross into the menu. A click while open keeps it open. Touch and the keyboard work as before.
- **Section titles.** The tabs, comparison, steps and pricing titles are capped at 768 px, so each breaks onto two even lines.
- **Order.**
  - Four benefits (one post everywhere, checks, time zones, original kept).
  - The feature tabs.
  - Alternating word-and-picture sections:
    - Previews: the phones on salmon.
    - Agents: on aqua, "Soon".
    - Workspaces: the brand tree on lavender, its chips aqua, salmon and yellow so none disappears.
  - The comparison, the steps, pricing and the FAQ.
- **Removed from the page.**
  - The promise section.
  - The "extras" cards. These claimed approvals by link, which are not built.
- **Feature tabs.**
  - No coloured panel: each picture sits straight on the page, its cards outlined.
  - The area is a fixed minimum height (544 px below 1280 px wide, 448 px above), so the page below does not jump when the next item opens.
  - The calendar and home screenshots, too small to read, are replaced by pictures drawn in code (`core-visuals.tsx`):
    - a week of the calendar with a "Scheduled for…" note;
    - the posts list with the product's real status chips and a Retry button.
  - The publish picture's draft is square.
- **Comparison.** Three cards:
  - posting by hand and basic schedulers, on light grey;
  - "With AgentiqSocial" on forest, with leaf checks that answer them (every platform in one go, checked before it posts, fixed right here) and a Start free button.
- **"Soon" in pricing.** Reports, team approvals, client approval links and API are listed in the plans but not built. `SOON_FEATURES` in `plans.ts` marks them "Soon" on the plan cards, the homepage pricing and the comparison table; take a key out when it ships.
- **Collaborate card.** The Features page now promises roles only; approvals and comments are "coming soon".

Why: The founder liked the AI page's layout for the homepage but wanted the original hero kept, a stronger comparison, and lower, more readable tab pictures. Unbuilt features must say so.
Alternatives: The forest hero band with the hub picture (tried, the founder preferred the centred hero). Real screenshots in the tabs (unreadable at that size).
Revisit when: Approvals, reports or the API ship (drop them from `SOON_FEATURES` and add the approvals card back); real customer screenshots are worth showing.

## 2026-11-13 — An AI Assistant page; Gemini as the AI provider to switch on

Decision:
- **The page.** `/features/ai-assistant` (in the sitemap; the Features menu's AI Assistant item opens it) has:
  - a forest hero ("Your social media co-writer");
  - four benefits;
  - four sections: writing, repurposing, tailoring, editing.
- **Pictures.** Each is drawn in code from the product's own parts (`ai-visuals.tsx`): the rewrite card with rephrase, shorten, expand, more casual and more formal; the "what should we write about" box; an ideas board with tag pills; and the composer adapting one post per platform. The wording is our own, with the same meaning as the reference the founder showed.
- **"Soon".** The page and the menu say "Soon" until `NEXT_PUBLIC_AI_ENABLED` is true.
- **Switching AI on.** The writer is already built (generate, rephrase, shorten, expand, casual, formal, credits per plan) and only needs a provider key. The recommendation is Google Gemini:
  - a free AI Studio key for building and testing;
  - a paid key with `gemini-2.5-flash-lite` (about $0.10 in and $0.40 out per million tokens, roughly $0.0001 per rewrite) before real customers use it.

  On the free tier, Google may use the prompts to improve its products, which our privacy policy does not allow for customer content. OpenAI's smallest model costs about the same, with no free tier.

Why: The founder wants an AI page like a competitor's, and AI live in the product, at the lowest cost.
Alternatives: OpenAI (similar price, no free tier). A page per AI action (later).
Revisit when: AI is switched on (drop "Soon"), or prices change (check ai.google.dev/pricing).

## 2026-11-13 — The whole product in forest and leaf

Decision:
- **Light theme.** The palette of the public site is now the product's own palette (`:root`).
  - Forest `#213130` for text (`--foreground` and friends), `--brand-ink` (dark surfaces) and the focus ring.
  - Leaf `#AFEB9B` with forest text for `--primary`, so every main button is leaf.
  - A green-grey `#4d5a58` for muted text (7.2:1 on white).
  - The `.site-theme` overrides are gone.
- **Dark theme.** Its primary is leaf as well.
- **Switches and radio buttons.** They show "on" in forest (leaf in the dark theme), because leaf alone is too faint against white (1.4:1).
- **Chart.** Upcoming posts in green `#3b8a58` (3.9:1 on white), the past in warm grey `#d6d2c9`, warm gridlines, wider and rounder bars.

Why: The founder wants the dashboard as calm and professional as a scheduler they admire: forest text, leaf buttons, warm neutral surfaces.
Alternatives: Leaf only on the public site (tried for a day; the product should look like one brand).
Revisit when: Status colours (the blue info banner, the stat icon colours) are aligned with the palette, or a user test shows a contrast problem.

## 2026-11-13 — Feature tabs with pictures, an Agents section, a Features menu and page, larger text

Decision:
- **Feature tabs.** "Publish, schedule and manage in one place." is now feature tabs (`feature-tabs.tsx`): the list on one side, the open item's picture on its colour (lavender, aqua, salmon) on the other.
  - **Movement.** A line fills over the open item in 7 seconds; then the next opens and its picture fades in. The others stay faded.
  - **Control.** Hovering or focusing pauses it. With reduced motion nothing advances on its own.
  - **Pictures, not videos.** The publish drawing, then the calendar and home screenshots (`src/assets/images/posters`). The video clips and `clip.tsx` are gone from the page.
  - **Replaced.** This replaces the stacking cards of 2026-11-11.
- **Agents section.** It replaces the AI panel (`agent-console.tsx` removed). "Agents" with a Soon badge, "Ask your AI assistant how last week went.", our own wording, a Start free button, and a drawn illustration (`agents-visual.tsx`): AgentiqSocial and an account joined to an assistant that reads post history and answers, over a "Top posts" strip. No third-party AI logos, because there is no such integration yet.
- **Features menu and page.** The header's "Product" link is now a "Features" menu (`features-menu.tsx`) with eight features in two columns, each opening its card on a new `/features` page (in the sitemap). Only Publish and Collaborate are built. The other six (Create, Insights, Community, AI Assistant, API, MCP) carry a Soon badge (`feature-catalog.ts`). The descriptions are our own words.
- **Larger text.**
  - Hero sub-text `text-xl md:text-[1.375rem]`.
  - Section sub-texts `text-xl`.
  - Feature card and comparison bodies `text-base`.
  - Steps and showcase bodies `text-lg`.

Why: The founder asked for these after looking at another scheduler's site, but as our own design and words, and without claiming features that do not exist yet.
Alternatives: One page per feature (later, when each feature is built). Keeping the clips (the founder asked for pictures).
Revisit when: A Soon feature ships (drop its badge in `feature-catalog.ts`), or a feature earns its own page.

## 2026-11-13 — The public site's colours: forest and leaf

Decision:
- **Palette.** The public site (marketing layout: home, pricing, tools, legal) uses the founder's palette.
  - Forest `#213130` for text and headings (light theme).
  - Leaf `#AFEB9B` buttons with forest text (9.8:1).
  - Aqua `#9FEAE2` (was `#a4f1e9`), lavender `#D4C2FF` and salmon `#FFB2A8` as card tints.
- **How it is applied.** `.site-theme` on the marketing layout overrides `--primary`, `--primary-foreground` and `--brand-ink` (so the Pro plan card is forest), plus `--foreground` and `--ring` in the light theme, and sets its own `color`, because text otherwise inherits the colour `body` already resolved. New tokens: `--brand-forest`, `--brand-leaf` (`text-forest`, `text-leaf`).
- **Footer.** Forest in both themes, with rounded top corners, leaf column headings and a leaf wordmark. This reverses the light grey footer of 2026-11-11.
- **Sections.** The three stacking cards are lavender, aqua and salmon. The brand tree's icons cycle through the same three. The Pro card's button is leaf.
- **Dashboard.** It keeps the product palette for now.

Why: The founder asked for this palette, modelled on a scheduler they like: dark green text and footer, light green buttons, pastel cards.
Alternatives: The whole app in the new palette (not asked for yet; the dashboard's ink buttons stay).
Revisit when: The dashboard should match, or a section needs a colour outside the palette.

## 2026-11-12 — Bluesky connects with an app password; "Post now" publishes

Decision:
- **Connecting Bluesky.** People enter their handle and an app password in the connect dialog. `POST /accounts/connect` signs in with Bluesky (`createSession`) before saving anything. It stores the account by its DID, with the app password encrypted (`src/server/crypto.ts`: AES-256-GCM, key id in front, keys from `ENCRYPTION_KEYS` and `ENCRYPTION_ACTIVE_KEY_ID`, rotation-ready) and the account's own server (PDS). It reads the public profile for the name and picture. A wrong handle or password answers `bluesky_login`. The other platforms answer `not_configured`, which the dialog shows as "coming soon".
- **"Post now".** It saves the post as due now, then `src/server/publish.ts` sends it.
  - **One send only.** The post is claimed first (scheduled to publishing), so it can never go out twice.
  - **Per account.** Each account gets its own result: published with the platform's link, or failed with a plain reason. A refused app password marks the account "needs reconnect".
  - **Post status.** The post ends as published, partial or failed.
- **What Bluesky posts carry.** Text and up to four photos. Photos are re-encoded below Bluesky's 1 MB limit (`fitImage`), and links and hashtags become clickable facets (UTF-8 byte offsets). Video to Bluesky fails with a clear message for now.
- **Tests.** The adapter (`src/server/providers/bluesky.ts`) and the encryption have unit tests.

Why: Bluesky needs no app review, so it proves the whole chain (upload, connect, publish) before Meta and YouTube, as the build order says (BACKEND.md §9). App passwords are Bluesky's supported way for third-party apps, and they can be revoked in Bluesky at any time.
Alternatives: Bluesky's OAuth (DPoP, client metadata: more moving parts, later if needed). Storing a session token instead of the app password (it expires; signing in per publish stays well within Bluesky's limits).
Revisit when: Scheduled posts need sending (Inngest, next), Bluesky video is added, or Meta and YouTube adapters join `publish.ts`.

## 2026-11-12 — Uploads go to Supabase Storage for now, not Cloudflare R2

Decision:
- **Storage.** Photos and videos live in a private Supabase Storage bucket (`MEDIA_BUCKET`, default `media`, created on first use) instead of Cloudflare R2 (BACKEND.md §10).
- **How an upload works.**
  1. `POST /media/uploads` checks the type and size, writes a `media_assets` row in `uploading` (`source = 'upload'`) and returns a signed upload URL.
  2. The browser PUTs the file straight to that URL, so the app never handles the bytes.
  3. `POST /media/uploads/:id/complete` checks that the file arrived, keeps its stored size, sets `ready` and returns the media with a signed preview URL.
- **Measurements.** The browser measures each file (`probeMedia`) and sends the width, height and duration, because this host cannot read videos. The platforms check again when posting.
- **Limits.** Files can be up to 50 MB (Supabase free plan). The composer says so before uploading ("larger than 50 MB…"), and the server refuses `too_large` and `unsupported_type`. The rules live in `src/lib/media.ts`, with tests.
- **Previews.** Posts sign their uploaded media from this bucket and their AI images from `ai-images`.

Why: The founder did not want to add a Cloudflare account and a card yet, and hosting files on Hostinger would send every upload through the app (120 s limit, files possibly wiped on redeploy, not suited to platforms fetching videos). Supabase is already connected and needs nothing new. It was checked live: a key-less browser PUT to a signed upload URL works.
Alternatives: Cloudflare R2 (the plan: bigger files, no download fees, needs an account and a card). Hostinger disk (rejected for the reasons above).
Revisit when: Customers need files over 50 MB, or storage passes about 1 GB (the free plan's total). Then move to Supabase Pro or R2 by changing `src/server/media/storage.ts` and `MAX_UPLOAD_BYTES`. Also add a clean-up job: files of deleted workspaces stay in the bucket.

## 2026-11-12 — No highlights row; larger section headings with room around them

Decision:
- **Highlights row removed.** The four highlights under the hero (Write once, See it first, Post on time, Every brand in one place) are gone, with their texts. The hero now ends with its own bottom padding.
- **Larger headings.** Section headings are `text-4xl md:text-5xl lg:text-6xl` (60 px on laptops), with `pt-6 pb-2 md:pt-10 md:pb-4` around them. The features and brands headings sit on a wider `max-w-4xl` line, with their sub-text kept at `max-w-2xl`.
- **Line breaks.** "Publish, schedule and manage in one place." no longer forces one line; it fits on one line at 1366 px.

Checked at 1366, 1024 and 390 px wide: no heading overflows.
Why: The founder asked for both.
Alternatives: None considered.
Revisit when: Headings crowd a new section.

## 2026-11-11 — Larger homepage headings

Decision: Homepage headings are one step larger.
- **Section headings:** `text-4xl md:text-5xl`, up from `text-3xl md:text-4xl`.
- **Hero headline:** up to 80 px, on a `max-w-6xl` line so it still breaks in two.
- **Titles inside cards:** one step larger (highlights, stacking cards, the band's showcase, feature cards and steps, the comparison, pricing cards, brand labels).
- **Line breaks:** "Publish, schedule and manage in one place." stays on one line only from `xl` up, because 48 px does not fit on one line on smaller laptops.

Checked at 1366, 1024 and 390 px wide: no heading overflows.
Why: The founder asked for bigger headings and component titles on the homepage.
Alternatives: Larger headings across the dashboard and sign-in pages too (not asked for).
Revisit when: Headings feel crowded on a new section.

## 2026-11-11 — 7-day trial; theme button only on the site and in the dashboard; lighter auth headings

Decision:
- **7-day trial.** The free trial is 7 days, not 14. `TRIAL_DAYS` in `plans.ts` drives every text (hero note, pricing, sign-up, terms). The signup function sets the trial end in the database, so `supabase/migrations/20261111120000_seven_day_trial.sql` replaces it with the same body and `interval '7 days'`. Trials that already started keep their end date.
- **Theme button.** The moon/sun button is on the public site and in the dashboard header (next to search), but not on sign-in, sign-up, password pages or onboarding. Those still follow the saved theme.
- **Auth headings.** The sign-in, sign-up, password and "check your inbox" headings are larger and light: `text-3xl font-light`, up from `text-2xl font-semibold`.

Why: The founder asked for all three.
Alternatives: Changing only the texts to 7 days (rejected: new accounts would still get 14 days from the database).
Revisit when: Trial conversion data suggests a different length. Change `TRIAL_DAYS` and the signup function together.

## 2026-11-11 — The business wall is gone; borderless cards in the band

Decision:
- **Business wall removed.** The "Built for every kind of business" section is gone (`business-wall.tsx`), with its fitness, real-estate and restaurant photos. The phone previews keep the bakery photo, and the texts they and the brand tree use moved to `marketing.home.businesses`.
- **Reviews and spacing.** `marquee.tsx` stays for the reviews section. The brand tree now spaces itself below, not above, because Pricing follows it directly.
- **Band cards.** The features band's cards ("Video pre-flight checks" and so on, and the three steps) have no border: white on the `#F7F7F7` band.

Why: The founder asked for both.
Alternatives: None considered.
Revisit when: Real customer posts can be shown (with permission). A wall or slider of them could come back then.

## 2026-11-11 — English only; no dark sections in the light theme; four highlights under the hero

Decision:
- **English only.** The Spanish, Portuguese, French, German and Arabic messages are deleted, and `routing.locales` is `["en"]`. Gone with them: the language button (site, app, sign-in and onboarding headers), the language setting in Preferences, and "The app in 6 languages" from the plans. The landing pill "6 Languages" became "0 Cards needed to start", and the "Built for every language" card became "Built for every time zone".
- **Addresses.** URLs keep the `/en` prefix, because `/en/privacy`, `/en/terms` and `/en/data-deletion` are registered with Meta, and Supabase's redirect list uses the site address. `next.config.ts` sends the old language paths (`/de/...`, `/ar/...`, and so on) to `/en/...` with a permanent redirect. Texts still live in `messages/en.json` (CLAUDE.md rule 7), and right-to-left support stays in place.
- **Light sections.** The landing page's features band and the footer use `#F7F7F7` with ink text in the light theme (`--band` and `--footer`). The dark theme keeps them near black.
- **Under the hero.** Four highlights with icons and hairlines between them (Write once, See it first, Post on time, Every brand in one place) replace the founding-offer numbers.
- **Simpler wording.** The features band reads "Check your post before you share it." and "Preview every app before you post".

Why: The founder wants one language in simple English, a light theme with no black sections, and different content under the hero. Percentages like "92% time savings" were declined because there is no data behind them.
Alternatives: Keeping the other languages with a note (not wanted). Dropping the `/en` prefix (it would break links already given to Meta and others).
Revisit when: A second language is needed. Add its messages file and locale, remove its redirect, and bring back the language button.

## 2026-11-11 — Landing: offer numbers instead of the video, a comparison, brands, sliding rows

Decision:
- **Hero.** The product video under the hero is gone. In its place is a row of the founding offer's numbers, all from `plans.ts`: from $15 a month, 14 days free, 100 founding spots, 24 months at the founding price.
- **"Post faster without losing quality."** The section has no button now.
- **"Why posting the usual way falls short".** New, after it (`comparison.tsx`): two cards, "Posting by hand" and "Basic schedulers", with three ✕ points each, in our own words and naming no product.
- **"Every brand in its own workspace".** New, before the business wall (`brand-tree.tsx`): the logo with lines branching to six example businesses, and no count of brands.
- **Business wall.** It is now one row that slides on its own (`marquee.tsx`; it stops on hover or focus, and stands still and scrolls by hand with reduced motion). The cards keep their own height, centred. `parallax-columns.tsx` is removed.
- **Reviews.** They have their own sliding section (`customer-reviews.tsx`), which stays hidden while `testimonials.ts` is empty.

Why: The founder asked for sections like a competitor's (results bars, a "why others fail" comparison, a brand tree, auto-moving post and review sliders) and for stats in place of the video. Each was built in AgentiqSocial's own words and with true facts only. Declined: a "results in 6 months" block, customer counts ("10K+ posts", "100% retention") and reviews in invented words, because there are no customers yet. Fake reviews and results are unlawful (FTC rule on fake reviews, EU consumer law), break Google's spam policies, and would be seen by the Meta and Lemon Squeezy reviewers. The founder asked for invented reviews anyway; that was declined.
Alternatives: Product facts in the hero (6 platforms, 1 click…; they repeat the pills further down). A "be one of our first 100 customers" card where the reviews will go.
Revisit when: There are real customers. Add their reviews (with permission) to `testimonials.ts`, and real results or customer numbers only from real data.

## 2026-11-11 — Feature order: posting first, then features without AI, then AI

Decision: The founder's feature list goes into `doc/UPCOMING-FEATURES.md`, not onto the website. It covers the post composer extras, publishing, performance insights and brand management, each marked "in the app today", "after posting works (no AI)" or "AI". Work goes in that order: posting to every platform end to end first, then analytics, goals and brand tools, then AI (brand voice, AI images and video, hashtag suggestions, Magic create). A feature appears on the site or in a Product menu only once it works.
Why: The site must claim only what the product does, because Meta, Google, TikTok and Lemon Squeezy reviewers read it. Publishing is what customers pay for first.
Alternatives: A Product menu now with "Soon" badges on unbuilt features (not chosen; it can come once features ship).
Revisit when: A stage is finished; move its features to "in the app today".

## 2026-11-11 — Landing: centre picture with true numbers; stacking cards

Decision: A new section after "Publish, schedule and manage" reads "Post faster without losing quality.": the logo in the middle with the six platforms on a slowly turning ring (`hub-visual.tsx`; still with reduced motion), three pills each side with true numbers taken from the code (6 platforms, 1 click, 5 video checks, 14 days free, 100% original kept, 6 languages), and a "Start free" button. On phones the pills wrap under the picture. The section is clipped sideways (`overflow-x-clip`), because the turning ring's empty corners widened the page on phones. The three "Publish, schedule and manage" cards stack: from lg up, on screens at least 38rem (608 px) tall, so a laptop browser window qualifies, each card sticks under the header, a step lower than the one before, and the next slides over it. Phones and short screens scroll them normally. The landing cards have 16 px corners (`rounded-2xl`, were 28 px), as do the hero frame and the pricing cards, with no shadow while stacked. The site header has no "Log in" link: it is in the phone menu, the footer and on the sign-up page.
Why: The founder asked for a centre-picture section like one on another site, built from AgentiqSocial's own product (no stock or copied image), for the three cards to move with the scroll, then for less rounded cards without shadows and no "Log in" in the header.
Alternatives: A stock photo in the centre. A browser-window frame or a pinned picture with changing text for the three cards (not chosen).
Revisit when: The product has real customer numbers worth showing, or the stack feels slow on long pages.

## 2026-11-11 — Light theme by default; a moon/sun button

Decision: The theme is light unless the person picks dark, or picks "Match system" on a dark system (`src/components/theme.tsx`; the pre-paint script follows the same rule). The public site, sign-in and onboarding headers have one button instead of the three-way menu: a moon switches to dark, a sun back to light, and the choice is saved. The user menu and Preferences keep Light, Dark and "Match system".
Why: The founder wants light first and a one-click switch to dark.
Alternatives: Following the system by default (the old behaviour). Keeping the three-way menu in the header.
Revisit when: Visitors ask for the system setting to be the default.

## 2026-11-11 — New prices; yearly prices set per plan

Decision: Solo $15 a month or $150 a year, Pro $25 or $270, Agency $60 or $680, Scale $130 or $1,480 (Free stays $0). `priceYearly` in `src/lib/billing/plans.ts` holds each yearly price instead of "ten times monthly", and must equal the Lemon Squeezy variants. The yearly saving therefore differs by plan (Solo 17%, Pro 10%, Agency 6%, Scale 5%): the toggle says "Save up to 17%" (`MAX_YEARLY_SAVING`), each yearly card on the landing page shows its own saving, and the pricing page's description says "saves up to 17%". The old "2 months free" label is gone.
Why: The founder set these prices in the Lemon Squeezy store and chose them over the earlier hypothesis ($12, $24, $59, $119; yearly = two months free). The site must show what checkout charges.
Alternatives: Keeping the old prices and editing the Lemon Squeezy variants instead (declined by the founder). Keeping a uniform "2 months free" (no longer true for Pro, Agency and Scale).
Revisit when: Buyer interviews or conversion data say otherwise; change `plans.ts` and the Lemon Squeezy variants together.

## 2026-11-11 — Google sign-in runs on our own domain

Decision: The app does Google's OAuth code flow itself and hands the ID token to Supabase (`signInWithIdToken`) instead of sending people through Supabase's `/auth/v1/authorize`. `/api/v1/auth/google` builds Google's sign-in URL (PKCE S256, a state value, the SHA-256 of a nonce) and keeps the attempt in a ten-minute `ps_google` cookie limited to the Google routes. `/api/v1/auth/google/callback` checks the state, swaps the code for the ID token (with the client secret) and passes the token and the raw nonce to Supabase, which checks the signature, the audience and the nonce, then signs the person in or creates their account. The OAuth client is the one Supabase's Google provider already lists (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, server only). `/api/v1/auth/callback` stays for Supabase's own email links. Helpers and tests: `src/server/google-oauth.ts`.
Why: With Supabase's redirect, Google's account chooser said "to continue to bzmntxjjdrvvtelqznaf.supabase.co": Google shows the redirect host for apps whose branding is not verified, and Supabase's docs warn that the project address hurts trust. Now it shows agentiqsocial.com, and "AgentiqSocial" once Google verifies the branding.
Alternatives: A Supabase custom domain such as auth.agentiqsocial.com (no code, but it needs a paid Supabase plan and the custom domain add-on). Branding verification alone (free, but the redirect would still be on supabase.co).
Revisit when: The project moves to a Supabase custom domain, or Supabase can show the site's own domain on Google's screens without one.

## 2026-11-10 — The legal pages and the footer name the operator

Decision: AgentiqSocial is the trading name of Abdul Basit, a sole proprietor (FBR taxpayer registration as an individual, activity "Business") based in Sahiwal, Pakistan. `OPERATOR_NAME` and `OPERATOR_PLACE` in `src/config/site.ts` hold this. The terms' opening line and the privacy policy's "Who we are" say so, and the footer has a small line under the copyright ("AgentiqSocial is a trading name of Abdul Basit.", key `marketing.footer.operator`, all six locales). The rest of the site stays brand-only. The street address is left off the site.
Why: Meta's business verification checks that the website shows the legal name on the submitted document, and the registration is in the founder's own name, not "AgentiqSocial". The first submission (2026-11-10) was refused with the name only on the legal pages: "your legal business name must be present on the website", so it has to be on the homepage too. It also settles the 2026-11-02 entry's "no legal entity yet".
Alternatives: The name inside the copyright sentence ("© AgentiqSocial, operated by Abdul Basit"; dropped: it reads as part of the brand line; a separate, smaller "trading name" line is the usual form). The legal pages only (refused by Meta). Registering "AgentiqSocial" as a company with SECP first (costs fees and time; not needed to start). Publishing the full street address (left off: it is a home address; add it if a reviewer asks).
Revisit when: A company is registered (put its name in), or a platform review asks for the street address on the site.

## 2026-11-05 — Production builds use webpack; Tailwind runs through PostCSS

Decision: `npm run build` is `next build --webpack`; `npm run dev` stays on Turbopack. Tailwind is a PostCSS plugin (`postcss.config.mjs`, `@tailwindcss/postcss`) instead of the Turbopack-only `@tailwindcss/turbopack` loader, which is removed with its `turbopack.rules` entry in `next.config.ts`, so both bundlers compile the same CSS.
Builds also use one worker (`experimental.cpus: 1` in `next.config.ts`).
Why: The first Hostinger build failed in `app/globals.css`: Turbopack runs CSS loaders in a separate Node process and the build host ended it before Turbopack could connect ("node process exited before we could connect to it"). webpack runs PostCSS in the build process itself. The webpack build was checked locally: same output, same rendering. The second build then crashed collecting page data: Hostinger's build machine reports 64 cores, so Next.js started 63 workers, each loading SWC with a thread per core, past the plan's thread limit ("OS can't spawn worker thread"). `TOKIO_WORKER_THREADS` does not limit SWC's threads (measured), so the worker count is capped instead. One worker builds the 285 static pages in about a minute locally.
Alternatives: Keeping Turbopack for builds and asking Hostinger to allow the worker process (not in our control). Building elsewhere and uploading the output (rejected for now: Hostinger rebuilds on every push, and a second pipeline is more to maintain).
Revisit when: The app moves to a host whose builds allow Turbopack's worker processes (Vercel, a VPS), or Turbopack stops needing them.

## 2026-11-03 — The founder's logo across the product

Decision: The founder's logo (green and orange figures over an oval) replaces the placeholder spark everywhere. The original (2000 × 2000, a mark on a flat off-white square) is kept in `src/assets/images/brand/logo-original.png`; from it, with the background made transparent and the mark trimmed: `logo-mark.png` (256 px tall) in the shared `Logo` component (site header and menu, footer, app sidebar and mobile nav, sign-in, onboarding, 404), `app/icon.png` (512 px) and `app/favicon.ico` (16/32/48 px) for browser tabs, `app/apple-icon.png` (180 px on white) for home screens, and the product video's intro and closing scene (copied by its `npm run sync`). The old `app/icon.svg` and create-next-app's `favicon.ico` are gone. The publish / schedule / manage rows lost their icon tiles, their heading sits on one line from the md breakpoint, and the line under it was removed.
Why: Founder's direction: their logo wherever the product shows one.
Alternatives: Using the 2000 px file as it is (rejected: an off-white square around the mark, and 145 KB for a 28 px logo).
Revisit when: A designer delivers a wordmark or an SVG of the logo (swap the files in `src/assets/images/brand` and the icons in `app/`).

## 2026-11-03 — DM Sans everywhere, lighter headings; images in src/assets/images

Decision: The whole product (public site and app, text and headings) uses DM Sans, loaded once in `app/[locale]/layout.tsx` (`--font-dm-sans`); Inter and Plus Jakarta Sans are gone, with the marketing-only font loader (`fonts.ts`, `site-fonts-root.tsx`) and `tightStops()`, which only fixed Plus Jakarta Sans's wide full stop. Arabic still falls through to Noto Sans Arabic; code stays in JetBrains Mono. Headings are lighter and smaller: public-site display headlines semibold (600, was 700), section titles one size down (`text-3xl md:text-4xl`), `font-heading` titles semibold (was bold or extra bold). The features, the four details and "How it works" are one dark panel (`bg-ink`, white text) running full width with square edges, with the app’s own composer previews (`PostPreview`) of one sample post as Instagram Reels, TikTok and YouTube Shorts, each marked ready, with each app’s top bar (`preview-phones.tsx`), instead of a video or screenshot; the hero recording lost its lavender frame. The footer is black (`--footer` #0b0b0c), the periwinkle rows are #f0f1fe, and the FAQ gained "Is it safe to connect my social accounts?" and "Can I cancel at any time?". Images live in `src/assets/images/{landing,posters,screens}` (imported, so Next optimises them), videos in `public/videos`; the five unused create-next-app SVGs were deleted. The clip scripts and the video package read and write the new folders. The product video uses DM Sans too.
Why: Founder's direction: one sans-serif face across the application, less heavy headings, and a tidy assets folder.
Alternatives: Keeping a separate headline face for the site (rejected by the founder). Moving images to `public/` (rejected: imported images get sizes, blur placeholders and hashed URLs).
Revisit when: A brand designer delivers a type system (FRONTEND.md §19).

## 2026-11-03 — Landing v2: periwinkle rows, business wall, four-plan pricing, centred FAQ

Decision: The publish / schedule / manage section became three rows on `--card-periwinkle` (#f0f1fe, first #e6e8ff; #1e2240 in the dark theme), words on one side and a picture on the other: a drawing of one post fanning out to every platform (`publish-visual.tsx`), then the calendar and home clips, which left the feature cards below. A wall of businesses (`business-wall.tsx`) sits between "How it works" and Pricing: eight cards (sample posts and uses for a bakery, an agency, a shop…) in four columns that drift against the scroll (`parallax-columns.tsx`: down the page moves them up, back up moves them down; side by side only, never with reduced motion). Real customer reviews (text and name, no stars, also marked up as schema.org `Review`) go in `testimonials.ts` and replace the "use" cards, Creator first; the list is empty until customers give reviews. The free tools card left the landing page (the tools stay in the header and footer), and so did the moving facts row ("The details other schedulers skip"), with its `Marquee` component. The four sample-post cards use Unsplash License photos (free for commercial use; credits in `src/assets/images/landing/CREDITS.md`), and the closing "Your next post can look exactly how you made it" panel is gone, so the page ends on the FAQ. Pricing shows the four paid plans as cards (Pro on ink), yearly first: the monthly price struck through and the yearly price per month, the bill per year, and the same feature rows on every card with a dash where a plan lacks one; Free is a line under the cards. The FAQ is centred (max-w-7xl) with dividers instead of tinted cards, light question text and a plain plus icon, titled "{product} platform FAQs". The Pricing page now sits on the same 1440 px line as the landing page, header and footer (it was 1200 px).
Why: Founder's direction, from reference designs (Hostinger's testimonial wall and plan cards). Quotes are not invented: there are no customers yet, and made-up testimonials are unlawful in most markets (the FTC's 2024 rule among them) and would sit in front of Meta, TikTok and Google reviewers. The struck price is real (monthly billing costs it), so the discount is real.
Alternatives: Placeholder quotes with stock photos (rejected: fake reviews). Five plan cards (rejected: too narrow at 1440 px; the Pricing page compares all five). Keeping the calendar and home cards in the features grid (rejected: the same clips twice on one page).
Revisit when: Beta customers give quotes (add them to `testimonials.ts` with their consent), or a plan or the yearly discount changes (`plans.ts` drives the cards).

## 2026-11-03 — Product video in its own package (Remotion); landing copy for publish, schedule, manage

Decision: A product video lives in `video/` at the repo root, a separate npm package with Remotion 4 (`remotion`, `@remotion/cli`, `@remotion/transitions`, `@remotion/google-fonts`), React and TypeScript; the app gains no dependency. `npm run sync` copies the landing clips and the platform logos from the app, and `npm run render` writes a 56-second 1080p MP4 to `video/out/` (ignored by git). The landing page drops "fix video problems", "teams in many countries" and "AI writing and images are coming soon" from the hero, meta description, footer and FAQ, and gains a "core" section under the hero: post to every platform at once, schedule in advance, manage content in one place, with the platform names from the catalogue.
Why: Founder's direction: simpler, search-friendly landing copy built around publishing, scheduling and managing, and a proper product video. Remotion renders React, which this team already writes, reuses the real screen recordings and brand fonts, and re-renders when the screens change.
Alternatives: A video editor by hand (rejected: has to be redone by hand after every UI change). FFmpeg scripts only (rejected: no animated titles without a lot of filter code). Adding Remotion to the app's package (rejected: hundreds of megabytes the app never uses).
Revisit when: The company grows past 3 people (Remotion company licence), the clips are re-recorded, or a voice-over or music is wanted.

## 2026-11-02 — Legal pages in English, labelled in other languages

Decision: `/privacy`, `/terms` and `/data-deletion` are live. Their text is English only and lives in `src/features/legal/` (one typed file per page, links written as `[label](href)`), not in `messages/`. The title, the "last updated" date, the table-of-contents label and a notice ("The English version is the one that applies") are translated, and the English parts carry `lang="en"` (and `dir="ltr"`, so Arabic stays readable). The operator is the brand name "AgentiqSocial" (no legal entity yet), contact `support@agentiqsocial.com` (`SUPPORT_EMAIL`), governing law Pakistan. The pages carry the statements platform reviews look for (YouTube Terms of Service, Google Privacy Policy, Google's permissions page, the Limited Use sentence; Meta's data deletion instructions), and a test keeps them there. The footer links them beside the copyright line; the sitemap lists them.
Why: Meta, TikTok, Google and LinkedIn ask for these URLs when an app is created and check them in review. TEST.md I18N-12 allows legal pages that are "localised or clearly labelled"; machine-translated legal text could change its meaning.
Alternatives: Translating the full text into all six languages now (rejected until a professional translation; I18N-12 needs a native review anyway). Keeping the text in `messages/` (rejected: `i18n:check` would demand every locale, and long legal text does not belong in UI strings).
Revisit when: The business is registered (put the legal name and address in), a refund policy, cookie notice, DPA or sub-processor list is written (PROJECTFLOW launch checklist), a provider is added or changed (update the sharing list), a "Delete account" button ships (update the deletion steps), or a lawyer reviews the text.

## 2026-11-01 — Development and production mode on the real backend; sample data only on request

Decision: The app always runs on the real backend and database. Two modes differ only in how sign-up and password-reset codes travel: **development** (`npm run dev`, `DEV_MODE` in `src/config/site.ts`) asks Supabase's admin API to make the code without sending email (`auth.admin.generateLink`), prints it in the terminal and returns it as `dev: { code }`, and the page shows it already filled in, so any address can be tested; **production** (every production build, or `NEXT_PUBLIC_APP_MODE=production` locally) emails it through Supabase's SMTP (Resend). A production build can never be in development mode (`NODE_ENV`), so codes never reach real users. The in-browser sample data (mock API) is now opt-in with `NEXT_PUBLIC_MOCK_API=true`, for the landing recordings and demos; an empty `NEXT_PUBLIC_API_URL` now means "this app" instead of "mock". `npm run check:api` drives 57 end-to-end checks over HTTP against the dev server with two throwaway accounts, deleted afterwards. `requireMember` asks Auth (`getUser`) instead of checking the token locally, still alongside the membership query, so signed-out sessions and sessions ended by a password reset stop working at once (TEST.md AUTH-10); local checks accepted them until the token expired. `PATCH /me` checks the session before reading the body.
Why: Founder's direction: a development mode to test like a real application without email or other requirements, a production mode with real email, and every backend edge case checked.
Alternatives: Auto-confirming accounts in development (rejected: it would skip the flow being tested). A local mail catcher (rejected: the hosted Supabase sends the email, not this app). Keeping the mock as the default (rejected: it hid real backend behaviour).
Revisit when: Staging gets its own Supabase project (test accounts would then stay out of production data), or Playwright browser tests are added.

## 2026-10-28 — AI is "Coming soon"; sign-up and password reset use emailed codes

Decision: AI ships switched off. `NEXT_PUBLIC_AI_ENABLED` (`AI_ENABLED` in `src/config/site.ts`, default off) decides it in one place: while off, AI Studio shows a coming-soon page, the composer's AI tab, "Write with AI" and "AI image" say "Soon", plan cards mark AI credits "Soon", Billing hides AI usage, the landing page says AI writing and images are coming soon, and every AI route answers 503 `not_configured` (`requireAi()`), so nothing runs or is charged. All AI code stays. Sign-up confirmation and password reset now email a 6-to-10-digit code that people type into our pages, replacing the links (`/auth/confirm` is gone). On top of Supabase's per-IP limit, an address gets 5 wrong codes, then a 15-minute lock that a new code lifts (`auth_code_attempts`, server only). After a reset every session ends. A refused new password (same as the old one) can be retried without a second code, because the right code already signed the person in.
Why: Founder's direction: AI comes later; the login must work for real now, with codes for verification and password reset. Codes also cannot be used up by mail scanners that open links, and work when the email is read on another device.
Alternatives: Removing the AI code until launch (rejected: "keep it as it is"). Links with a confirm button (the previous design; rejected by the founder). A fixed 6-digit input (rejected: the hosted project's code length is a dashboard setting).
Revisit when: AI keys and pricing are ready (set `NEXT_PUBLIC_AI_ENABLED=true`), or MFA is added.

## 2026-10-28 — Name AgentiqSocial; AI Studio with monthly AI credits; faster API

Decision: The product is **AgentiqSocial** on agentiqsocial.com, set in `src/config/site.ts` (`PRODUCT_NAME`, `PRODUCT_DOMAIN`); the logo mark is an AI spark on the ink tile (still a placeholder for a designer). The dashboard gets **AI Studio** (`/dashboard/ai-studio`, in the sidebar under New post): describe an image, pick a style, a platform size (1:1, 4:5, 9:16, 16:9) and a quality, generate 1 to 4 images, then select any of them and "Create post" opens the composer with them attached (`?ai=<ids>`); the composer also has an "AI image" picker beside "Add media". Every plan gets **AI credits per calendar month (UTC)**, in `plans.ts`: Free 25, Solo 300, Pro 800, Agency 2,000, Scale 4,000; a caption costs 1, a standard image 5, an HD image 20 (`AI_COSTS`). Credits are reserved in Postgres before the model runs (`reserve_ai_credits`, row lock) and refunded when it fails (`settle_ai_generation`); bonus credits (`subscriptions.ai_bonus_credits`, for future top-up packs) never expire and are spent after the month's. Images come from OpenAI (`gpt-image-1`) or Gemini (`gemini-2.5-flash-image`), chosen by `AI_IMAGE_PROVIDER`; captions likewise by `AI_TEXT_PROVIDER`. Images are cropped to the exact ratio with sharp and kept in a private Supabase Storage bucket behind signed URLs. Speed: `requireMember` verifies the token locally with `getClaims()` while the membership query runs; `/auth/session` runs Auth's check and its two reads side by side; post lists filter by status, date and text in SQL; read policies use `my_workspace_ids()` once per query instead of `is_member()` per row; missing foreign-key indexes added.
Why: Founder bought the domain and wants AI in the product to compete (agentic AI is where competitors are going); AI costs real money per call, so it has to be metered by plan. One credit is about US$0.0125 of model cost, so each plan's worst-case AI spend stays well under its price.
Alternatives: Unlimited AI on paid plans (rejected: one heavy user could cost more than their plan). Per-image pricing outside the plans (rejected: harder to sell; top-up packs cover heavy users). Storing images on R2 now (deferred: R2 is not set up; only `src/server/ai/storage.ts` changes when it is). Generating inside the composer (deferred: the library keeps images reusable across posts; the picker brings them in).
Revisit when: Real usage data exists (tune credits and costs in `plans.ts`), Lemon Squeezy top-up products are created (write `ai_bonus_credits` from the webhook), or a brand designer delivers the logo.

## 2026-10-26 — Wider, flat landing; full-width navbar and footer

Decision: The landing page's content width grows from 1200 px to 1440 px (same gutters), and the plan cards use the full width too. The navbar is a full-width bar at the top of the window (64 px, blurred white) that shows a hairline only once the page scrolls under it; the footer is a full-width deep green block. Both put their content on the landing's 1440 px line. Cards and media on the landing page have no borders, shadows or white frames: coloured panels stand on their fill, white cards became light grey (`bg-muted`) or sit on the steps band, and the clips and the Arabic screenshot show without the browser frame (`BrowserFrame` is removed). The agent console lost its turning glow edge, and the AI section's mesh now sits on pale lavender so the panel still shows its edge. `PlanCard` takes `flat` for this; Pricing and Billing keep the ring and shadow.
Why: Founder's direction: wider components, a full-width navbar and footer, no border or shadow on cards, and no border around the images.
Alternatives: A wider floating navbar (rejected: the founder asked for full length). Keeping the browser frame without its border (rejected: it is still a frame around the image). Widening Pricing and the tool pages as well (not asked; they stay at 1200 px and 1152 px).
Revisit when: A brand designer sets the final layout.

## 2026-10-26 — New hero headline, plain hero, deep green footer

Decision: The hero headline is "Post to all your social accounts from one dashboard", with "Built for startups, agencies and teams in many countries. Preview every platform, fix video problems before you publish, and let AI write the first draft." It replaces "Post once. Look right everywhere. Keep every pixel." The hero's gradient glow and dot grid are gone (plain page background) and the clip's frame is solid lavender in the white card frame. The footer panel is `#213130` (`--footer`, same in both themes).
Why: Founder asked to drop the gradient and the three lines, offered three headline styles (Buffer's "Your social media workspace", Postiz's "Run your social media on autopilot with AI agents", and "Post to all your social accounts from one dashboard") and asked for the one best; and asked for this footer colour.
Alternatives: The AI-agents headline (rejected for now: agents are not built and it claimed 30+ networks; revisit when MCP ships). The workspace headline (rejected: "plugs into your favorite tools" is not true yet).
Revisit when: AI agents ship (the AI headline becomes honest), or tool integrations exist.

## 2026-10-26 — Landing in the founder's five colours, an AI section, three plans on the landing

Decision: The landing page uses the founder's palette (#A4F1E9 aqua, #FFD88A yellow, #FAC3FF pink, #FFB2A8 salmon, #D4C2FF lavender, tokens `--card-*` with deep versions in dark), in Buffer-style framed cards: the facts row, the four feature cards, the hero's video frame, the AI section's mesh and the icon chips. A new section presents AI: the composer's AI assistant (built) and AI agents through the API and MCP server (planned, Phase 10, marked "Coming soon"), with a mock-up console of an agent's tool calls that fills in when scrolled to, and an FAQ answer about AI. The landing shows three plans (Free, Pro, Agency) and every plan card is short: limits, then the five main features on the first card and "Everything in <previous>, plus" with the additions on the others; the comparison table on Pricing keeps the full list. The trial fact left the facts row (it is in the hero and pricing).
Why: Founder's direction: use these colours, show only three packages ("it looks unprofessional, don't add too much"), and make the page feel AI-native and modern.
Alternatives: Cutting the product to three plans (not done: `plans.ts`, billing and checkout use five; the founder can still decide). Showing the agent console as if agents worked today (rejected: MCP is not built, so it says "Coming soon").
Revisit when: The MCP server ships (drop "Coming soon"), or the plan line-up changes.

## 2026-10-26 — Lime retired; floating navbar, panel footer, no labels above headings, fuller plan cards

Decision: Lime (#DEFF00) is gone from the product: the hero's marker on "pixel", the logo's check (now sky to mint on the ink tile, in the app too), the "New" pill, the announcement strip (now the light green highlight), the pricing badge, the tool pages' call to action and step numbers, the `accent` button and the token itself. The public navbar is a floating rounded bar; the footer is a rounded panel with bold column headings, the platform marks and the product name set large along its bottom edge. Small labels above headings are removed on public pages (hero pill, section labels, feature-card labels, the Pricing and tool eyebrows), and the facts row loses its visible "Pause animation" button: hover or tap holds it, and a pause button appears on keyboard focus (WCAG 2.2.2), with reduced motion still standing it still. Plan cards now list everything a plan includes, from `plans.ts`: the limits, then `EVERY_PLAN` (checks, previews, one-click fixes, a caption per platform, calendar and queue, any time zone, tags, every app language) and the plan's own features in bold; the comparison table gained the same rows.
Why: Founder's direction: keep the new colour scheme but drop #DEFF00, redesign the navbar and footer, remove the small text above headings, and make each subscription's value obvious on the cards.
Alternatives: Keep a visible pause button for the facts row (rejected by the founder; the focus-only button keeps it accessible). An "Everything in Pro, plus" list (rejected: the founder wants every card to show how much it includes).
Revisit when: A brand designer sets the final palette and logo, or plan features become gated in code (then `plans.ts` must stay the single source).

## 2026-10-26 — Light landing page with product clips; Plus Jakarta Sans and DM Sans on the public site

Decision: The landing page is rebuilt light, after the postiz reference: a centred hero (pill, bold three-line headline, pill buttons, the six platform logos), a moving row of product facts, and feature cards that each play a short screen recording of the real app while in view. The hero clip shows a post being previewed, fixed to 9:16 and scheduled; the cards show the previews, calendar, home screen and carousel splitter. Clips are muted MP4s (H.264) with a smaller copy for phones and a first-frame poster; nothing downloads until a clip is a third on screen, and reduced motion or data saving leave them on the poster with a play button. Every clip and the moving row has a pause control (WCAG 2.2.2). The public pages (landing, pricing, tools) use Plus Jakarta Sans for headlines (700, tight) and DM Sans for text; the app keeps Inter and Arabic keeps Noto Sans Arabic. The coral band is gone. Clips are made by `scripts/clips` (recorded in the sample workspace, see its README). This replaces the hero screenshot from the 2026-10-25 entry except on Arabic pages, which keep the right-to-left screenshot because the clips are in English.
Why: Founder's direction: videos of the app that play when scrolled to, a light landing page like the references, and their font. Facts replace postiz's customer cards because we have no customers to quote (no invented numbers or testimonials).
Alternatives: Animated GIFs or a third-party video host (rejected: larger files or another service). Autoplay regardless of position (rejected: wastes data off screen). Chrome's MediaRecorder for encoding (rejected: its MP4s reported the wrong duration; a small MP4 writer over WebCodecs is used instead). Plus Jakarta Sans in the app too (not asked for; kept to the public pages).
Revisit when: Screens shown in the clips change (re-record), Arabic clips are worth recording, or a real customer quote or logo can replace a fact.

## 2026-10-25 — Free tools at /tools/<slug>, listed in the footer

Decision: Seven public tools, each a page at `/tools/<slug>` that works without an account and never uploads anything: Instagram carousel splitter, Instagram grid maker, video checker, LinkedIn text formatter, YouTube title checker, and Instagram and TikTok username checkers, plus an index at `/tools`. One registry (`src/features/tools/registry.ts`) feeds the footer, the index, the sitemap and "More free tools". Every tool shares one page shell (answer-first header, steps, questions, related tools, WebApplication and BreadcrumbList JSON-LD). Image tools export 1080 px JPEGs and a ZIP from a small store-only writer (no new dependency). The footer now has a brand column and a Free tools column, like the post-bridge reference.
Why: Founder's direction (post-bridge footer and `/tools/instagram-carousel-splitter`). SEO-AEO.md lists `/tools/[tool]` as a page family.
Alternatives: Username *availability* checks (rejected: they need scraping, CLAUDE.md rule 11; the checkers apply each platform's rules and link to the profile instead). TikTok caption generator (waits for the AI backend). X timeline blocker (a browser extension, not a page).
Revisit when: The platform facts marked VERIFY are checked (Instagram's 3:4 profile grid and 10-photo API carousel, both username rule sets, YouTube's 100-character title and the ban on `<` `>`), or the AI backend makes a caption tool possible.

## 2026-10-25 — Landing hero shows the real product

Decision: The marketing hero shows screenshots of the dashboard (sample workspace), light and dark, with a right-to-left Arabic version for `ar`, in a browser frame on a light green panel. They replace the illustrated `ProductMock`. Files live in `src/assets/screens/`. Re-capture them when the dashboard changes.
Why: Founder: the page "looks AI" and needs a visual of the product. FRONTEND.md §1 always called for a product screenshot.
Alternatives: A drawn illustration (rejected, it read as generic). Screenshots in all six languages (later; the other languages show English for now).
Revisit when: The dashboard changes visibly, or a localized screenshot set is worth the extra weight.

## 2026-10-25 — Dashboard: light green highlight, sky icons, black New post, compact home

Decision: The light green `--highlight` (#E6F4EA; #12301F in dark) marks the current page, selections, date badges and plan badges. Sky (#ADDAFF) is for icon chips and the workspace mark. New post is the standard primary (ink with white text; sky on dark). Home: a slim title row replaces the dark hero card, stat cards gain icon chips and a change against the previous 7 days, and "Needs attention" is one compact row per post. Cards use `card-surface` (16 px radius, hairline border, soft shadow). Charts and meters keep their earlier colours. Coral stays out of the dashboard; the marketing band and the unread badge keep it.
Why: Founder's direction (Sociafy reference). A coral accent was tried and rejected the same day ("remove #FF5237, use mostly #E6F4EA, New post black, icons sky").
Alternatives: A coral and peach accent (rejected by the founder). #E6F4EA is also the success status background; status chips always carry an icon and words, so meaning never depends on that colour alone.
Revisit when: A brand designer sets the final palette.

## 2026-10-23 — Backend inside the Next.js app, on Supabase; Lemon Squeezy billing

Decision: The API is built as route handlers in the Next.js app (`app/api/v1/**`, server code in `src/server/`), on Supabase (Postgres with row-level security, Supabase Auth). It serves the same REST paths the frontend's `http.ts` already calls, so switching from the mock is one setting (`NEXT_PUBLIC_API_URL`). Sign-up needs email confirmation; the emailed links open our own pages (`/auth/confirm`, `/reset-password`), which call the API, so no link is used up by an email scanner's GET. A password reset signs the person out on every device. Google sign-in uses Supabase's OAuth (PKCE) and shows only when `NEXT_PUBLIC_GOOGLE_AUTH=true`. Billing uses Lemon Squeezy checkouts (workspace id in the checkout's custom data, set by the server), a signed webhook that is recorded once and applied in order, and Lemon Squeezy's customer portal for invoices and cards. Features whose services are not connected yet answer 503 `not_configured`. This replaces "Separate backend service in `backend/`" (2026-10-22).
Why: Founder's direction ("build into the Next.js app server folder"); one deploy, one domain for cookies, and the shared zod schemas and types stay in one package. Lemon Squeezy because Stripe is not available in Pakistan.
Alternatives: A separate service in `backend/` (rejected for now: a second deploy and cross-site cookies for no gain at this size). Next.js server actions only (rejected: the REST contract is already written and doubles as the public API).
Revisit when: Publishing jobs, the media worker or the public API need their own process; the job runner (Inngest or Trigger.dev) is chosen; or plan switching for paying customers is built (now sent to the portal, pending a check of Lemon Squeezy's subscription-update API).

## 2026-10-23 — Platform logos, data-driven previews, per-account publish options

Decision: Platform marks use each platform's logo from Simple Icons (CC0; LinkedIn from v10.4.0, the last release that had it), stored as one SVG path in the platform descriptor. The composer preview is drawn from a `preview` spec in each descriptor (vertical player or feed card, rail and action icons, Follow/Subscribe, text above or below media), so no screen branches on platform names. Settings a platform asks for beyond the caption (YouTube title, visibility, made for kids, notify subscribers, embedding) are declared as `publishOptions` and stored per target. In preview mode, uploaded files are kept in IndexedDB so drafts keep their media across reloads.
Why: Founder's direction (Buffer composer screenshots, 2026-10-23): real social icons instead of YT/IG, a preview that looks and plays like the platform, YouTube visibility, several images, and drop-into-caption media.
Alternatives: A brand-icon npm package at runtime (rejected: weight and licence churn for six glyphs). Branching on platform ids inside the preview (rejected: CLAUDE.md keeps platform facts in descriptors). Per-platform option components (rejected: one generic form driven by `publishOptions` covers YouTube and later TikTok privacy).
Revisit when: A platform changes its brand mark or its upload fields; check each `publishOptions`, `maxImages` and `preview` against the platform's docs before launch (all marked VERIFY).

## 2026-10-23 — Accounts in the sidebar; settings get their own area; exports from the browser

Decision: Each connected account has its own pages (`/dashboard/accounts/[id]` for insights, `/posts` for its posts), listed in the sidebar like Buffer's channels. Team, social accounts and billing move into a settings area (`/dashboard/settings/*`) with its own sidebar, reached from a profile button at the bottom of the main sidebar. Which metrics an account shows, and the platform's words for them, live in each platform's descriptor (`insights`), marked unverified. Insights export as CSV and Markdown files built in the browser, and as PDF through the browser's print dialog.
Why: Founder's direction (Buffer recording and screenshots, 2026-10-23): separate detail per account, a profile and settings area in the sidebar, and CSV / Markdown / PDF export. Print-to-PDF renders every script and emoji, where a bundled PDF library would need its own fonts.
Alternatives: One analytics page with an account filter (rejected: the founder asked for separate detail per account). A PDF library such as jsPDF (rejected for now: extra weight and missing glyphs for Arabic and emoji). Server-side PDF (later, with scheduled reports; BACKEND.md §12 sandbox rules apply).
Revisit when: The backend's insights endpoint exists and each platform's metric list is checked against its API; or scheduled, branded reports need a real PDF file.

## 2026-10-23 — Urdu removed; six locales

Decision: The app ships en, es, pt-BR, fr, de and ar. Urdu (`ur`), its translations, the Noto Nastaliq Urdu font and the Nastaliq line-height rules are removed; Arabic stays as the right-to-left locale. This replaces the Urdu parts of the 2026-10-22 entries "Seven locales from day one" and "Inter leads the Arabic and Urdu font stacks".
Why: Founder's request.
Alternatives: Keeping Urdu but hiding it from the switcher (rejected: it would still need translating and testing).
Revisit when: Someone can review Urdu and support customers in it (FRONTEND.md §12); bring back the locale, the font and the Nastaliq rules together.

## 2026-10-23 — Buffer-style dashboard shell, Posts tabs and filter bars

Decision: The sidebar sits on `--shell` (`#F7F6F3`, hover `#EAE8E5`) with 32 px items and no section headings, and from `lg` up the page is a white rounded panel that scrolls on its own. Scheduled, Posted and Drafts are tabs on `/dashboard/posts` (`?tab=`), not sidebar items or separate routes. Filter bars put a small search box and borderless dropdowns on the tab row. App page headers have no eyebrow. Billing shows usage as pill tags instead of meters, and Monthly/Yearly and Month/Week/List share one pill toggle.
Why: Founder's direction, with Buffer's dashboard as the reference.
Alternatives: One route per status (rejected: a long sidebar, and switching reloaded the list and lost search and filters). Page scroll with a rounded panel (rejected: the sticky header slid out of the rounded corners).
Revisit when: Saved views or more filters join the filter bar; check it still fits on one row at `xl`.

## 2026-10-23 — Dashboard look: sky and mint accents, shadowed menus, custom selects

Decision: Inside the dashboard, sky `#ADDAFF` marks the current page and selections and mint `#90D788` marks done and new (both behind ink text, never as text on white); lime stays for marketing. Body text is darker (`--foreground #111214`, `--muted-foreground #44464b`). Menus, popovers, selects, toasts and dialogs drop their border for a small shadow; text-field focus stays a border, never a shadow. Native `<select>` elements are replaced by a Radix `Select` and a searchable `TimezoneSelect`. Links are no longer underlined (inline links are bold). Every control shows a pointer cursor.
Why: Founder's direction after reviewing the dashboard: too grey, lime too loud, native dropdowns looked unprofessional.
Alternatives: Keeping FRONTEND.md §4's "border, not shadow" for menus (overruled for floating surfaces only).
Revisit when: A brand designer sets the final palette; check sky and mint against any new surfaces (they fail as text on white).

## 2026-10-22 — Tags and the AI assistant built frontend-first

Decision: Workspace tags (name + one of six colours) and an AI writing assistant (generate, then rephrase/shorten/expand/more casual/more formal) are in the composer, posts list, calendar and settings. Both go through the `ApiClient` (`tags.*`, `ai.generate`, `ai.rewrite`); in preview mode a template-based sample writer stands in for the model and spends 50 monthly credits. Inserting AI text turns on "Made with AI" (`post.aiGenerated`), which is a team-facing record only.
Why: Founder asked for both now, with the API added later. Keeping the model call behind the backend's `/ai` routes means no AI key ever reaches the browser.
Alternatives: Calling a model from the browser (rejected: leaks the key, no credit control). Passing "Made with AI" to platforms as a disclosure label (not done: each platform's rules would need checking first, per CLAUDE.md).
Revisit when: The backend picks a model provider and credit limits per plan; then decide whether `aiGenerated` maps to any platform's AI-content label.

## 2026-10-22 — Toasts at top centre; Inter leads the Arabic and Urdu font stacks

Decision: Toasts show at the top centre in every locale. In `ar` and `ur`, the font stack starts with the literal family `"Inter"`, then the script font.
Why: Bottom toasts covered the composer's action bar (and its Schedule button) and the phone navigation. Noto Nastaliq Urdu ships Latin glyphs (serif) and its generated fallback is a size-adjusted Times New Roman, so names, handles and times rendered as oversized serif text; Inter's faces only cover Latin, so Arabic script still reaches the script font.
Alternatives: Per-page toast offsets (fragile). `adjustFontFallback: false` (ignored by the Turbopack build). Putting `var(--font-inter)` first (its fallback face, local Arial, has Arabic glyphs and would replace Nastaliq).
Revisit when: next/font changes its generated family names, or a native Urdu reader prefers Nastaliq digits.

## 2026-10-22 — Platform limits ship as unverified data

Decision: Video limits per platform live in `frontend/my-project/src/providers/<platform>/limits.ts` with a source URL and `verifiedAt: null`. The free video checker says limits are being verified.
Why: CLAUDE.md forbids inventing platform behaviour; the values are a best starting point, not checked facts.
Alternatives: Hard-coding values without a source (rejected: no way to tell what is stale).
Revisit when: Each platform's limits are checked against its current docs; set `verifiedAt` then (TEST.md PRE-13).

## 2026-10-22 — Seven locales from day one, Arabic and Urdu included

Decision: Locales are en, es, pt-BR, fr, de (wave 1) plus ar and ur, all fully translated, with `npm run i18n:check` validating keys, placeholders and ICU syntax.
Why: The Phase 1 exit test needs the UI to switch language **and direction**; Urdu is relevant to the founder's market.
Alternatives: English only until launch (rejected: RTL bugs are cheapest to catch early).
Revisit when: A native speaker reviews each locale (TEST.md I18N-12); drop any locale nobody can support.

## 2026-10-22 — Frontend runs against a mock API until the backend exists

Decision: `src/lib/api/client.ts` uses an in-browser mock (localStorage) when `NEXT_PUBLIC_API_URL` is empty, and a typed REST client otherwise. Both implement one `ApiClient` interface.
Why: Lets every screen, state and flow be built and tested before the backend; the interface doubles as the backend contract.
Alternatives: Building screens against hard-coded props (rejected: hides loading, error and conflict states).
Revisit when: The backend serves `/api/v1`; then delete the mock or keep it only for demos.

## 2026-10-22 — Separate backend service in `backend/`

Decision: The API is built as its own service in `E:\PostSchedule\backend`, called by the frontend over REST with cookie sessions, instead of Next.js server actions.
Why: Founder's direction. The REST shape follows BACKEND.md §7.3, so the public API and the app share one surface.
Alternatives: Server actions inside the Next.js app as BACKEND.md §2 describes (still possible later for UI-only mutations).
Revisit when: Choosing the backend stack and auth provider (Supabase Auth or the backend's own sessions).

## 2026-10-22 — npm, not pnpm

Decision: The frontend uses npm (it was scaffolded with `package-lock.json`).
Why: Avoids two lockfiles; the docs' command list assumed pnpm before scaffolding.
Alternatives: Switching to pnpm (fine later; delete `package-lock.json` and `node_modules` first).
Revisit when: Setting up CI or a monorepo with the backend.

## 2026-10-22 — Working name "PostSchedule"

Decision: The UI shows "PostSchedule", set once in `frontend/my-project/src/config/site.ts`.
Why: `{{PRODUCT_NAME}}` cannot be shown to users and breaks ICU message syntax.
Alternatives: Keeping the placeholder (rejected for the reasons above).
Revisit when: The product name is chosen (open decision 1).

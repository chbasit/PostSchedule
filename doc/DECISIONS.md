# Decision log

Newest first. Format from `PROJECTFLOW.md` §9.

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

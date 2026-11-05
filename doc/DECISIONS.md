# Decision log

Newest first. Format from `PROJECTFLOW.md` §9.

## 2026-11-05 — Production builds use webpack; Tailwind runs through PostCSS

Decision: `npm run build` is `next build --webpack`; `npm run dev` stays on Turbopack. Tailwind is a PostCSS plugin (`postcss.config.mjs`, `@tailwindcss/postcss`) instead of the Turbopack-only `@tailwindcss/turbopack` loader, which is removed with its `turbopack.rules` entry in `next.config.ts`, so both bundlers compile the same CSS.
Why: The first Hostinger build failed in `app/globals.css`: Turbopack runs CSS loaders in a separate Node process and the build host ended it before Turbopack could connect ("node process exited before we could connect to it"). webpack runs PostCSS in the build process itself. The webpack build was checked locally: same output, same rendering.
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

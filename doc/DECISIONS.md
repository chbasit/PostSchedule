# Decision log

Newest first. Format from `PROJECTFLOW.md` §9.

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

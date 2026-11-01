# SEO and AEO playbook

How we get found in Google and in AI answer engines (ChatGPT, Perplexity, Claude, Gemini, Copilot, Google AI Overviews). Five workflows, one measurement section.

These workflows are our own specs, written from the scope we agreed. They are not an installed third-party package. Each workflow can later be turned into its own Claude skill.

Facts about search engines and AI crawlers change. Where a point is marked **verify**, check the vendor's current documentation before relying on it.

---

## Principles

1. **Be genuinely useful and specific.** Search engines and AI systems both reward pages that answer a real question better than the alternatives. Thin pages hurt us.
2. **Our edge is real product knowledge.** We build video pre-flight checks and know platform specs deeply. Content about aspect ratios, bitrate, upload quality and per-platform limits is where we can be the best source.
3. **Facts first, always dated.** Pricing and feature comparisons carry a "last verified" date and a source.
4. **No guarantees.** Nobody can guarantee rankings or AI citations. We improve the odds and measure.
5. **Quality gate before scale.** Programmatic pages stay `noindex` until they pass the quality bar (workflow 4).

---

## Workflow 1: Full site audit (technical SEO to schema)

Run at Phase 1 (base), before launch, and quarterly after.

### Steps

1. **Crawl and inventory.** List every public URL with status code, canonical, title, meta description, H1, word count, indexability, and internal links in/out. Use a crawler (Screaming Frog, Sitebulb, or a script) plus Search Console.
2. **Indexability.**
   - `robots.txt` allows marketing pages, blocks `/app`, `/api`, `/dashboard`, internal search, and preview URLs.
   - Each indexable page has exactly one self-referencing canonical.
   - No accidental `noindex` on pages we want indexed; `noindex` on app, thin and staging pages.
   - Staging is blocked by authentication, not just `robots.txt`.
3. **Sitemaps.** XML sitemap(s) with only indexable, canonical, 200 URLs; `lastmod` that reflects real content changes; submitted to Google Search Console and Bing Webmaster Tools. Split by type (core, blog, compare, programmatic) so indexing can be monitored per section.
4. **Rendering.** Important content is in the server-rendered HTML (Next.js Server Components). Confirm with "view source" and URL Inspection that headings, body copy, internal links and JSON-LD are present without running client JavaScript. Many AI crawlers do not execute JavaScript.
5. **Performance.** Core Web Vitals (LCP, INP, CLS) in the field data where available, lab data otherwise. Images through `next/image` with explicit dimensions; fonts with `font-display: swap` and preloading only what is needed; minimal third-party scripts; marketing pages statically generated or cached at the edge.
6. **Internationalisation.** One URL per language (`/en/`, `/es/`…), `hreflang` for every alternate including a self-reference and `x-default`, translated titles and descriptions (not auto-redirected by IP), language switcher uses real links. Canonical points to the same-language URL.
7. **On-page.** Unique title (about 50–60 characters) and meta description per page; one H1; sensible H2/H3 outline; descriptive image `alt`; descriptive internal link text.
8. **Internal linking.** Every important page is reachable within three clicks from the home page; no orphans; hubs link to spokes and back; breadcrumbs on deep pages.
9. **Security and hygiene.** HTTPS everywhere with a single canonical host (www or apex) and 301s from the other; no redirect chains; custom 404 that returns 404; no soft 404s.
10. **Structured data.** Validate every template against Google's Rich Results Test and the Schema Markup Validator (workflow 3).
11. **AI readiness.** Run the checklist in workflow 2.
12. **Report.** Output a prioritised list.

### Report format

```
P0  Blocks indexing or breaks revenue pages. Fix this week.
P1  Clear ranking or quality loss. Fix this month.
P2  Polish and nice-to-have.

Each item: URL or template, what is wrong, why it matters, how to fix, owner, status.
```

---

## Workflow 2: GEO / AEO (optimise for AI search)

Goal: be understood, trusted, and cited when people ask ChatGPT, Perplexity, Claude, Gemini or Google AI Overviews questions like "best social media scheduler for agencies" or "why does my Instagram Reel look blurry".

### What helps (in order of evidence)

1. **Be crawlable and fast to read.** Server-rendered HTML, clean headings, no content hidden behind scripts or logins.
2. **Answer first.** Open each section with a direct 1–3 sentence answer, then support it. Questions as H2/H3 where natural. AI systems extract self-contained passages, so each section should make sense on its own.
3. **Entity clarity.** The same name, one-line description and category everywhere: home page, About, schema, social profiles, directories. Say plainly what we are ("social media management platform for startups and agencies") and who it is for.
4. **Original, checkable facts.** Platform spec tables, upload-quality tests we ran, pricing comparisons with dates, benchmark data from our own aggregated usage (with privacy-safe methodology). Original data is what gets cited.
5. **Author and source signals.** Real author names with bios, publication and update dates, links to primary sources (platform docs).
6. **Third-party presence.** AI answers draw heavily on what other sites say about us. Build genuine presence on review sites (G2, Capterra, Trustpilot), Product Hunt, relevant Reddit communities (follow each community's rules; disclose affiliation), YouTube tutorials, and "best tools" lists by independent writers.
7. **Comparison and alternatives pages** that are fair and factual (workflow 4). These match the questions people ask AI tools.
8. **Freshness.** Update key pages on a schedule and show the date.

### Crawler policy

Decide per bot, and write the decision in `docs/DECISIONS.md`. **Verify** user-agent names in each vendor's current docs.

| Purpose | Examples | Recommendation |
|---|---|---|
| Search / answer retrieval (cites us) | OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User | Allow on marketing pages |
| Model training | GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot | Business choice. Default: allow marketing content; revisit if we publish paid or proprietary research |
| Everything | | Disallow `/app`, `/api`, `/dashboard` and private paths for all bots |

Do not rely on `robots.txt` to hide anything sensitive.

### What is unproven

- **`llms.txt`**: no major AI vendor has confirmed they use it for ranking or retrieval (**verify**). It is cheap to add (a short, accurate index of key pages), but do not expect results and do not spend time on it before the basics.
- Prompt-style text aimed at AI crawlers, hidden text, or fake FAQ stuffing. Do not do these; they risk penalties and trust.

### Checklist per important page

- [ ] First paragraph states what the page answers
- [ ] Question headings with direct answers beneath
- [ ] At least one original fact, table or example
- [ ] Author, date published, date updated visible
- [ ] Sources linked
- [ ] Schema matches visible content (workflow 3)
- [ ] Renders without JavaScript
- [ ] Internal links to related pages

### Prompt set (monthly check)

Keep 30–50 prompts that real buyers would ask, grouped by intent: category ("best social media scheduler for agencies"), comparison ("X vs Y", "X alternatives"), problem ("why is my Reels video blurry after scheduling"), how-to ("schedule posts to TikTok and Instagram together"), and brand ("what is AgentiqSocial"). Once a month run them in ChatGPT, Perplexity, Gemini, Claude and Google, and record: were we mentioned, were we cited with a link, who else was named, and was the description accurate. Fix inaccurate descriptions by fixing the sources they come from.

---

## Workflow 3: Schema (JSON-LD structured data)

Use JSON-LD, rendered in server HTML, and only describe what is visible on the page.

### Types by template

| Page | Schema |
|---|---|
| Every page | `Organization` (site-wide, in the layout or on the home page), `WebSite` |
| Home, product pages | `SoftwareApplication` (`applicationCategory: BusinessApplication`) with `Offer`s |
| Pricing | `SoftwareApplication` with one `Offer` per plan (`price`, `priceCurrency`, `billingIncrement` if relevant) |
| Blog posts | `BlogPosting` (author `Person`, `datePublished`, `dateModified`, `image`, `publisher`) |
| Deep pages | `BreadcrumbList` |
| Docs / how-to guides | `Article` or `TechArticle`; do not expect a HowTo rich result |
| Comparison pages | `Article` plus `BreadcrumbList`; keep claims in visible text |
| FAQ sections | `FAQPage` is allowed, but Google limits FAQ rich results to a small set of sites (since 2023, **verify**). Mark up only if the Q&A is visible; do not expect a rich result |
| Review pages | Only mark up real, first-party-collected reviews. Never mark up reviews of ourselves written by us |

### Next.js component

```tsx
// src/components/json-ld.tsx
type JsonLdProps = { data: Record<string, unknown> | Record<string, unknown>[] };

export function JsonLd({ data }: JsonLdProps) {
  // Escape "<" so content can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
```

Example, pricing page:

```tsx
<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AgentiqSocial',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: plans.map((p) => ({
      '@type': 'Offer',
      name: p.name,
      price: p.priceMonthly,
      priceCurrency: 'USD',
      url: `${siteUrl}/pricing`,
    })),
  }}
/>
```

Build the data from the same `plans.ts` that drives billing, so the schema can never drift from the real prices.

### Rules

1. Schema must match the visible page. Do not mark up content users cannot see.
2. Do not invent `aggregateRating` or review counts. Only use real data we collect and can show.
3. Use stable `@id`s so entities link together (Organization ↔ WebSite ↔ SoftwareApplication).
4. `sameAs` on `Organization` lists our real profiles (LinkedIn, X, YouTube, GitHub, Product Hunt, G2).
5. Validate in the Rich Results Test and the Schema Markup Validator in CI or at least at release time.
6. Dates in ISO 8601 with timezone; update `dateModified` only on meaningful edits.

---

## Workflow 4: Programmatic SEO (pages at scale)

Programmatic pages are generated from a template plus structured data. They work only when each page offers something a visitor cannot get from a generic page. Done carelessly, they are thin, duplicate content that can drag down the whole site.

### Page families

| Pattern | Example | Data needed | Value to the visitor |
|---|---|---|---|
| `/compare/[tool]` | AgentiqSocial vs Metricool | Both tools' prices, limits, features, with sources and dates | A fair side-by-side table and who should choose which |
| `/alternatives/[tool]` | Best Buffer alternatives | Shortlist with honest pros and cons | A usable shortlist, including cases where staying is right |
| `/switch-from/[tool]` | Switch from Hootsuite | Import steps, what carries over, what does not | A real migration path |
| `/for/[audience]` | Scheduler for agencies, startups, realtors, restaurants | Audience-specific workflow, features, example calendar | A tailored workflow, not a reworded home page |
| `/platforms/[platform]` | Schedule Instagram Reels (specs, limits, tips) | Our platform-limits data (`limits.ts`) | Current specs and pre-flight advice; this is our strongest page family |
| `/tools/[tool]` | Free aspect-ratio checker, caption length counter, best-time-to-post | Working interactive tool | Utility that earns links and returns |
| `/templates/[type]` | Content calendar templates | A downloadable or copyable template | Something to use immediately |

### Data model

Store in the database or in typed JSON, one row per page:

```
slug, family, locale, status (draft | review | published | noindex),
title, meta_description, h1, intro_answer,
facts (json: values with source_url and verified_at),
sections (json: ordered blocks with unique copy),
related_slugs, updated_at, reviewed_by
```

### Quality bar (a page must pass all to be indexed)

1. At least **two sections of genuinely unique content** per page (not swapped variables).
2. Contains **data that exists nowhere else on our site** (a table, a spec, a checklist, an example).
3. Facts have a source and a "last verified" date; claims about competitors are factual and checkable.
4. A human has read the page and signed off (`reviewed_by` set).
5. Passes the same schema, performance and accessibility checks as hand-written pages.
6. Has internal links in and out; not orphaned.
7. Competitor trademarks are used only to refer to the competitor's product, with no implied affiliation.

### Rollout

1. Ship 5–10 pages per family as a pilot, indexable, hand-reviewed.
2. After 4–6 weeks, check Search Console: impressions, clicks, indexed vs "Crawled – currently not indexed". If most are indexed and earning impressions, scale by 20–50 pages at a time.
3. Anything not meeting the bar stays `noindex` and out of the sitemap.
4. Re-verify comparison data on a schedule (pricing pages monthly). Stale comparison pages are worse than none.
5. Consolidate or redirect pages that do not perform after six months.

### Competitor pages: tone

Be accurate and generous. Say where a competitor is better. Give pricing as of a date with a link to their pricing page. Never state unverified claims. This builds the trust that both readers and AI systems reward.

---

## Workflow 5: Blog (write and audit posts for search)

### Strategy

Each post targets one reader question and one primary topic. Cluster posts around a few pillar pages so they support each other with internal links.

### Writing process

1. **Intent.** Write the query and what the reader wants after reading (learn, decide, do). Look at what currently ranks and what AI tools answer; find what they miss.
2. **Angle.** Decide what we add that others do not: a test we ran, a spec table, a screenshot walkthrough, a template, a real example.
3. **Outline.** H2s phrased as the questions people ask; answer-first openings.
4. **Draft.** Plain, specific language. Short paragraphs. Examples over claims. Lead with the answer.
5. **Evidence.** Link primary sources (platform docs). Date anything that changes.
6. **Human review.** A person with real knowledge checks accuracy and adds experience. AI-assisted drafts are fine; unreviewed AI text is not.
7. **Optimise.** Title, meta description, slug, internal links (3–5 relevant), one clear call to action, image alt text, schema (`BlogPosting`, `BreadcrumbList`).
8. **Publish and index.** Add to sitemap; request indexing in Search Console for important posts.
9. **Maintain.** Review at 3 and 6 months, then yearly. Update facts, change `dateModified`, fix links.

### Audit checklist (use on new and existing posts)

- [ ] One clear primary topic and intent
- [ ] Title matches the promise; first paragraph answers the question
- [ ] Unique value: original data, test, example or expert input
- [ ] Facts correct and sourced; dates shown
- [ ] Author byline with real bio; published and updated dates
- [ ] Headings are scannable; no keyword stuffing
- [ ] Internal links in and out; descriptive anchors
- [ ] Images compressed, with dimensions and alt text
- [ ] `BlogPosting` and `BreadcrumbList` schema valid
- [ ] Mobile reading experience is good; no layout shift
- [ ] Not duplicating another post on our site (merge or differentiate if so)
- [ ] CTA fits the reader's stage (template, tool, trial)

### First 20 posts

Chosen from the product plan: they solve the problems our product solves.

1. How to schedule social media posts to multiple platforms (step by step)
2. Instagram Reels, TikTok and YouTube Shorts: the right aspect ratio, resolution and length (spec table)
3. Why your video looks blurry after scheduling, and how to fix it
4. Should you post natively or use a scheduler? We tested the same video both ways
5. The best time to post on each platform (with how to find yours)
6. How to build a monthly content calendar (free template)
7. Social media approval workflow for agencies and clients
8. How to manage social media for multiple countries and languages
9. Repurposing one video for every platform without it looking recycled
10. How to write captions per platform (examples)
11. Social media reporting for clients: what to include (template)
12. How to reply to negative reviews (templates)
13. Google Business Profile posts: what to publish and how often
14. Social media scheduler pricing compared: what you actually pay at 5, 25 and 75 accounts
15. Hootsuite alternatives for small teams
16. Buffer alternatives for agencies
17. How to switch schedulers without losing your content library
18. A social media checklist for startups launching a product
19. How to use AI agents to plan and schedule posts safely (MCP)
20. Social media metrics that matter, and which to ignore

Write the spec-table and test posts first. They carry the most original value.

---

## Measurement

**Tools to set up before launch**
- Google Search Console (domain property) and Bing Webmaster Tools, both with sitemaps submitted
- PostHog or similar for on-site behaviour and signup attribution
- UTM conventions for every campaign link
- A simple spreadsheet or dashboard for the monthly prompt check

**What to watch**

| Metric | Source | Cadence |
|---|---|---|
| Indexed pages vs submitted, by section | Search Console | Weekly |
| Impressions, clicks, average position, by page family | Search Console | Weekly |
| "Crawled – currently not indexed" and "Discovered – not indexed" counts | Search Console | Weekly |
| Core Web Vitals | Search Console, PageSpeed Insights | Monthly |
| Referrals from AI tools (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai) | PostHog / analytics | Monthly |
| AI mention and citation rate on the prompt set | Manual run | Monthly |
| Sign-ups and paid conversions by landing page | PostHog + billing | Monthly |
| Backlinks and referring domains | Search Console links report, or a backlink tool | Quarterly |

Treat sign-ups and paid conversions as the real goal. Traffic that does not convert is a content problem or a targeting problem, not a win.

---

## Cadence

| When | Task |
|---|---|
| Weekly | Search Console check; one blog post or one page-family batch; one review/mention opportunity |
| Monthly | AI prompt check; refresh comparison data; Core Web Vitals; fix top P0/P1 audit items |
| Quarterly | Full site audit (workflow 1); content audit of oldest posts; crawler policy review; backlink review |
| At launch | Everything in the launch checklist in `docs/PROJECTFLOW.md` |

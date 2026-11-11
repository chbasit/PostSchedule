# Upcoming features

Features planned for later, collected 2026-11-11. The order is the founder's call:

1. **First:** posting to every social platform works end to end. That means connecting accounts, then publishing and scheduling to Instagram, TikTok, YouTube, Facebook, LinkedIn and Bluesky.
2. **Then:** the features below that need no AI.
3. **Last:** AI.

Nothing in this file goes on the website or in the Product menu until it works. Meta, Google, TikTok and Lemon Squeezy reviewers read the site, so it must only claim what the product does. When a feature ships, move it to "In the app today" and log it in `DECISIONS.md`.

## In the app today (basic versions)

| Feature | Where |
|---|---|
| Post composer: drafts, posting now, scheduling | Dashboard → New post (`src/features/composer`) |
| Photos, videos, carousels and stories, with limits per platform | `src/providers/*/limits.ts` |
| Content calendar | Posts → Calendar (`src/features/calendar`) |
| Several brands in one account: one workspace per brand or client, each with its own calendar and posts | Workspace switcher in the app header |
| Team roles and approvals | Settings → Team (`src/features/teams`) |

## After posting works (no AI)

### Performance insights
- **Post performance insights:** views, reach, likes, comments and shares per post. This needs each platform's insights permissions, which are part of their app reviews.
- **Engagement breakdown:** results by platform, by post type and by time of day.
- **Advanced analytics and reports:** the plans' "reports" feature, with exports.
- **Goal setting and tracking:** for example followers gained or posts per week, measured against the analytics above.
- **Data-driven decisions:** best times to post and best formats, from your own results.

### Planning and formats
- **Monthly content planner:** a list of post ideas you write yourself and drag onto the calendar.
- **More formats:** Shorts, documents and other formats where each platform's API allows them. Check each platform's current API before building.

### Manage brands
- **Brand-specific content calendars:** a calendar per workspace exists today. Still to add: filtering and colours per brand.
- **Dedicated dashboards and analytics per brand:** these follow the analytics work.
- **Many more brands in one account:** today's limits come from the plan (Scale: 200 social accounts, 25 seats). "1000+ brands" needs a plan decision (a custom plan) and load testing first.

## AI (after the above)

AI Studio and the AI writer already exist in the code but are switched off ("Coming soon", `NEXT_PUBLIC_AI_ENABLED`). Turn them on only when this stage starts.

- **Brand-tuned copy and creative:** the AI writer uses each brand's voice.
- **AI-enforced brand voice and templates:** saved brand rules that every draft follows.
- **Engagement-first hashtag suggestions.**
- **AI content calendar / Magic create:** a month of post ideas and drafts, generated and placed on the calendar.
- **Instant post drafts with AI.**
- **AI image generation:** built in AI Studio, switched off.
- **AI video generation:** new.

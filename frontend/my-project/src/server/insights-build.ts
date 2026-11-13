import type { AccountInsights, InsightPost, InsightsRange } from "@/lib/api/types";
import { addDays, dayKey, zonedToUtc } from "@/lib/time";
import { getPlatform, type InsightMetric, type PlatformId, type PostType } from "@/providers/catalog";
import { postedAt, postUrl, type FeedPost } from "./providers/bluesky";

// The arithmetic of account insights (founder's call, 2026-11-13; Bluesky first), free of
// network and database so it is unit-tested (insights-build.test.ts). buildInsights is the
// platform-neutral part: it turns the account's posts, each with its metrics, into the
// summary, the daily trend and the per-post table for the last `days` days and the same
// length before them.

type Metrics = Partial<Record<InsightMetric, number>>;
export type PlatformPost = Omit<InsightPost, "postId">;

const ENGAGEMENTS: InsightMetric[] = ["likes", "comments", "shares", "saves", "clicks"];
const engagementsOf = (m: Metrics) => ENGAGEMENTS.reduce((sum, k) => sum + (m[k] ?? 0), 0);
// Percent with two decimals; undefined without a follower count (blank, not 0).
const rate = (engagements: number, base: number | null) => (base && base > 0 ? Math.round((engagements / base) * 10_000) / 100 : undefined);

export type Period = { from: string; to: string; previousFrom: string; previousTo: string; since: number };

// Calendar days in the person's time zone: today and the days before it, then as many before.
export function periodOf(days: InsightsRange, timeZone: string, now: number): Period {
  const to = dayKey(new Date(now), timeZone);
  const from = addDays(to, -(days - 1));
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(days - 1));
  const start = zonedToUtc(previousFrom, "00:00", timeZone);
  return { from, to, previousFrom, previousTo, since: start.ok ? start.utc.getTime() : now - days * 2 * 86_400_000 };
}

export function buildInsights(input: {
  accountId: string;
  provider: PlatformId;
  posts: PlatformPost[];
  postIds: Map<string, string>;
  followers: number | null;
  followerHistory: boolean;
  period: Period;
  timeZone: string;
  now: number;
}): AccountInsights {
  const { period, timeZone } = input;
  const day = (p: PlatformPost) => dayKey(p.publishedAt, timeZone);
  const all: InsightPost[] = input.posts.map((p) => ({ ...p, postId: (p.ref && input.postIds.get(p.ref)) || null }));
  const current = all.filter((p) => day(p) >= period.from && day(p) <= period.to);
  const previous = all.filter((p) => day(p) >= period.previousFrom && day(p) <= period.previousTo);
  const sum = (posts: InsightPost[], metric: InsightMetric) => posts.reduce((s, p) => s + (p.metrics[metric] ?? 0), 0);

  const totals: AccountInsights["totals"] = {};
  for (const metric of getPlatform(input.provider).insights.metrics) {
    if (metric === "followers") {
      if (input.followers !== null) totals.followers = { value: input.followers, previous: null };
    } else if (metric === "posts") {
      totals.posts = { value: current.length, previous: previous.length };
    } else if (metric === "engagementRate") {
      // Average per post: all engagements over (posts × followers). Today's followers are used
      // for both periods, as the platform keeps no history of them.
      const now = rate(current.reduce((s, p) => s + engagementsOf(p.metrics), 0), current.length * (input.followers ?? 0));
      const before = rate(previous.reduce((s, p) => s + engagementsOf(p.metrics), 0), previous.length * (input.followers ?? 0));
      if (input.followers) totals.engagementRate = { value: now ?? 0, previous: before ?? null };
    } else {
      totals[metric] = { value: sum(current, metric), previous: previous.length ? sum(previous, metric) : null };
    }
  }

  const daily: AccountInsights["daily"] = [];
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) {
    const posts = current.filter((p) => day(p) === d);
    daily.push({ date: d, followers: input.followers ?? 0, newFollowers: 0, posts: posts.length, engagements: posts.reduce((s, p) => s + engagementsOf(p.metrics), 0) });
  }

  return {
    accountId: input.accountId,
    from: period.from,
    to: period.to,
    previousFrom: period.previousFrom,
    previousTo: period.previousTo,
    totals,
    followerHistory: input.followerHistory,
    daily,
    posts: current.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    syncedAt: new Date(input.now).toISOString(),
  };
}

// --- Bluesky ----------------------------------------------------------------------------

function blueskyType(post: FeedPost): PostType {
  const embed = post.embed as { $type?: string; media?: { $type?: string } } | undefined;
  const kind = embed?.media?.$type ?? embed?.$type ?? "";
  if (kind.startsWith("app.bsky.embed.video")) return "video";
  if (kind.startsWith("app.bsky.embed.images")) return "image";
  return "text";
}

// Replies are "comments", reposts and quote posts are "shares", bookmarks are "saves".
export function blueskyPost(post: FeedPost, followers: number | null): PlatformPost {
  const metrics: Metrics = {
    likes: post.likeCount ?? 0,
    comments: post.replyCount ?? 0,
    shares: (post.repostCount ?? 0) + (post.quoteCount ?? 0),
    saves: post.bookmarkCount ?? 0,
  };
  const engagementRate = rate(engagementsOf(metrics), followers);
  if (engagementRate !== undefined) metrics.engagementRate = engagementRate;
  return { ref: post.uri, caption: post.record.text ?? "", type: blueskyType(post), publishedAt: postedAt(post), url: postUrl(post), metrics };
}

"use client";

import { addDays, dayKey, zonedToUtc } from "@/lib/time";
import { hashString } from "@/lib/utils";
import { getPlatform, type InsightMetric, type PostType } from "@/providers/catalog";
import type { AccountInsights, InsightPost, InsightsRange, SocialAccount } from "./types";

// Sample insights for the preview. Every number is derived from the account id and the
// day, so reloads and different ranges agree with each other. Real numbers come from
// each platform's insights API through the backend.

const HOUR = 3600_000;

// A stable number in [0, 1) for a key.
function unit(key: string) {
  let t = hashString(key) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Insights cover the whole account, so the sample includes posts made outside the app.
const OUTSIDE_CAPTIONS = [
  "Behind the scenes of this week's shoot.",
  "Three things our customers taught us this month.",
  "Our most asked question, answered.",
  "Studio tour: where the work happens.",
  "A quick tip you can use today.",
  "Thank you for all the comments on our last post!",
];

const ENGAGEMENTS: InsightMetric[] = ["likes", "comments", "shares", "saves"];
const RATE_BASE: InsightMetric[] = ["reach", "impressions", "views"];

type Metrics = Partial<Record<InsightMetric, number>>;

export type OwnPost = { postId: string; caption: string; type: PostType; publishedAt: string; url: string | null };

function engagementsOf(m: Metrics) {
  return ENGAGEMENTS.reduce((sum, k) => sum + (m[k] ?? 0), 0);
}

// Engagements over reach, impressions or views, else followers (providers/types.ts).
function rateOf(m: Metrics, followers: number) {
  const base = RATE_BASE.map((k) => m[k]).find((v) => v !== undefined) ?? followers;
  return base > 0 ? Math.round((engagementsOf(m) / base) * 10_000) / 100 : 0;
}

function sampleMetrics(key: string, followers: number, has: Set<InsightMetric>): Metrics {
  const r = (name: string) => unit(`${key}:${name}`);
  const reach = Math.round(followers * (0.15 + r("reach") * 0.5));
  const likes = Math.round(reach * (0.02 + r("likes") * 0.05));
  const m: Metrics = {};
  if (has.has("reach")) m.reach = reach;
  if (has.has("impressions")) m.impressions = Math.round(reach * (1.2 + r("impressions") * 0.5));
  if (has.has("views")) m.views = Math.round(reach * (1.1 + r("views") * 1.5));
  if (has.has("likes")) m.likes = likes;
  if (has.has("comments")) m.comments = Math.round(likes * (0.04 + r("comments") * 0.15));
  if (has.has("shares")) m.shares = Math.round(likes * (0.03 + r("shares") * 0.12));
  if (has.has("saves")) m.saves = Math.round(likes * (0.05 + r("saves") * 0.2));
  if (has.has("clicks")) m.clicks = Math.round(reach * (0.005 + r("clicks") * 0.02));
  if (has.has("engagementRate")) m.engagementRate = rateOf(m, followers);
  return m;
}

export function sampleInsights(account: SocialAccount, own: OwnPost[], days: InsightsRange, timeZone: string, now: number): AccountInsights {
  const platform = getPlatform(account.provider);
  const has = new Set(platform.insights.metrics);
  const to = dayKey(new Date(now), timeZone);
  const from = addDays(to, -(days - 1));
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(days - 1));

  // Followers today, walked back one day at a time.
  const today = 600 + Math.floor(unit(`${account.id}:base`) * 12_000);
  const gained = (date: string) => Math.round(today * 0.0015 * (0.3 + unit(`${account.id}:${date}:followers`) * 1.4));
  const followersOn = new Map<string, number>();
  for (let d = to, running = today; d >= previousFrom; d = addDays(d, -1)) {
    followersOn.set(d, running);
    running -= gained(d);
  }

  // Posts made outside the app: about one every five days.
  const types = (Object.keys(platform.capabilities) as PostType[]).filter((k) => platform.capabilities[k] && k !== "story");
  const outside: OwnPost[] = [];
  for (let d = previousFrom; d <= to; d = addDays(d, 1)) {
    if (unit(`${account.id}:${d}:post`) >= 0.2) continue;
    const hour = String(8 + Math.floor(unit(`${account.id}:${d}:hour`) * 10)).padStart(2, "0");
    const at = zonedToUtc(d, `${hour}:00`, timeZone);
    if (!at.ok || at.utc.getTime() > now) continue;
    outside.push({
      postId: "",
      caption: OUTSIDE_CAPTIONS[Math.floor(unit(`${account.id}:${d}:caption`) * OUTSIDE_CAPTIONS.length)],
      type: types[Math.floor(unit(`${account.id}:${d}:type`) * types.length)] ?? "text",
      publishedAt: at.utc.toISOString(),
      url: null,
    });
  }

  const all: InsightPost[] = [...own, ...outside].map((p) => {
    const day = dayKey(p.publishedAt, timeZone);
    return {
      ...p,
      postId: p.postId || null,
      metrics: sampleMetrics(`${account.id}:${p.publishedAt}`, followersOn.get(day) ?? today, has),
    };
  });
  const inRange = (a: string, b: string) => all.filter((p) => {
    const day = dayKey(p.publishedAt, timeZone);
    return day >= a && day <= b;
  });
  const current = inRange(from, to);
  const previous = inRange(previousFrom, previousTo);

  const sum = (posts: InsightPost[]) => {
    const total: Metrics = {};
    for (const p of posts) for (const [k, v] of Object.entries(p.metrics)) if (k !== "engagementRate") total[k as InsightMetric] = (total[k as InsightMetric] ?? 0) + (v ?? 0);
    return total;
  };
  const thisPeriod = sum(current);
  const before = sum(previous);
  const totals: AccountInsights["totals"] = {};
  for (const metric of platform.insights.metrics) {
    if (metric === "followers") totals.followers = { value: followersOn.get(to) ?? today, previous: followersOn.get(previousTo) ?? today };
    else if (metric === "posts") totals.posts = { value: current.length, previous: previous.length };
    else if (metric === "engagementRate")
      totals.engagementRate = { value: rateOf(thisPeriod, followersOn.get(to) ?? today), previous: rateOf(before, followersOn.get(previousTo) ?? today) };
    else totals[metric] = { value: thisPeriod[metric] ?? 0, previous: before[metric] ?? 0 };
  }

  const daily: AccountInsights["daily"] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const posts = current.filter((p) => dayKey(p.publishedAt, timeZone) === d);
    daily.push({
      date: d,
      followers: followersOn.get(d) ?? today,
      newFollowers: gained(d),
      posts: posts.length,
      engagements: posts.reduce((s, p) => s + engagementsOf(p.metrics), 0),
    });
  }

  // A disconnected account keeps its last numbers until it is reconnected.
  const syncedAt =
    account.status === "needs_reconnect" ? now - 26 * HOUR : now - Math.round((5 + unit(`${account.id}:sync`) * 40) * 60_000);

  return {
    accountId: account.id,
    from,
    to,
    previousFrom,
    previousTo,
    totals,
    daily,
    posts: current.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    syncedAt: new Date(syncedAt).toISOString(),
  };
}

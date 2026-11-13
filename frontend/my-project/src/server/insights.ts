import "server-only";
import type { AccountInsights, InsightsRange } from "@/lib/api/types";
import type { PlatformId } from "@/providers/catalog";
import { blueskyPost, buildInsights, periodOf } from "./insights-build";
import { authorPosts, followerCount, type FeedPost } from "./providers/bluesky";
import { adminClient } from "./supabase";

// Account insights read from the platform when asked (founder's call, 2026-11-13; Bluesky
// first). The numbers are worked out in insights-build.ts.

// A few minutes of memory per account and period, so switching ranges or reloading does not
// ask Bluesky again each time.
const CACHE_MS = 3 * 60_000;
const cache = new Map<string, { at: number; posts: FeedPost[]; followers: number | null }>();

async function blueskyData(did: string, since: number, now: number) {
  const key = `${did}:${since}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit;
  const [posts, followers] = await Promise.all([authorPosts(did, since), followerCount(did)]);
  const value = { at: now, posts, followers };
  if (cache.size > 500) cache.clear();
  cache.set(key, value);
  return value;
}

// After the account replies from here, its counts have changed: read them fresh next time.
export function forgetAccount(did: string) {
  for (const key of cache.keys()) if (key.startsWith(`${did}:`)) cache.delete(key);
}

export async function accountInsights(
  workspaceId: string,
  account: { id: string; provider: PlatformId; providerAccountId: string },
  days: InsightsRange,
  timeZone: string,
): Promise<AccountInsights> {
  const now = Date.now();
  const period = periodOf(days, timeZone, now);
  const { posts, followers, at } = await blueskyData(account.providerAccountId, period.since, now);
  const mapped = posts.map((p) => blueskyPost(p, followers));
  // Posts sent from this app open their own details from the table.
  const refs = mapped.flatMap((p) => (p.ref ? [p.ref] : []));
  const postIds = new Map<string, string>();
  if (refs.length) {
    const { data } = await adminClient()
      .from("post_targets")
      .select("post_id, provider_post_id")
      .eq("workspace_id", workspaceId)
      .eq("social_account_id", account.id)
      .in("provider_post_id", refs);
    for (const row of (data ?? []) as Array<{ post_id: string; provider_post_id: string }>) postIds.set(row.provider_post_id, row.post_id);
  }
  const built = buildInsights({ accountId: account.id, provider: account.provider, posts: mapped, postIds, followers, followerHistory: false, period, timeZone, now });
  // "Updated …" tells when the numbers were read from Bluesky, not when this answer was made.
  return { ...built, syncedAt: new Date(at).toISOString() };
}

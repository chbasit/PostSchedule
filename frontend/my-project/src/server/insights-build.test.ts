import { describe, expect, it } from "vitest";
import { blueskyPost, buildInsights, periodOf, type PlatformPost } from "./insights-build";
import type { FeedPost } from "./providers/bluesky";

// 13 Nov 2026, 12:00 UTC: 17:00 in Karachi.
const NOW = Date.UTC(2026, 10, 13, 12);
const TZ = "Asia/Karachi";

function feedPost(over: Partial<FeedPost> & { createdAt: string }): FeedPost {
  return {
    uri: `at://did:plc:me/app.bsky.feed.post/${over.createdAt}`,
    cid: "cid",
    author: { did: "did:plc:me", handle: "me.bsky.social" },
    record: { text: "hello", createdAt: over.createdAt },
    indexedAt: over.createdAt,
    ...over,
  };
}

describe("periodOf", () => {
  it("counts calendar days in the person's time zone, today included", () => {
    const p = periodOf(7, TZ, NOW);
    expect(p).toMatchObject({ from: "2026-11-07", to: "2026-11-13", previousFrom: "2026-10-31", previousTo: "2026-11-06" });
    // Midnight at the start of the earlier period, Karachi time (UTC+5).
    expect(new Date(p.since).toISOString()).toBe("2026-10-30T19:00:00.000Z");
  });
});

describe("blueskyPost", () => {
  it("maps replies to comments, reposts and quotes to shares, bookmarks to saves", () => {
    const p = blueskyPost(feedPost({ createdAt: "2026-11-12T10:00:00Z", likeCount: 6, replyCount: 2, repostCount: 1, quoteCount: 1, bookmarkCount: 1 }), 200);
    expect(p.metrics).toEqual({ likes: 6, comments: 2, shares: 2, saves: 1, engagementRate: 5.5 });
    expect(p.url).toBe("https://bsky.app/profile/me.bsky.social/post/2026-11-12T10:00:00Z");
  });

  it("leaves the engagement rate blank without a follower count", () => {
    const p = blueskyPost(feedPost({ createdAt: "2026-11-12T10:00:00Z", likeCount: 3 }), 0);
    expect(p.metrics.engagementRate).toBeUndefined();
  });

  it("tells photo, video and text posts apart", () => {
    expect(blueskyPost(feedPost({ createdAt: "2026-11-12T10:00:00Z", embed: { $type: "app.bsky.embed.images#view" } }), 1).type).toBe("image");
    expect(blueskyPost(feedPost({ createdAt: "2026-11-12T10:00:00Z", embed: { $type: "app.bsky.embed.video#view" } }), 1).type).toBe("video");
    expect(blueskyPost(feedPost({ createdAt: "2026-11-12T10:00:00Z" }), 1).type).toBe("text");
  });
});

describe("buildInsights", () => {
  const period = periodOf(7, TZ, NOW);
  const post = (createdAt: string, likes: number, comments = 0): PlatformPost => blueskyPost(feedPost({ createdAt, likeCount: likes, replyCount: comments }), 100);
  const posts = [post("2026-11-13T08:00:00Z", 10, 2), post("2026-11-08T08:00:00Z", 4), post("2026-11-02T08:00:00Z", 3)];
  const build = (followers: number | null, list = posts) =>
    buildInsights({ accountId: "a", provider: "bluesky", posts: list, postIds: new Map([[list[0].ref!, "our-post"]]), followers, followerHistory: false, period, timeZone: TZ, now: NOW });

  it("sums this period against the period before", () => {
    const r = build(100);
    expect(r.totals.posts).toEqual({ value: 2, previous: 1 });
    expect(r.totals.likes).toEqual({ value: 14, previous: 3 });
    expect(r.totals.comments).toEqual({ value: 2, previous: 0 });
    // (14 + 2) engagements over 2 posts × 100 followers.
    expect(r.totals.engagementRate).toEqual({ value: 8, previous: 3 });
  });

  it("shows today's followers with no earlier number, never a made-up change", () => {
    expect(build(100).totals.followers).toEqual({ value: 100, previous: null });
    expect(build(null).totals.followers).toBeUndefined();
    expect(build(null).totals.engagementRate).toBeUndefined();
    expect(build(100).followerHistory).toBe(false);
  });

  it("leaves the earlier number blank when there were no posts before", () => {
    const r = build(100, posts.slice(0, 2));
    expect(r.totals.likes).toEqual({ value: 14, previous: null });
    expect(r.totals.posts).toEqual({ value: 2, previous: 0 });
  });

  it("charts posts and engagements per day and links posts sent from the app", () => {
    const r = build(100);
    expect(r.daily).toHaveLength(7);
    expect(r.daily.at(-1)).toMatchObject({ date: "2026-11-13", posts: 1, engagements: 12 });
    expect(r.daily.find((d) => d.date === "2026-11-08")).toMatchObject({ posts: 1, engagements: 4 });
    expect(r.posts.map((p) => p.postId)).toEqual(["our-post", null]);
  });
});

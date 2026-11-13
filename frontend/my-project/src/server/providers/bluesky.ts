import sharp from "sharp";

// Bluesky over the AT Protocol (BACKEND.md §9: the first adapter). People connect with their
// handle and an app password (bsky.app > Settings > Privacy and security > App passwords); the
// password is stored encrypted and each publish signs in fresh, so nothing expires on our side.
// Endpoints and limits from docs.bsky.app (checked 2026-11-12): createSession, uploadBlob
// (images up to 1,000,000 bytes), createRecord with app.bsky.feed.post, rich-text facets with
// UTF-8 byte offsets.

const ENTRYWAY = "https://bsky.social";
const APPVIEW = "https://public.api.bsky.app";
const IMAGE_MAX_BYTES = 950_000; // under the 1,000,000-byte blob limit, with room to spare
const TIMEOUT = 30_000;

export class BlueskyError extends Error {
  constructor(
    public code: "auth" | "rate_limited" | "rejected" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

export type BlueskySession = { did: string; handle: string; pds: string; accessJwt: string };

async function xrpc<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
  } catch {
    throw new BlueskyError("unavailable", "Bluesky did not answer.");
  }
  const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (res.ok) return body as T;
  const message = body?.message ?? `HTTP ${res.status}`;
  if (res.status === 401 || body?.error === "AuthenticationRequired" || body?.error === "AccountTakedown") throw new BlueskyError("auth", message);
  if (res.status === 429) throw new BlueskyError("rate_limited", message);
  if (res.status >= 500) throw new BlueskyError("unavailable", message);
  throw new BlueskyError("rejected", message);
}

// Signs in with the handle (or email, or DID) and app password. The account's own server (PDS)
// comes from its DID document; writes go there, and later sign-ins can go straight to it.
export async function login(identifier: string, appPassword: string, service: string = ENTRYWAY): Promise<BlueskySession> {
  const s = await xrpc<{ did: string; handle: string; accessJwt: string; didDoc?: { service?: Array<{ id: string; serviceEndpoint: string }> } }>(
    `${service.replace(/\/$/, "")}/xrpc/com.atproto.server.createSession`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password: appPassword }) },
  );
  const pds = s.didDoc?.service?.find((x) => x.id === "#atproto_pds" || x.id.endsWith("#atproto_pds"))?.serviceEndpoint ?? ENTRYWAY;
  return { did: s.did, handle: s.handle, pds: pds.replace(/\/$/, ""), accessJwt: s.accessJwt };
}

export async function profile(did: string): Promise<{ displayName: string | null; avatar: string | null }> {
  try {
    const p = await xrpc<{ displayName?: string; avatar?: string }>(`${APPVIEW}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`, { method: "GET" });
    return { displayName: p.displayName?.trim() || null, avatar: p.avatar ?? null };
  } catch {
    // The name and picture are nice to have; the account works without them.
    return { displayName: null, avatar: null };
  }
}

// Links and hashtags become clickable through facets, which count UTF-8 bytes, not characters.
type Facet = { index: { byteStart: number; byteEnd: number }; features: Array<Record<string, string>> };

export function detectFacets(text: string): Facet[] {
  const facets: Facet[] = [];
  const bytesBefore = (i: number) => Buffer.byteLength(text.slice(0, i), "utf8");
  for (const m of text.matchAll(/https?:\/\/[^\s<>"]+/g)) {
    const url = m[0].replace(/[.,;:!?)\]'"]+$/, "");
    const start = m.index;
    facets.push({ index: { byteStart: bytesBefore(start), byteEnd: bytesBefore(start + url.length) }, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] });
  }
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*)/gu)) {
    const start = m.index + m[1].length;
    const tag = m[2].slice(0, 64);
    facets.push({ index: { byteStart: bytesBefore(start), byteEnd: bytesBefore(start + 1 + tag.length) }, features: [{ $type: "app.bsky.richtext.facet#tag", tag }] });
  }
  return facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
}

// Bluesky takes images up to about 1 MB: re-encode as JPEG, smaller and smaller until it fits.
export async function fitImage(bytes: Buffer): Promise<{ bytes: Buffer; width: number; height: number }> {
  for (const [side, quality] of [
    [2000, 85],
    [2000, 72],
    [1600, 72],
    [1200, 68],
    [1000, 60],
  ] as const) {
    const { data, info } = await sharp(bytes)
      .rotate()
      .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    if (data.length <= IMAGE_MAX_BYTES) return { bytes: data, width: info.width, height: info.height };
  }
  throw new BlueskyError("rejected", "This photo is too large for Bluesky even after shrinking it.");
}

export type BlueskyImage = { bytes: Buffer; alt?: string };

export async function publish(session: BlueskySession, text: string, images: BlueskyImage[]): Promise<{ id: string; url: string }> {
  const auth = { Authorization: `Bearer ${session.accessJwt}` };
  const embedded = [];
  for (const image of images.slice(0, 4)) {
    const fitted = await fitImage(image.bytes);
    const { blob } = await xrpc<{ blob: unknown }>(`${session.pds}/xrpc/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "image/jpeg" },
      body: new Uint8Array(fitted.bytes),
    });
    embedded.push({ alt: image.alt ?? "", image: blob, aspectRatio: { width: fitted.width, height: fitted.height } });
  }
  const facets = detectFacets(text);
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    ...(facets.length ? { facets } : {}),
    ...(embedded.length ? { embed: { $type: "app.bsky.embed.images", images: embedded } } : {}),
  };
  const created = await xrpc<{ uri: string }>(`${session.pds}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record }),
  });
  const rkey = created.uri.split("/").pop() ?? "";
  return { id: created.uri, url: `https://bsky.app/profile/${session.handle}/post/${rkey}` };
}

// --- Reading: insights and replies (founder's call, 2026-11-13) ----------------------------
// Public AppView reads, no sign-in needed: getAuthorFeed, getProfile, getPostThread, getPosts.
// Field names checked against the live API on 2026-11-13.

export type StrongRef = { uri: string; cid: string };
export type FeedPost = {
  uri: string;
  cid: string;
  author: { did: string; handle: string; displayName?: string; avatar?: string };
  record: { text?: string; createdAt?: string; reply?: { root: StrongRef; parent: StrongRef } };
  embed?: { $type?: string };
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  indexedAt: string;
};
export type ThreadNode = { $type?: string; post?: FeedPost; replies?: ThreadNode[] };

const READ_PAGES = 20; // 2,000 posts: far more than 180 days for almost every account

export const postUrl = (post: Pick<FeedPost, "uri" | "author">) => `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop() ?? ""}`;
export const postedAt = (post: FeedPost) => post.record.createdAt ?? post.indexedAt;

// The account's own posts (not replies, not reposts) since `since`, newest first.
export async function authorPosts(did: string, since: number): Promise<FeedPost[]> {
  const out = new Map<string, FeedPost>();
  let cursor: string | undefined;
  for (let page = 0; page < READ_PAGES; page++) {
    const q = new URLSearchParams({ actor: did, limit: "100", filter: "posts_no_replies" });
    if (cursor) q.set("cursor", cursor);
    const res = await xrpc<{ feed: Array<{ post: FeedPost; reason?: { $type?: string } }>; cursor?: string }>(`${APPVIEW}/xrpc/app.bsky.feed.getAuthorFeed?${q}`, {
      method: "GET",
    });
    let older = false;
    for (const item of res.feed) {
      const pinned = item.reason?.$type?.endsWith("#reasonPin");
      if (item.reason && !pinned) continue; // a repost of someone else's post
      if (item.post.author.did !== did) continue;
      if (Date.parse(postedAt(item.post)) < since) {
        if (!pinned) older = true;
        continue;
      }
      out.set(item.post.uri, item.post);
    }
    if (older || !res.cursor || res.feed.length === 0) break;
    cursor = res.cursor;
  }
  return [...out.values()].sort((a, b) => postedAt(b).localeCompare(postedAt(a)));
}

// Today's follower count; Bluesky keeps no history of it.
export async function followerCount(did: string): Promise<number | null> {
  const p = await xrpc<{ followersCount?: number }>(`${APPVIEW}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`, { method: "GET" });
  return typeof p.followersCount === "number" ? p.followersCount : null;
}

// A post and the replies under it, `depth` levels down. Deleted or blocked replies come back
// as other node types and are left out by the caller.
export async function postThread(uri: string, depth = 6): Promise<ThreadNode | null> {
  try {
    const res = await xrpc<{ thread: ThreadNode }>(`${APPVIEW}/xrpc/app.bsky.feed.getPostThread?${new URLSearchParams({ uri, depth: String(depth), parentHeight: "0" })}`, {
      method: "GET",
    });
    return res.thread;
  } catch (e) {
    if (e instanceof BlueskyError && e.code === "rejected") return null; // NotFound: deleted
    throw e;
  }
}

export async function getPost(uri: string): Promise<FeedPost | null> {
  const res = await xrpc<{ posts: FeedPost[] }>(`${APPVIEW}/xrpc/app.bsky.feed.getPosts?${new URLSearchParams({ uris: uri })}`, { method: "GET" });
  return res.posts[0] ?? null;
}

// Answers a post or a reply: the new post points at the thread's first post (root) and at the
// one it answers (parent), as Bluesky requires.
export async function reply(session: BlueskySession, text: string, root: StrongRef, parent: StrongRef): Promise<StrongRef> {
  const facets = detectFacets(text);
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    reply: { root, parent },
    ...(facets.length ? { facets } : {}),
  };
  return xrpc<StrongRef>(`${session.pds}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record }),
  });
}

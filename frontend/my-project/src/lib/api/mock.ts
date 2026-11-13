"use client";

import { SESSION_COOKIE } from "@/config/site";
import type { Role } from "@/lib/auth/permissions";
import { MAX_IMAGES_PER_REQUEST, PROMPT_MAX } from "@/lib/ai/images";
import { AI_COSTS, getPlan, imageCost, TRIAL_DAYS, type PlanKey } from "@/lib/billing/plans";
import { probeMedia } from "@/lib/preflight/probe";
import { browserTimeZone, utcToZoned, zonedToUtc } from "@/lib/time";
import type { PlatformId } from "@/providers/catalog";
import { ApiError } from "./errors";
import { matchesFilter } from "./filter";
import { sampleInsights } from "./mock-insights";
import { drawPlaceholder } from "./mock-images";
import { clearFiles, keepFile, rememberUrl } from "./mock-media";
import type {
  AiCredits,
  AiImage,
  AiRewriteAction,
  ApiClient,
  ConnectResult,
  Invite,
  MediaSummary,
  Member,
  Notification,
  Post,
  PostInput,
  PostStatus,
  PostTarget,
  Session,
  SocialAccount,
  Tag,
  TagColor,
  UploadHandle,
  User,
  Workspace,
} from "./types";

// In-browser stand-in for the backend so every screen works before the API exists.
// Data lives in localStorage for this browser only. Never ship this to production.

const DB_KEY = "ps_mock_db_v2";
export const DEMO_EMAIL = "demo@example.com";
// No email is sent in preview mode; this code stands in for the emailed one.
export const PREVIEW_CODE = "123456";

type StoredWorkspace = Omit<Workspace, "role"> & { members: Record<string, { role: Role; joinedAt: string }> };

type Db = {
  users: Record<string, User>;
  workspaces: Record<string, StoredWorkspace>;
  accounts: SocialAccount[];
  posts: Post[];
  invites: Array<Invite & { workspaceId: string }>;
  notifications: Array<Notification & { workspaceId: string }>;
  tags: Tag[];
  // AI credits used per workspace in the current month ("YYYY-MM").
  aiUsage: Record<string, { month: string; used: number }>;
  aiImages: Array<AiImage & { workspaceId: string }>;
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// A short, realistic delay so loading states are exercised without slowing anyone down.
function latency() {
  return sleep(30 + Math.random() * 60);
}

// Parsed once and kept in memory; another tab's writes invalidate it. Every call gets its
// own copy, like JSON from a real API, so objects already handed to the UI never change.
let memo: Db | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY || e.key === null) memo = null;
  });
}

function load(): Db {
  if (memo) return structuredClone(memo);
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      memo = normalize(JSON.parse(raw) as Db);
      return structuredClone(memo);
    }
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  const db = seedDb();
  save(db);
  return structuredClone(db);
}

function save(db: Db) {
  memo = db;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Quota or private mode: keep working in memory for this page view.
  }
}

function mutate<T>(fn: (db: Db) => T): T {
  const db = load();
  const result = fn(db);
  save(db);
  return result;
}

function readSessionUserId(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  return value.startsWith("mock.") ? value.slice(5) : null;
}

function writeSession(userId: string | null) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = userId
    ? `${SESSION_COOKIE}=mock.${userId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax${secure}`
    : `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
}

function requireUser(db: Db): User {
  const userId = readSessionUserId();
  const user = userId ? db.users[userId] : undefined;
  if (!user) throw new ApiError("unauthenticated", "Your session has ended. Sign in again.");
  return user;
}

// Forbidden and not-found look the same to outsiders (TEST.md AUTHZ-03).
function requireMember(db: Db, wsId: string, roles?: Role[]): { user: User; ws: StoredWorkspace; role: Role } {
  const user = requireUser(db);
  const ws = db.workspaces[wsId];
  const membership = ws?.members[user.id];
  if (!ws || !membership || (roles && !roles.includes(membership.role))) {
    throw new ApiError("not_found", "This item does not exist or you do not have access to it.");
  }
  return { user, ws, role: membership.role };
}

function toWorkspace(ws: StoredWorkspace, userId: string): Workspace {
  const { members, ...rest } = ws;
  return { ...rest, role: members[userId].role };
}

function sessionFor(db: Db, user: User): Session {
  return {
    user,
    workspaces: Object.values(db.workspaces)
      .filter((ws) => ws.members[user.id])
      .map((ws) => toWorkspace(ws, user.id)),
  };
}

function deriveStatus(targets: PostTarget[], fallback: PostStatus): PostStatus {
  const live = targets.filter((t) => t.status !== "skipped");
  if (live.length === 0) return fallback;
  if (live.some((t) => t.status === "publishing" || t.status === "queued")) return "publishing";
  const published = live.filter((t) => t.status === "published").length;
  if (published === live.length) return "published";
  if (live.every((t) => t.status === "failed")) return "failed";
  if (published > 0 && live.every((t) => t.status === "published" || t.status === "failed")) return "partial";
  return fallback;
}

// ---------------------------------------------------------------------------
// Seed data

function newWorkspace(name: string, kind: Workspace["kind"], planKey: PlanKey, ownerId: string, now: number): StoredWorkspace {
  const plan = getPlan(planKey);
  return {
    id: id("ws"),
    name,
    kind,
    planKey,
    subscription: {
      status: planKey === "free" ? "trialing" : "active",
      interval: planKey === "free" ? null : "month",
      trialEndsAt: planKey === "free" ? new Date(now + TRIAL_DAYS * DAY).toISOString() : null,
      currentPeriodEnd: planKey === "free" ? null : new Date(now + 21 * DAY).toISOString(),
      cancelAt: null,
    },
    accountLimit: plan.accounts,
    memberLimit: plan.seats,
    members: { [ownerId]: { role: "owner", joinedAt: new Date(now - 30 * DAY).toISOString() } },
  };
}

function newUser(email: string, displayName: string, verified: boolean): User {
  return {
    id: id("usr"),
    email,
    displayName,
    emailVerified: verified,
    locale: "en",
    timezone: browserTimeZone(),
    use24h: false,
    persona: null,
    onboardedAt: null,
  };
}

const SAMPLE_CAPTIONS = [
  "Behind the scenes of our autumn shoot. Three days, one van, a lot of coffee. ☕",
  "New drop is live. Swipe to see every colourway, then tell us your favourite.",
  "Five tips to make vertical video look sharp on every platform. Save this for later.",
  "We asked our team what they would change about Mondays. The answers surprised us.",
  "Launch week recap: what worked, what did not, and what we will do next time.",
  "Customer story: how a two-person studio plans a month of posts in one afternoon.",
  "Quick poll: do you prefer short tips or long tutorials? Reply below.",
  "Our studio playlist for focused work. Link in bio.",
];

function seedWorkspaceContent(db: Db, ws: StoredWorkspace, authorId: string, now: number, tz: string) {
  const mk = (provider: PlatformId, displayName: string, handle: string, status: SocialAccount["status"]): SocialAccount => ({
    id: id("acc"),
    workspaceId: ws.id,
    provider,
    displayName,
    handle,
    status,
    createdAt: new Date(now - 20 * DAY).toISOString(),
  });
  const accounts = [
    mk("instagram", "Northwind Studio", "@northwind.studio", "active"),
    mk("tiktok", "Northwind", "@northwind", "active"),
    mk("youtube", "Northwind Studio", "@northwindstudio", "active"),
    mk("linkedin", "Northwind Studio", "northwind-studio", "needs_reconnect"),
  ];
  db.accounts.push(...accounts);
  const [ig, tt, yt, li] = accounts;

  const at = (dayOffset: number, hhmm: string) => {
    const day = utcToZoned(new Date(now + dayOffset * DAY), tz).date;
    const r = zonedToUtc(day, hhmm, tz);
    return r.ok ? r.utc.toISOString() : new Date(now + dayOffset * DAY).toISOString();
  };

  const target = (acc: SocialAccount, status: PostTarget["status"], extra: Partial<PostTarget> = {}): PostTarget => ({
    id: id("tgt"),
    socialAccountId: acc.id,
    provider: acc.provider,
    captionOverride: null,
    status,
    errorCode: null,
    errorMessage: null,
    providerUrl: null,
    publishedAt: null,
    options: null,
    ...extra,
  });

  const post = (
    i: number,
    type: Post["type"],
    status: PostStatus,
    scheduledAt: string | null,
    targets: PostTarget[],
  ): Post => ({
    id: id("pst"),
    workspaceId: ws.id,
    type,
    status,
    mainCaption: SAMPLE_CAPTIONS[i % SAMPLE_CAPTIONS.length],
    scheduledAt,
    timezone: scheduledAt ? tz : null,
    version: 1,
    createdBy: authorId,
    createdAt: new Date(now - 10 * DAY).toISOString(),
    updatedAt: new Date(now - 2 * DAY).toISOString(),
    targets,
    media: [],
    tagIds: [],
    aiGenerated: false,
  });

  const publishedAt = (iso: string) => ({ publishedAt: iso, providerUrl: "https://example.com/post" });
  const p1 = at(-3, "09:00");
  const p2 = at(-1, "12:30");
  const p3 = at(-2, "17:00");

  db.posts.push(
    post(0, "video", "published", p1, [target(ig, "published", publishedAt(p1)), target(tt, "published", publishedAt(p1))]),
    post(1, "image", "published", p2, [target(ig, "published", publishedAt(p2))]),
    post(2, "video", "partial", p3, [
      target(ig, "published", publishedAt(p3)),
      target(yt, "failed", {
        errorCode: "media_invalid",
        errorMessage: "YouTube rejected the video: it is longer than allowed for Shorts.",
      }),
    ]),
    post(3, "text", "lapsed", new Date(now - 6 * HOUR).toISOString(), [target(li, "pending")]),
    post(4, "video", "scheduled", at(1, "09:00"), [target(ig, "pending"), target(tt, "pending")]),
    post(5, "image", "scheduled", at(2, "13:00"), [target(ig, "pending")]),
    post(6, "video", "pending_approval", at(5, "10:00"), [target(tt, "pending"), target(yt, "pending")]),
    post(7, "video", "scheduled", at(8, "17:00"), [target(yt, "pending")]),
    post(2, "image", "scheduled", at(12, "09:30"), [target(ig, "pending"), target(tt, "pending")]),
    post(5, "text", "draft", null, [target(li, "pending")]),
    post(4, "video", "draft", null, [target(ig, "pending")]),
  );

  // Tag the sample posts so filters and chips have something to show.
  const [launch, hiring, bts, promo, evergreen] = seedTags(db, ws.id, now);
  const tagPlan = [[bts], [promo], [launch, bts], [hiring], [launch], [promo, evergreen], [launch], [evergreen], [bts], [hiring], []];
  const created = db.posts.slice(-tagPlan.length);
  created.forEach((p, i) => (p.tagIds = tagPlan[i].map((t) => t.id)));

  db.notifications.push(
    { id: id("ntf"), workspaceId: ws.id, kind: "published", postId: db.posts[db.posts.length - 10]?.id ?? null, accountId: null, createdAt: p2, read: false },
    { id: id("ntf"), workspaceId: ws.id, kind: "failed", postId: null, accountId: yt.id, createdAt: p3, read: false },
    { id: id("ntf"), workspaceId: ws.id, kind: "needs_reconnect", postId: null, accountId: li.id, createdAt: new Date(now - DAY).toISOString(), read: true },
  );
}

function seedDb(): Db {
  const now = Date.now();
  const tz = browserTimeZone();
  const db: Db = { users: {}, workspaces: {}, accounts: [], posts: [], invites: [], notifications: [], tags: [], aiUsage: {}, aiImages: [] };

  const demo = { ...newUser(DEMO_EMAIL, "Alex Morgan", true), onboardedAt: new Date(now - 30 * DAY).toISOString(), persona: "agency" as const };
  const sara = newUser("sara@example.com", "Sara Khan", true);
  const omar = newUser("omar@example.com", "Omar Farooq", true);
  db.users[demo.id] = demo;
  db.users[sara.id] = sara;
  db.users[omar.id] = omar;

  const studio = newWorkspace("Northwind Studio", "agency", "pro", demo.id, now);
  studio.members[sara.id] = { role: "editor", joinedAt: new Date(now - 12 * DAY).toISOString() };
  studio.members[omar.id] = { role: "reviewer", joinedAt: new Date(now - 4 * DAY).toISOString() };
  const client = newWorkspace("Acme Coffee", "client", "free", demo.id, now);
  db.workspaces[studio.id] = studio;
  db.workspaces[client.id] = client;

  seedWorkspaceContent(db, studio, demo.id, now, tz);
  seedTags(db, client.id, now);
  db.invites.push({
    id: id("inv"),
    workspaceId: studio.id,
    email: "client@acme.example",
    role: "reviewer",
    createdAt: new Date(now - DAY).toISOString(),
    expiresAt: new Date(now + 6 * DAY).toISOString(),
  });
  return db;
}

const DEFAULT_TAGS: Array<{ name: string; color: TagColor }> = [
  { name: "Launch", color: "green" },
  { name: "Hiring", color: "blue" },
  { name: "Behind the scenes", color: "peach" },
  { name: "Promo", color: "rose" },
  { name: "Evergreen", color: "violet" },
];

function seedTags(db: Db, workspaceId: string, now: number): Tag[] {
  const tags = DEFAULT_TAGS.map((t) => ({ id: id("tag"), workspaceId, name: t.name, color: t.color, createdAt: new Date(now).toISOString() }));
  db.tags.push(...tags);
  return tags;
}

// Brings data saved by an older preview build up to date, so a signed-in session survives.
function normalize(db: Db): Db {
  db.tags ??= [];
  db.aiUsage ??= {};
  db.aiImages ??= [];
  for (const ws of Object.values(db.workspaces)) {
    if (!db.tags.some((t) => t.workspaceId === ws.id)) seedTags(db, ws.id, Date.now());
  }
  for (const p of db.posts) {
    p.tagIds ??= [];
    p.aiGenerated ??= false;
    for (const t of p.targets) t.options ??= null;
  }
  return db;
}

// ---------------------------------------------------------------------------
// Idempotency: same key returns the same in-flight or finished result (DBL-03).

const intents = new Map<string, Promise<unknown>>();

function once<T>(scope: string, key: string | undefined, run: () => Promise<T>): Promise<T> {
  if (!key) return run();
  const k = `${scope}:${key}`;
  const existing = intents.get(k);
  if (existing) return existing as Promise<T>;
  const p = run().catch((e) => {
    intents.delete(k); // a failed attempt may be retried with the same key
    throw e;
  });
  intents.set(k, p);
  return p;
}

// Simulated publishing: the job runner would do this in the backend.
function simulatePublish(postId: string) {
  setTimeout(() => {
    mutate((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return;
      const now = new Date().toISOString();
      post.targets = post.targets.map((t) => {
        if (t.status !== "publishing" && t.status !== "queued") return t;
        const account = db.accounts.find((a) => a.id === t.socialAccountId);
        if (!account || account.status !== "active") {
          return {
            ...t,
            status: "failed",
            errorCode: "permission_revoked",
            errorMessage: "Access to this account was revoked. Reconnect it and retry.",
          };
        }
        return { ...t, status: "published", publishedAt: now, providerUrl: "https://example.com/post", errorCode: null, errorMessage: null };
      });
      post.status = deriveStatus(post.targets, post.status);
      post.updatedAt = now;
      db.notifications.unshift({
        id: id("ntf"),
        workspaceId: post.workspaceId,
        kind: post.status === "published" ? "published" : "failed",
        postId: post.id,
        accountId: null,
        createdAt: now,
        read: false,
      });
    });
  }, 1500);
}

// Stands in for the every-minute due scan (BACKEND.md §8.2).
function runDueScan(db: Db) {
  const now = Date.now();
  for (const post of db.posts) {
    if (post.status !== "scheduled" || !post.scheduledAt || Date.parse(post.scheduledAt) > now) continue;
    post.targets = post.targets.map((t) => {
      if (t.status !== "pending") return t;
      const account = db.accounts.find((a) => a.id === t.socialAccountId);
      return account?.status === "active"
        ? { ...t, status: "published", publishedAt: post.scheduledAt, providerUrl: "https://example.com/post" }
        : { ...t, status: "failed", errorCode: "permission_revoked", errorMessage: "Access to this account was revoked. Reconnect it and retry." };
    });
    post.status = deriveStatus(post.targets, "failed");
  }
}

function nextQueueSlot(db: Db, wsId: string, timeZone: string): string {
  const slots = ["09:00", "13:00", "17:00"];
  const taken = new Set(db.posts.filter((p) => p.workspaceId === wsId && p.scheduledAt).map((p) => p.scheduledAt));
  const earliest = Date.now() + 15 * 60_000;
  for (let d = 0; d < 60; d++) {
    const day = utcToZoned(new Date(Date.now() + d * DAY), timeZone).date;
    for (const slot of slots) {
      const r = zonedToUtc(day, slot, timeZone);
      if (r.ok && r.utc.getTime() > earliest && !taken.has(r.utc.toISOString())) return r.utc.toISOString();
    }
  }
  return new Date(earliest).toISOString();
}

function applyInput(db: Db, post: Post, input: PostInput, wsId: string) {
  const accounts = db.accounts.filter((a) => a.workspaceId === wsId && input.accountIds.includes(a.id));
  if (accounts.length === 0 && input.intent !== "draft") {
    throw new ApiError("validation_failed", "Choose at least one account.", { field: "accountIds" });
  }
  const blocked = accounts.find((a) => a.status !== "active");
  if (blocked && input.intent !== "draft") {
    throw new ApiError("validation_failed", "One of the selected accounts needs reconnecting.", { field: "accountIds", accountId: blocked.id });
  }

  let scheduledAt = input.scheduledAt;
  let status: PostStatus = "draft";
  if (input.intent === "schedule") {
    if (!scheduledAt || Date.parse(scheduledAt) <= Date.now()) {
      throw new ApiError("validation_failed", "The scheduled time is in the past.", { field: "scheduledAt", reason: "past" });
    }
    status = "scheduled";
  } else if (input.intent === "queue") {
    scheduledAt = nextQueueSlot(db, wsId, input.timezone ?? "UTC");
    status = "scheduled";
  } else if (input.intent === "now") {
    scheduledAt = new Date().toISOString();
    status = "publishing";
  }

  post.type = input.type;
  post.mainCaption = input.mainCaption;
  post.media = input.media;
  post.tagIds = input.tagIds.filter((tagId) => db.tags.some((t) => t.id === tagId && t.workspaceId === wsId));
  post.aiGenerated = input.aiGenerated;
  post.scheduledAt = scheduledAt;
  post.timezone = input.timezone;
  post.status = status;
  post.targets = accounts.map((a) => ({
    id: post.targets.find((t) => t.socialAccountId === a.id)?.id ?? id("tgt"),
    socialAccountId: a.id,
    provider: a.provider,
    captionOverride: input.captionOverrides[a.id]?.trim() ? input.captionOverrides[a.id] : null,
    status: status === "publishing" ? "queued" : "pending",
    errorCode: null,
    errorMessage: null,
    providerUrl: null,
    publishedAt: null,
    // Older clients may not send options; keep whatever the post already had.
    options: input.targetOptions?.[a.id] ?? post.targets.find((t) => t.socialAccountId === a.id)?.options ?? null,
  }));
  post.updatedAt = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Sample writer for preview mode. It fills templates from the prompt so the AI panel can be
// exercised end to end; the real service (BACKEND.md §16) replaces it.

const STOP_WORDS = new Set([
  "about", "after", "again", "their", "there", "these", "those", "which", "where", "while", "would",
  "could", "should", "write", "promote", "people", "something", "really", "today", "tomorrow",
]);

function keywordTags(prompt: string): string[] {
  const words = prompt.toLowerCase().match(/[\p{L}\p{N}]{5,}/gu) ?? [];
  return [...new Set(words)]
    .filter((w) => !STOP_WORDS.has(w))
    .slice(0, 2)
    .map((w) => `#${w.charAt(0).toUpperCase()}${w.slice(1)}`);
}

// Clauses like "friendly tone" or "keep it short" steer the writing; they are not the topic.
const INSTRUCTION = /\b(tone|voice|emojis?|hashtags?|keep it|make it)\b|^(short|brief|concise|punchy|casual|formal|friendly|playful|professional|fun|warm)$/i;

function topicOf(prompt: string): string {
  const clauses = prompt
    .trim()
    .replace(/\s+/g, " ")
    .split(/\s*[,;]\s*|(?<=[.!?…])\s+/)
    .map((c) => c.replace(/[.!?…]+$/, "").trim())
    .filter(Boolean);
  const kept = clauses.filter((c) => !INSTRUCTION.test(c));
  const t = (kept.length > 0 ? kept : clauses).join(", ");
  return t.charAt(0).toLowerCase() + t.slice(1);
}

const OPENERS = [
  (topic: string) => `Big news: ${topic}.`,
  (topic: string) => `Here's what's new: ${topic}.`,
  (topic: string) => `We've been working on this: ${topic}.`,
  (topic: string) => `A quick update for you: ${topic}.`,
];
const MIDDLES = [
  "Here's why it matters, and how you can be part of it.",
  "We'd love to hear what you think.",
  "It took a real team effort, and we're proud of the result.",
  "If this sounds useful, now is a great time to take a look.",
];
const CLOSERS = [
  "Tell us what you think in the comments. 👇",
  "Know someone who'd like this? Share it with them.",
  "Save this post so you can find it later.",
  "Follow along for more updates.",
];

// Trims to the limit at a word boundary.
function fitText(text: string, maxLength: number): string {
  if (Array.from(text).length <= maxLength) return text;
  const chars = Array.from(text).slice(0, Math.max(0, maxLength - 1)).join("");
  const cut = chars.lastIndexOf(" ");
  return `${chars.slice(0, cut > 0 ? cut : chars.length).trimEnd()}…`;
}

function splitHashtags(text: string): { body: string; tags: string } {
  const lines = text.trim().split("\n");
  const last = lines[lines.length - 1] ?? "";
  if (lines.length > 1 && /^(#[\p{L}\p{N}_]+\s*)+$/u.test(last.trim())) {
    return { body: lines.slice(0, -1).join("\n").trim(), tags: last.trim() };
  }
  return { body: text.trim(), tags: "" };
}

function joinHashtags(body: string, tags: string) {
  return tags ? `${body}\n\n${tags}` : body;
}

function sentencesOf(body: string): string[] {
  return body.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [body];
}

function sampleDraft(prompt: string, attempt: number): string {
  const topic = topicOf(prompt);
  const body = [OPENERS[attempt % 4](topic), MIDDLES[(attempt + 1) % 4], CLOSERS[(attempt + 2) % 4]].join(" ");
  return joinHashtags(body, keywordTags(topic).join(" "));
}

function sampleRewrite(text: string, action: AiRewriteAction, attempt: number): string {
  const { body, tags } = splitHashtags(text);
  const sentences = sentencesOf(body);
  let next = body;
  if (action === "shorten") {
    next =
      sentences.length > 1
        ? sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(" ")
        : body.split(" ").slice(0, 12).join(" ");
  } else if (action === "expand") {
    const extra = [...MIDDLES, ...CLOSERS].find((s) => !body.includes(s)) ?? MIDDLES[attempt % 4];
    next = `${body} ${extra}`;
  } else if (action === "casual") {
    next = body
      .replace(/\bWe have\b/g, "We've")
      .replace(/\bwe have\b/g, "we've")
      .replace(/\bIt is\b/g, "It's")
      .replace(/\bit is\b/g, "it's")
      .replace(/\bdo not\b/g, "don't")
      .replace(/\byou are\b/g, "you're")
      .replace(/^We are pleased to share:/, "Guess what:");
    if (!/\p{Extended_Pictographic}/u.test(next)) next = `${next} 🙌`;
  } else if (action === "formal") {
    next = body
      .replace(/\p{Extended_Pictographic}️?/gu, "")
      .replace(/\bWe've\b/g, "We have")
      .replace(/\bwe've\b/g, "we have")
      .replace(/\bIt's\b/g, "It is")
      .replace(/\bit's\b/g, "it is")
      .replace(/\bdon't\b/g, "do not")
      .replace(/\byou're\b/g, "you are")
      .replace(/\bHere's\b/g, "Here is")
      .replace(/^Big news:/, "We are pleased to share:")
      .replace(/!/g, ".")
      .replace(/\s{2,}/g, " ")
      .trim();
  } else {
    // Rephrase: rotate the sentences and swap the opener.
    const rotated = sentences.length > 2 ? [sentences[0], ...sentences.slice(2), sentences[1]] : sentences;
    next = rotated
      .join(" ")
      .replace(/^(Big news|Here's what's new|A quick update for you):/, ["Fresh from the team:", "Worth knowing:", "Just in:"][attempt % 3]);
  }
  return joinHashtags(next.trim(), tags);
}

function toAiImage(stored: AiImage & { workspaceId: string }): AiImage {
  const { id, prompt, style, aspect, quality, createdAt, media } = stored;
  return { id, prompt, style, aspect, quality, createdAt, media };
}

// The same monthly rule as the server (reserve_ai_credits): the plan's credits per UTC
// calendar month, charged before the work runs.
function aiCredits(db: Db, ws: string): AiCredits {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const used = db.aiUsage[ws]?.month === month ? db.aiUsage[ws].used : 0;
  const limit = getPlan(db.workspaces[ws]?.planKey ?? "free").aiCredits;
  return {
    limit,
    bonus: 0,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

function spendCredits(db: Db, ws: string, amount: number): AiCredits {
  const credits = aiCredits(db, ws);
  if (credits.remaining < amount) {
    throw new ApiError("plan_limit_reached", "You do not have enough AI credits left this month.", {
      reason: "ai_credits",
      needed: amount,
      remaining: credits.remaining,
    });
  }
  db.aiUsage[ws] = { month: new Date().toISOString().slice(0, 7), used: credits.used + amount };
  return aiCredits(db, ws);
}

function refundCredits(ws: string, amount: number) {
  mutate((db) => {
    const usage = db.aiUsage[ws];
    if (usage) usage.used = Math.max(0, usage.used - amount);
  });
}

const aiAttempts = new Map<string, number>();

function nextAttempt(key: string) {
  const n = aiAttempts.get(key) ?? 0;
  aiAttempts.set(key, n + 1);
  return n;
}

// ---------------------------------------------------------------------------

export const mockClient: ApiClient = {
  auth: {
    async session() {
      await sleep(20);
      const db = load();
      const userId = readSessionUserId();
      const user = userId ? db.users[userId] : undefined;
      return user ? sessionFor(db, user) : null;
    },
    async signIn({ email }) {
      await latency();
      const db = load();
      const user = Object.values(db.users).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) throw new ApiError("unauthenticated", "That email and password do not match.");
      if (!user.emailVerified) throw new ApiError("forbidden", "Confirm your email before signing in.", { reason: "email_not_confirmed" });
      writeSession(user.id);
      return sessionFor(db, user);
    },
    async signUp({ displayName, email }) {
      await latency();
      return mutate((db) => {
        const normalized = email.trim().toLowerCase();
        const existing = Object.values(db.users).find((u) => u.email.toLowerCase() === normalized);
        // Neutral message: do not reveal whether an address is registered (F1 edge case).
        if (existing) throw new ApiError("conflict", "If this address can be used, we have sent it a code.");
        const now = Date.now();
        const user = newUser(normalized, displayName.trim(), false);
        db.users[user.id] = user;
        const ws = newWorkspace(`${user.displayName.split(" ")[0]}'s workspace`, "personal", "free", user.id, now);
        db.workspaces[ws.id] = ws;
        seedTags(db, ws.id, now);
        // Like the real API: no session until the emailed code is entered.
        return { ...sessionFor(db, user), workspaces: [], dev: { code: PREVIEW_CODE } };
      });
    },
    async signOut() {
      await sleep(40);
      writeSession(null);
    },
    async requestPasswordReset() {
      await latency();
      return { retryAfterSec: 60, dev: { code: PREVIEW_CODE } };
    },
    async resetPassword({ code }) {
      await latency();
      if (code !== PREVIEW_CODE) throw new ApiError("validation_failed", "That code is wrong or has expired.", { reason: "invalid_code" });
    },
    async resendVerification() {
      await latency();
      return { retryAfterSec: 60, dev: { code: PREVIEW_CODE } };
    },
    async verifyEmail({ email, code }) {
      await latency();
      return mutate((db) => {
        const user = Object.values(db.users).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user || code !== PREVIEW_CODE) throw new ApiError("validation_failed", "That code is wrong or has expired.", { reason: "invalid_code" });
        user.emailVerified = true;
        writeSession(user.id);
        return sessionFor(db, user);
      });
    },
  },

  me: {
    async update(patch) {
      await latency();
      return mutate((db) => {
        const user = requireUser(db);
        Object.assign(user, patch);
        return user;
      });
    },
  },

  accounts: {
    async list(ws) {
      await latency();
      const db = load();
      requireMember(db, ws);
      return db.accounts.filter((a) => a.workspaceId === ws && a.status !== "revoked");
    },
    connect(ws, provider, opts) {
      return once("connect", opts?.idempotencyKey, async (): Promise<ConnectResult> => {
        await sleep(350); // stands in for the platform consent screen round trip
        return mutate((db) => {
          const { ws: workspace } = requireMember(db, ws, ["owner", "admin"]);
          const count = db.accounts.filter((a) => a.workspaceId === ws && a.status !== "revoked").length;
          if (count >= workspace.accountLimit) {
            throw new ApiError("plan_limit_reached", `Your plan allows ${workspace.accountLimit} accounts.`, { limit: workspace.accountLimit });
          }
          const n = db.accounts.filter((a) => a.provider === provider).length + 1;
          const account: SocialAccount = {
            id: id("acc"),
            workspaceId: ws,
            provider,
            displayName: `Your brand ${n}`,
            handle: `@yourbrand${n > 1 ? n : ""}`,
            status: "active",
            createdAt: new Date().toISOString(),
          };
          db.accounts.push(account);
          return { kind: "connected" as const, account };
        });
      });
    },
    async reconnect(ws, accountId) {
      await sleep(350);
      return mutate((db) => {
        requireMember(db, ws, ["owner", "admin"]);
        const account = db.accounts.find((a) => a.id === accountId && a.workspaceId === ws);
        if (!account) throw new ApiError("not_found", "This account no longer exists.");
        account.status = "active";
        return { kind: "connected" as const, account };
      });
    },
    async remove(ws, accountId) {
      await latency();
      mutate((db) => {
        requireMember(db, ws, ["owner", "admin"]);
        db.accounts = db.accounts.filter((a) => a.id !== accountId);
        for (const post of db.posts) {
          post.targets = post.targets.map((t) =>
            t.socialAccountId === accountId && t.status === "pending" ? { ...t, status: "skipped" } : t,
          );
        }
      });
    },
    async insights(ws, accountId, { days, timezone }) {
      await latency();
      const db = load();
      requireMember(db, ws);
      const account = db.accounts.find((a) => a.id === accountId && a.workspaceId === ws && a.status !== "revoked");
      if (!account) throw new ApiError("not_found", "This account no longer exists.");
      const own = db.posts.flatMap((p) =>
        p.targets
          .filter((t) => t.socialAccountId === accountId && t.status === "published" && t.publishedAt)
          .map((t) => ({ postId: p.id, caption: t.captionOverride ?? p.mainCaption, type: p.type, publishedAt: t.publishedAt!, url: t.providerUrl })),
      );
      return sampleInsights(account, own, days, timezone, Date.now());
    },
    // The sample posts carry no platform id (ref), so the preview never opens replies.
    async comments() {
      await latency();
      throw new ApiError("not_configured", "Replies are not part of the sample data.");
    },
    async reply() {
      await latency();
      throw new ApiError("not_configured", "Replies are not part of the sample data.");
    },
    // A plausible public creator, so the sample composer shows TikTok's settings.
    async creatorInfo(ws, accountId) {
      await latency();
      const db = load();
      requireMember(db, ws);
      const account = db.accounts.find((a) => a.id === accountId && a.workspaceId === ws);
      if (!account) throw new ApiError("not_found", "This account no longer exists.");
      return {
        avatarUrl: null,
        username: (account.handle ?? "creator").replace(/^@/, ""),
        nickname: account.displayName,
        privacyOptions: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
        commentDisabled: false,
        duetDisabled: false,
        stitchDisabled: false,
        maxVideoSeconds: 600,
      };
    },
  },

  posts: {
    async list(ws, filter = {}) {
      await latency();
      const db = mutate((d) => {
        runDueScan(d);
        return d;
      });
      requireMember(db, ws);
      return db.posts
        .filter((p) => p.workspaceId === ws && matchesFilter(p, filter))
        .sort((a, b) => (b.scheduledAt ?? b.updatedAt).localeCompare(a.scheduledAt ?? a.updatedAt));
    },
    async get(ws, postId) {
      await latency();
      const db = load();
      requireMember(db, ws);
      const post = db.posts.find((p) => p.id === postId && p.workspaceId === ws);
      if (!post) throw new ApiError("not_found", "This post does not exist or was deleted.");
      return post;
    },
    create(ws, input, opts) {
      return once("post.create", opts?.idempotencyKey, async () => {
        await latency();
        const post = mutate((db) => {
          const { user } = requireMember(db, ws, ["owner", "admin", "editor"]);
          const now = new Date().toISOString();
          const draft: Post = {
            id: id("pst"),
            workspaceId: ws,
            type: input.type,
            status: "draft",
            mainCaption: "",
            scheduledAt: null,
            timezone: null,
            version: 1,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now,
            targets: [],
            media: [],
            tagIds: [],
            aiGenerated: false,
          };
          applyInput(db, draft, input, ws);
          db.posts.push(draft);
          return draft;
        });
        if (post.status === "publishing") simulatePublish(post.id);
        return post;
      });
    },
    async update(ws, postId, input, version) {
      await latency();
      const post = mutate((db) => {
        requireMember(db, ws, ["owner", "admin", "editor"]);
        const existing = db.posts.find((p) => p.id === postId && p.workspaceId === ws);
        if (!existing) throw new ApiError("not_found", "This post does not exist or was deleted.");
        // Optimistic locking: never overwrite someone else's newer edit (DBL-07).
        if (existing.version !== version) {
          throw new ApiError("conflict", "Someone else changed this post.", { currentVersion: existing.version });
        }
        applyInput(db, existing, input, ws);
        existing.version += 1;
        return existing;
      });
      if (post.status === "publishing") simulatePublish(post.id);
      return post;
    },
    async reschedule(ws, postId, scheduledAt, version) {
      await latency();
      return mutate((db) => {
        requireMember(db, ws, ["owner", "admin", "editor"]);
        const post = db.posts.find((p) => p.id === postId && p.workspaceId === ws);
        if (!post) throw new ApiError("not_found", "This post does not exist or was deleted.");
        if (post.version !== version) throw new ApiError("conflict", "Someone else changed this post.");
        if (Date.parse(scheduledAt) <= Date.now()) {
          throw new ApiError("validation_failed", "The scheduled time is in the past.", { reason: "past" });
        }
        post.scheduledAt = scheduledAt;
        if (post.status === "lapsed" || post.status === "failed") post.status = "scheduled";
        post.version += 1;
        post.updatedAt = new Date().toISOString();
        return post;
      });
    },
    retry(ws, postId, opts) {
      return once("post.retry", opts?.idempotencyKey, async () => {
        await latency();
        const post = mutate((db) => {
          requireMember(db, ws, ["owner", "admin", "editor"]);
          const p = db.posts.find((x) => x.id === postId && x.workspaceId === ws);
          if (!p) throw new ApiError("not_found", "This post does not exist or was deleted.");
          p.targets = p.targets.map((t) =>
            t.status === "failed" || t.status === "pending" ? { ...t, status: "queued", errorCode: null, errorMessage: null } : t,
          );
          p.status = "publishing";
          p.version += 1;
          return p;
        });
        simulatePublish(post.id);
        return post;
      });
    },
    async remove(ws, postId) {
      await latency();
      mutate((db) => {
        requireMember(db, ws, ["owner", "admin", "editor"]);
        // A second delete of the same post is a no-op, not an error (DBL-21).
        db.posts = db.posts.filter((p) => !(p.id === postId && p.workspaceId === ws));
      });
    },
  },

  media: {
    upload(ws, file, onProgress): UploadHandle {
      let paused = false;
      let cancelled = false;
      let resumeWaiter: (() => void) | null = null;
      const promise = (async (): Promise<MediaSummary> => {
        requireMember(load(), ws, ["owner", "admin", "editor"]);
        const probe = await probeMedia(file);
        // Simulate a multipart upload: progress per part, pausable between parts.
        const parts = Math.min(40, Math.max(8, Math.ceil(file.size / (5 * 1024 * 1024))));
        for (let i = 1; i <= parts; i++) {
          if (cancelled) throw new ApiError("validation_failed", "Upload cancelled.", { reason: "cancelled" });
          if (paused) await new Promise<void>((r) => (resumeWaiter = r));
          if (cancelled) throw new ApiError("validation_failed", "Upload cancelled.", { reason: "cancelled" });
          // At least ~1.5 s in total, so small files still show their progress.
          await sleep(Math.max(25 + Math.random() * 35, 1500 / parts));
          onProgress(i / parts);
        }
        const mediaId = id("med");
        // Kept so the preview survives a reload (mock-media.ts).
        rememberUrl(mediaId, probe.objectUrl);
        await keepFile(mediaId, file);
        return {
          id: mediaId,
          kind: probe.kind,
          name: probe.name,
          bytes: probe.bytes,
          width: probe.width,
          height: probe.height,
          durationSec: probe.durationSec,
          previewUrl: probe.objectUrl,
        };
      })();
      return {
        promise,
        pause: () => {
          paused = true;
        },
        resume: () => {
          paused = false;
          resumeWaiter?.();
          resumeWaiter = null;
        },
        cancel: () => {
          cancelled = true;
          paused = false;
          resumeWaiter?.();
        },
      };
    },
  },

  members: {
    async list(ws) {
      await latency();
      const db = load();
      const { ws: workspace } = requireMember(db, ws);
      return Object.entries(workspace.members).map(([userId, m]): Member => {
        const u = db.users[userId];
        return { userId, displayName: u?.displayName ?? "—", email: u?.email ?? "", role: m.role, joinedAt: m.joinedAt };
      });
    },
    async invites(ws) {
      await latency();
      const db = load();
      requireMember(db, ws);
      return db.invites.filter((i) => i.workspaceId === ws);
    },
    invite(ws, input, opts) {
      return once("member.invite", opts?.idempotencyKey, async () => {
        await latency();
        return mutate((db) => {
          const { ws: workspace } = requireMember(db, ws, ["owner", "admin"]);
          const email = input.email.trim().toLowerCase();
          const seats = Object.keys(workspace.members).length + db.invites.filter((i) => i.workspaceId === ws).length;
          if (seats >= workspace.memberLimit) {
            throw new ApiError("plan_limit_reached", `Your plan allows ${workspace.memberLimit} seats.`, { limit: workspace.memberLimit });
          }
          const memberEmails = Object.keys(workspace.members).map((uid) => db.users[uid]?.email.toLowerCase());
          if (memberEmails.includes(email) || db.invites.some((i) => i.workspaceId === ws && i.email === email)) {
            throw new ApiError("conflict", "This person is already a member or has a pending invite.");
          }
          const now = Date.now();
          const invite = {
            id: id("inv"),
            workspaceId: ws,
            email,
            role: input.role,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 7 * DAY).toISOString(),
          };
          db.invites.push(invite);
          return invite;
        });
      });
    },
    async revokeInvite(ws, inviteId) {
      await latency();
      mutate((db) => {
        requireMember(db, ws, ["owner", "admin"]);
        db.invites = db.invites.filter((i) => !(i.id === inviteId && i.workspaceId === ws));
      });
    },
    async remove(ws, userId) {
      await latency();
      mutate((db) => {
        const { ws: workspace } = requireMember(db, ws, ["owner", "admin"]);
        if (workspace.members[userId]?.role === "owner") {
          throw new ApiError("forbidden", "The owner cannot be removed.");
        }
        delete workspace.members[userId];
      });
    },
  },

  tags: {
    async list(ws) {
      await latency();
      const db = load();
      requireMember(db, ws);
      return db.tags.filter((t) => t.workspaceId === ws).sort((a, b) => a.name.localeCompare(b.name));
    },
    create(ws, input, opts) {
      return once("tag.create", opts?.idempotencyKey, async () => {
        await latency();
        return mutate((db) => {
          requireMember(db, ws, ["owner", "admin", "editor"]);
          const name = input.name.trim().slice(0, 40);
          if (!name) throw new ApiError("validation_failed", "Give the tag a name.", { field: "name" });
          if (db.tags.some((t) => t.workspaceId === ws && t.name.toLowerCase() === name.toLowerCase())) {
            throw new ApiError("conflict", "A tag with this name already exists.");
          }
          const tag: Tag = { id: id("tag"), workspaceId: ws, name, color: input.color, createdAt: new Date().toISOString() };
          db.tags.push(tag);
          return tag;
        });
      });
    },
    async update(ws, tagId, patch) {
      await latency();
      return mutate((db) => {
        requireMember(db, ws, ["owner", "admin", "editor"]);
        const tag = db.tags.find((t) => t.id === tagId && t.workspaceId === ws);
        if (!tag) throw new ApiError("not_found", "This tag no longer exists.");
        if (patch.name !== undefined) {
          const name = patch.name.trim().slice(0, 40);
          if (!name) throw new ApiError("validation_failed", "Give the tag a name.", { field: "name" });
          if (db.tags.some((t) => t.workspaceId === ws && t.id !== tagId && t.name.toLowerCase() === name.toLowerCase())) {
            throw new ApiError("conflict", "A tag with this name already exists.");
          }
          tag.name = name;
        }
        if (patch.color) tag.color = patch.color;
        return tag;
      });
    },
    async remove(ws, tagId) {
      await latency();
      mutate((db) => {
        requireMember(db, ws, ["owner", "admin", "editor"]);
        db.tags = db.tags.filter((t) => !(t.id === tagId && t.workspaceId === ws));
        for (const p of db.posts) if (p.workspaceId === ws) p.tagIds = p.tagIds.filter((x) => x !== tagId);
      });
    },
  },

  ai: {
    async generate(ws, input) {
      await sleep(600 + Math.random() * 400);
      return mutate((db) => {
        requireMember(db, ws, ["owner", "admin", "editor"]);
        if (!input.prompt.trim()) throw new ApiError("validation_failed", "Describe what the post is about.", { field: "prompt" });
        const credits = spendCredits(db, ws, AI_COSTS.caption);
        const text = fitText(sampleDraft(input.prompt, nextAttempt(input.prompt)), input.maxLength);
        return { text, creditsRemaining: credits.remaining, creditsLimit: credits.limit };
      });
    },
    async rewrite(ws, input) {
      await sleep(500 + Math.random() * 300);
      return mutate((db) => {
        requireMember(db, ws, ["owner", "admin", "editor"]);
        const credits = spendCredits(db, ws, AI_COSTS.caption);
        const text = fitText(sampleRewrite(input.text, input.action, nextAttempt(input.text + input.action)), input.maxLength);
        return { text, creditsRemaining: credits.remaining, creditsLimit: credits.limit };
      });
    },
    async credits(ws) {
      await latency();
      const db = load();
      requireMember(db, ws);
      return aiCredits(db, ws);
    },
    images: {
      async list(ws) {
        await latency();
        const db = load();
        requireMember(db, ws);
        return db.aiImages.filter((i) => i.workspaceId === ws).map((i) => toAiImage(i));
      },
      generate(ws, input, opts) {
        return once("ai.images", opts?.idempotencyKey, async () => {
          const prompt = input.prompt.trim();
          if (!prompt) throw new ApiError("validation_failed", "Describe the image you want.", { field: "prompt" });
          if (prompt.length > PROMPT_MAX) throw new ApiError("validation_failed", "The description is too long.", { field: "prompt" });
          const count = Math.min(Math.max(1, Math.round(input.count)), MAX_IMAGES_PER_REQUEST);
          const cost = imageCost(input.quality, count);
          // Charged up front, like the server; refunded if drawing fails.
          mutate((db) => {
            requireMember(db, ws, ["owner", "admin", "editor"]);
            spendCredits(db, ws, cost);
          });
          try {
            await sleep(1400 + Math.random() * 900);
            const attempt = nextAttempt(`img:${prompt}`);
            const images: AiImage[] = [];
            for (let i = 0; i < count; i++) {
              const blob = await drawPlaceholder(prompt, input.style, input.aspect, attempt * MAX_IMAGES_PER_REQUEST + i);
              const mediaId = id("med");
              const url = URL.createObjectURL(blob);
              rememberUrl(mediaId, url);
              await keepFile(mediaId, blob);
              const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = () => resolve({ width: 0, height: 0 });
                img.src = url;
              });
              images.push({
                id: id("aii"),
                prompt,
                style: input.style,
                aspect: input.aspect,
                quality: input.quality,
                createdAt: new Date().toISOString(),
                media: { id: mediaId, kind: "image", name: `ai-${input.aspect.replace(":", "x")}-${i + 1}.jpg`, bytes: blob.size, width, height, durationSec: null, previewUrl: url },
              });
            }
            return mutate((db) => {
              db.aiImages.unshift(...images.map((image) => ({ ...image, workspaceId: ws })));
              return { images, credits: aiCredits(db, ws) };
            });
          } catch (e) {
            refundCredits(ws, cost);
            throw e;
          }
        });
      },
      async remove(ws, imageId) {
        await latency();
        mutate((db) => {
          requireMember(db, ws, ["owner", "admin", "editor"]);
          db.aiImages = db.aiImages.filter((i) => !(i.id === imageId && i.workspaceId === ws));
        });
      },
    },
  },

  billing: {
    createCheckout(ws, plan, interval, opts) {
      return once("billing.checkout", opts?.idempotencyKey, async () => {
        await latency();
        const db = load();
        requireMember(db, ws, ["owner"]);
        // Simulates the signed webhook arriving a few seconds after payment.
        setTimeout(() => {
          mutate((d) => {
            const workspace = d.workspaces[ws];
            if (!workspace) return;
            const p = getPlan(plan);
            workspace.planKey = plan;
            workspace.accountLimit = p.accounts;
            workspace.memberLimit = p.seats;
            workspace.subscription = {
              status: "active",
              interval,
              trialEndsAt: null,
              currentPeriodEnd: new Date(Date.now() + (interval === "year" ? 365 : 30) * DAY).toISOString(),
              cancelAt: null,
            };
          });
        }, 2000);
        const locale = document.documentElement.lang || "en";
        return { url: `/${locale}/dashboard/settings/billing?checkout=return&plan=${plan}` };
      });
    },
    async portal(ws) {
      await latency();
      requireMember(load(), ws, ["owner"]);
      throw new ApiError("not_configured", "The billing portal opens once payments are connected.");
    },
  },

  notifications: {
    async list(ws) {
      await latency();
      const db = load();
      requireMember(db, ws);
      return db.notifications.filter((n) => n.workspaceId === ws).slice(0, 20);
    },
    async markAllRead(ws) {
      await latency();
      mutate((db) => {
        requireMember(db, ws);
        db.notifications = db.notifications.map((n) => (n.workspaceId === ws ? { ...n, read: true } : n));
      });
    },
  },
};

export async function resetMockData() {
  try {
    localStorage.removeItem(DB_KEY);
    memo = null;
  } catch {
    // ignore
  }
  await clearFiles();
}

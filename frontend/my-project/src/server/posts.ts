import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { matchesFilter } from "@/lib/api/filter";
import type { Post, PostFilter, PostStatus } from "@/lib/api/types";
import { utcToZoned, zonedToUtc } from "@/lib/time";
import { signedUrls } from "./ai/storage";
import { fail } from "./errors";
import { POST_SELECT, toPost, type MediaRow, type PostRow } from "./mappers";
import { fromDb, must, uuid } from "./route";

const options = z
  .object({
    title: z.string().max(200).optional(),
    privacy: z.enum(["public", "unlisted", "private"]).optional(),
    madeForKids: z.boolean().optional(),
    notifySubscribers: z.boolean().optional(),
    embeddable: z.boolean().optional(),
  })
  .strict();

const zone = z
  .string()
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  });

export const postInput = z.object({
  type: z.enum(["text", "image", "video", "story"]),
  mainCaption: z.string().max(20_000),
  accountIds: z.array(uuid).max(50),
  captionOverrides: z.record(z.string(), z.string().max(20_000)).default({}),
  targetOptions: z.record(z.string(), options).default({}),
  // Only the ids matter; the server reads the files' facts itself.
  media: z.array(z.object({ id: z.string() })).max(35),
  intent: z.enum(["draft", "schedule", "now", "queue"]),
  scheduledAt: z.iso.datetime({ offset: true }).nullable(),
  timezone: zone.nullable(),
  tagIds: z.array(uuid).max(50).default([]),
  aiGenerated: z.boolean().default(false),
});

export type PostInputParsed = z.infer<typeof postInput>;

// AI images are private files; their previews get signed URLs, all in one request.
async function withPreviews(rows: PostRow[]): Promise<Post[]> {
  const posts = rows.map(toPost);
  const keys = new Map<string, string>();
  for (const row of rows) {
    for (const pm of row.post_media ?? []) {
      const m: MediaRow | undefined = Array.isArray(pm.media_assets) ? pm.media_assets[0] : (pm.media_assets ?? undefined);
      if (m?.source === "ai" && m.storage_key) keys.set(m.id, m.storage_key);
    }
  }
  if (keys.size === 0) return posts;
  const urls = await signedUrls([...keys.values()]);
  for (const post of posts) {
    for (const media of post.media) {
      const key = keys.get(media.id);
      if (key) media.previewUrl = urls.get(key) ?? null;
    }
  }
  return posts;
}

export async function getPost(db: SupabaseClient, workspaceId: string, postId: string): Promise<Post> {
  if (!uuid.safeParse(postId).success) throw fail.notFound();
  const row = must(await db.from("posts").select(POST_SELECT).eq("workspace_id", workspaceId).eq("id", postId).maybeSingle());
  return (await withPreviews([row as unknown as PostRow]))[0];
}

const isoDate = z.iso.datetime({ offset: true });
// PostgREST filter values with ":" or "," must be quoted; ISO timestamps have no quotes.
const quoted = (value: string) => `"${value}"`;
// ilike treats % and _ as wildcards; a search for "50%" means the characters.
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

// Newest first by scheduled time (or last edit), filtered like the preview mock does. The
// database applies the status, date and text filters, so a month in the calendar reads that
// month only; matchesFilter() then applies the exact rule (and tags) to what comes back.
export async function listPosts(db: SupabaseClient, workspaceId: string, filter: PostFilter): Promise<Post[]> {
  let query = db.from("posts").select(POST_SELECT).eq("workspace_id", workspaceId);
  const statuses = filter.status === undefined ? [] : [filter.status].flat();
  if (statuses.length) query = query.in("status", statuses);

  // A post's time is scheduled_at, or updated_at when it has none (drafts).
  const from = filter.from && isoDate.safeParse(filter.from).success ? quoted(filter.from) : null;
  const to = filter.to && isoDate.safeParse(filter.to).success ? quoted(filter.to) : null;
  if (from || to) {
    const range = (column: string) => [from ? `${column}.gte.${from}` : null, to ? `${column}.lt.${to}` : null].filter(Boolean).join(",");
    query = query.or(`and(${range("scheduled_at")}),and(scheduled_at.is.null,${range("updated_at")})`);
  }
  const q = filter.q?.trim();
  if (q) query = query.ilike("main_caption", `%${likeEscape(q)}%`);

  const rows = must(await query.order("updated_at", { ascending: false }).limit(1000)) as unknown as PostRow[];
  return (await withPreviews(rows))
    .filter((p) => matchesFilter(p, filter))
    .sort((a, b) => (b.scheduledAt ?? b.updatedAt).localeCompare(a.scheduledAt ?? a.updatedAt));
}

// Queue slots at 09:00, 13:00 and 17:00 in the post's timezone, the first free one at least
// 15 minutes away (same rule as the composer's preview).
async function nextQueueSlot(db: SupabaseClient, workspaceId: string, timeZone: string): Promise<string> {
  const taken = new Set(
    // Only future slots can collide, so past posts are never read.
    (must(await db.from("posts").select("scheduled_at").eq("workspace_id", workspaceId).eq("status", "scheduled").gte("scheduled_at", new Date().toISOString())) as Array<{
      scheduled_at: string | null;
    }>)
      .map((r) => (r.scheduled_at ? new Date(r.scheduled_at).toISOString() : ""))
      .filter(Boolean),
  );
  const earliest = Date.now() + 15 * 60_000;
  for (let d = 0; d < 60; d++) {
    const day = utcToZoned(new Date(Date.now() + d * 86_400_000), timeZone).date;
    for (const slot of ["09:00", "13:00", "17:00"]) {
      const r = zonedToUtc(day, slot, timeZone);
      if (r.ok && r.utc.getTime() > earliest && !taken.has(r.utc.toISOString())) return r.utc.toISOString();
    }
  }
  return new Date(earliest).toISOString();
}

export async function savePost(
  db: SupabaseClient,
  workspaceId: string,
  input: PostInputParsed,
  existing: { id: string; version: number } | null,
): Promise<Post> {
  let status: PostStatus = "draft";
  let scheduledAt = input.scheduledAt;

  if (input.intent === "now") throw fail.notConfigured("Publishing");
  if (input.intent !== "draft") {
    if (input.accountIds.length === 0) throw fail.validation("Choose at least one account.", { field: "accountIds" });
    const accounts = must(await db.from("social_accounts_public").select("id, status").eq("workspace_id", workspaceId).in("id", input.accountIds)) as Array<{
      id: string;
      status: string;
    }>;
    if (accounts.length !== input.accountIds.length) throw fail.validation("One of the selected accounts no longer exists.", { field: "accountIds" });
    const blocked = accounts.find((a) => a.status !== "active");
    if (blocked) throw fail.validation("One of the selected accounts needs reconnecting.", { field: "accountIds", accountId: blocked.id });
    status = "scheduled";
    if (input.intent === "queue") {
      scheduledAt = await nextQueueSlot(db, workspaceId, input.timezone ?? "UTC");
    } else if (!scheduledAt || Date.parse(scheduledAt) <= Date.now()) {
      throw fail.validation("The scheduled time is in the past.", { field: "scheduledAt", reason: "past" });
    }
  }

  const payload = {
    type: input.type,
    status,
    mainCaption: input.mainCaption,
    scheduledAt,
    timezone: input.timezone,
    aiGenerated: input.aiGenerated,
    accountIds: input.accountIds,
    captionOverrides: input.captionOverrides,
    targetOptions: input.targetOptions,
    tagIds: input.tagIds,
    mediaIds: input.media.map((m) => m.id).filter((id) => uuid.safeParse(id).success),
  };
  const { data, error } = await db.rpc("save_post", {
    p_workspace_id: workspaceId,
    p_post_id: existing?.id ?? null,
    p_expected_version: existing?.version ?? null,
    p_input: payload,
  });
  if (error) throw fromDb(error);
  return getPost(db, workspaceId, data as string);
}

// The If-Match header carries the version the editor read (optimistic locking, 4.2).
export function expectedVersion(header: string | null): number {
  const version = Number(header);
  if (!header || !Number.isInteger(version) || version < 1) throw fail.validation("The If-Match header with the post version is required.");
  return version;
}

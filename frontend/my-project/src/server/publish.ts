import "server-only";
import type { TargetOptions } from "@/lib/api/types";
import { getPlatform, type PlatformId } from "@/providers/catalog";
import { readImage } from "./ai/storage";
import { decrypt, type KeyRing } from "./crypto";
import { tokenKeys } from "./env";
import { readMedia } from "./media/storage";
import { BlueskyError, login, publish as publishToBluesky } from "./providers/bluesky";
import { creatorInfo, explain, postStatus, startDirectPost, TikTokError } from "./providers/tiktok";
import { must, ok } from "./route";
import { adminClient } from "./supabase";
import { freshToken, pullUrl } from "./tiktok";

// Sends one post to every account it targets (BACKEND.md §8). The post is claimed first
// (scheduled -> publishing), so a double click or a repeated job never posts twice. Each
// account gets its own result: published with the platform's link, or failed with a plain
// reason. The post ends as published, partial or failed.

type MediaRow = { position: number; media_assets: { kind: string; storage_key: string; source: "upload" | "ai" } | null };
type TargetRow = {
  id: string;
  provider: PlatformId;
  caption_override: string | null;
  options: TargetOptions | null;
  social_accounts: {
    id: string;
    workspace_id: string;
    provider_account_id: string;
    access_token_enc: string | null;
    refresh_token_enc: string | null;
    expires_at: string | null;
    metadata: { pds?: string } | null;
  } | null;
};
const TARGET_SELECT =
  "id, provider, caption_override, options, social_accounts(id, workspace_id, provider_account_id, access_token_enc, refresh_token_enc, expires_at, metadata)";

class PublishError extends Error {
  constructor(
    public code: string,
    message: string,
    public reconnect = false,
  ) {
    super(message);
  }
}

async function toBluesky(ring: KeyRing, target: TargetRow, caption: string, media: MediaRow[]) {
  const account = target.social_accounts;
  if (!account?.access_token_enc) throw new PublishError("auth", "Reconnect this Bluesky account.", true);
  const files = media.flatMap((m) => (m.media_assets ? [m.media_assets] : []));
  if (files.some((f) => f.kind === "video")) throw new PublishError("unsupported", "Video posts to Bluesky are not supported yet. Post photos or text.");
  try {
    const session = await login(account.provider_account_id, decrypt(ring, account.access_token_enc), account.metadata?.pds);
    const images = await Promise.all(files.slice(0, 4).map(async (f) => ({ bytes: f.source === "ai" ? await readImage(f.storage_key) : await readMedia(f.storage_key) })));
    return await publishToBluesky(session, caption, images);
  } catch (e) {
    if (e instanceof BlueskyError) {
      if (e.code === "auth") throw new PublishError("auth", "Bluesky refused the app password. Reconnect the account.", true);
      if (e.code === "rate_limited") throw new PublishError("rate_limited", "Bluesky is limiting posts right now. Try again later.");
      throw new PublishError(e.code, `Bluesky said: ${e.message}`);
    }
    throw e;
  }
}

// --- TikTok (Content Posting API, Direct Post; src/server/providers/tiktok.ts) ----------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// How long a send waits for TikTok to finish; the minute check follows up after that, for
// up to CHECK_FOR_MS.
const TIKTOK_WAIT_MS = 45_000;
const CHECK_FOR_MS = 2 * 3600_000;
// Thrown when TikTok accepted the video but has not finished: the account is marked
// needs_check with the publish id, and resolveTikTokChecks finishes the job.
class StillProcessing extends Error {
  constructor(public publishId: string) {
    super("TikTok is still processing this video. It can take a few minutes to appear on the profile.");
  }
}

async function toTikTok(target: TargetRow, caption: string, media: MediaRow[], aiGenerated: boolean) {
  const account = target.social_accounts;
  if (!account?.access_token_enc) throw new PublishError("auth", "Reconnect this TikTok account.", true);
  const files = media.flatMap((m) => (m.media_assets ? [m.media_assets] : []));
  if (files.length !== 1 || files[0].kind !== "video" || files[0].source !== "upload") {
    throw new PublishError("unsupported", "TikTok posts from AgentiqSocial need exactly one video.");
  }
  const o = target.options ?? {};
  // The person chooses who can view; TikTok forbids a default (Content Sharing Guidelines).
  if (!o.audience) throw new PublishError("content_rejected", "Choose who can view this TikTok post, then post it again.");
  if (o.disclose && !o.ownBrand && !o.paidPartnership) throw new PublishError("content_rejected", "Say whether the video promotes your brand, another brand, or both.");
  try {
    const token = await freshToken(account);
    // Read again right before posting: the creator's settings may have changed.
    const creator = await creatorInfo(token);
    if (!creator.privacyOptions.includes(o.audience)) throw new PublishError("privacy_level_option_mismatch", explain("privacy_level_option_mismatch"));
    const publishId = await startDirectPost(token, {
      title: caption.slice(0, 2200),
      privacyLevel: o.audience,
      disableComment: !o.allowComments || creator.commentDisabled,
      disableDuet: !o.allowDuet || creator.duetDisabled,
      disableStitch: !o.allowStitch || creator.stitchDisabled,
      brandContent: !!(o.disclose && o.paidPartnership),
      brandOrganic: !!(o.disclose && o.ownBrand),
      aiGenerated,
      videoUrl: pullUrl(files[0].storage_key),
    });
    for (const started = Date.now(); Date.now() - started < TIKTOK_WAIT_MS; ) {
      await sleep(5_000);
      const s = await postStatus(token, publishId);
      if (s.status === "PUBLISH_COMPLETE") return { id: s.postId ?? publishId, url: s.postId ? `https://www.tiktok.com/@${creator.username}/video/${s.postId}` : null };
      if (s.status === "FAILED") throw new PublishError(s.failReason ?? "failed", explain(s.failReason ?? ""), s.failReason === "auth_removed");
    }
    throw new StillProcessing(publishId);
  } catch (e) {
    if (e instanceof TikTokError) {
      const reconnect = e.code === "access_token_invalid" || e.code === "scope_not_authorized" || e.code === "invalid_grant";
      throw new PublishError(reconnect ? "permission_revoked" : e.code, explain(reconnect ? "access_token_invalid" : e.code), reconnect);
    }
    throw e;
  }
}

type Claimable = "scheduled" | "lapsed" | "failed" | "partial";
type Outcome = "published" | "partial" | "failed";

// Step 1, the claim: the post moves to publishing from one of `from` in one statement, so of
// two runs (a double click, a repeated job, the minute check) only one gets it. A retry also
// puts the failed accounts back in line. False when the post was not in `from`.
async function claimPost(workspaceId: string, postId: string, from: readonly Claimable[]): Promise<boolean> {
  const admin = adminClient();
  const claimed = must(
    await admin.from("posts").update({ status: "publishing", updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("id", postId).in("status", from).select("id"),
  ) as unknown[];
  if (claimed.length === 0) return false;
  if (from.includes("failed") || from.includes("partial")) {
    ok(
      await admin
        .from("post_targets")
        .update({ status: "pending", error_code: null, error_message: null })
        .eq("workspace_id", workspaceId)
        .eq("post_id", postId)
        .eq("status", "failed"),
    );
  }
  return true;
}

// Step 2, the send, for a post already claimed: each waiting account is claimed on its own
// before it is sent, so a job that runs twice never posts to an account twice. The post gets
// its final status once no account is still on its way; null while another run is still
// sending, or when the post is not being published.
export async function sendClaimedPost(workspaceId: string, postId: string): Promise<Outcome | null> {
  const admin = adminClient();
  const post = (
    await admin
      .from("posts")
      .select("main_caption, status, ai_generated")
      .eq("workspace_id", workspaceId)
      .eq("id", postId)
      .maybeSingle<{ main_caption: string; status: string; ai_generated: boolean }>()
  ).data;
  if (post?.status !== "publishing") return null;

  const targets = must(
    await admin.from("post_targets").select(TARGET_SELECT).eq("workspace_id", workspaceId).eq("post_id", postId).in("status", ["pending", "queued"]),
  ) as unknown as TargetRow[];
  const media = (
    must(await admin.from("post_media").select("position, media_assets(kind, storage_key, source)").eq("workspace_id", workspaceId).eq("post_id", postId)) as unknown as MediaRow[]
  ).sort((a, b) => a.position - b.position);

  let ring: KeyRing | null = null;
  for (const target of targets) {
    const mine = must(await admin.from("post_targets").update({ status: "publishing" }).eq("id", target.id).in("status", ["pending", "queued"]).select("id")) as unknown[];
    if (mine.length === 0) continue;
    try {
      const caption = target.caption_override ?? post.main_caption;
      let result: { id: string; url: string | null };
      if (target.provider === "bluesky") {
        ring ??= tokenKeys();
        result = await toBluesky(ring, target, caption, media);
      } else if (target.provider === "tiktok") {
        result = await toTikTok(target, caption, media, post.ai_generated);
      } else {
        throw new PublishError("unsupported", `Publishing to ${getPlatform(target.provider).name} is not available yet.`);
      }
      ok(
        await admin
          .from("post_targets")
          .update({ status: "published", provider_post_id: result.id, provider_url: result.url, published_at: new Date().toISOString(), error_code: null, error_message: null })
          .eq("id", target.id),
      );
    } catch (e) {
      if (e instanceof StillProcessing) {
        // next_retry_at holds the deadline: after it, resolveTikTokChecks gives up.
        ok(
          await admin
            .from("post_targets")
            .update({ status: "needs_check", provider_post_id: e.publishId, error_code: null, error_message: e.message, next_retry_at: new Date(Date.now() + CHECK_FOR_MS).toISOString() })
            .eq("id", target.id),
        );
        continue;
      }
      const known = e instanceof PublishError;
      if (!known) console.error("[publish]", target.provider, e instanceof Error ? e.message : e);
      ok(
        await admin
          .from("post_targets")
          .update({ status: "failed", error_code: known ? e.code : "internal", error_message: known ? e.message : "Something went wrong while posting." })
          .eq("id", target.id),
      );
      if (known && e.reconnect && target.social_accounts) {
        ok(await admin.from("social_accounts").update({ status: "needs_reconnect" }).eq("id", target.social_accounts.id));
      }
    }
  }

  return finalizePost(workspaceId, postId);
}

// The post's status from its accounts, once none is still on its way. Counted over every
// account, so a retry that fixes the last failed one ends as published. A TikTok video still
// processing (needs_check) keeps the post publishing until resolveTikTokChecks settles it.
export async function finalizePost(workspaceId: string, postId: string): Promise<Outcome | null> {
  const admin = adminClient();
  const all = must(await admin.from("post_targets").select("status").eq("workspace_id", workspaceId).eq("post_id", postId).neq("status", "skipped")) as Array<{
    status: string;
  }>;
  if (all.some((t) => ["pending", "queued", "publishing", "needs_check"].includes(t.status))) return null;
  const done = all.filter((t) => t.status === "published").length;
  const status: Outcome = all.length > 0 && done === all.length ? "published" : done > 0 ? "partial" : "failed";
  ok(
    await admin
      .from("posts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("id", postId)
      .eq("status", "publishing"),
  );
  return status;
}

// Claim and send at once, while the person waits: "Post now" in the composer and in a post's
// details, and "Retry failed". `from` is the status the post may be claimed from.
export async function publishPost(workspaceId: string, postId: string, from: readonly Claimable[] = ["scheduled"]): Promise<Outcome | null> {
  if (!(await claimPost(workspaceId, postId, from))) return null;
  return sendClaimedPost(workspaceId, postId);
}

// "Post now" and "Retry" in a post's details (founder's call, 2026-11-13): a scheduled post
// goes out at once and a lapsed one late, both shown at the time they went out; a failed or
// partial post tries its failed accounts again. Returns null when the post is in none of those
// states (already sent, or being sent by a second click).
export async function publishNow(workspaceId: string, postId: string): Promise<Outcome | null> {
  const admin = adminClient();
  const post = (
    await admin.from("posts").select("status, version").eq("workspace_id", workspaceId).eq("id", postId).maybeSingle<{ status: string; version: number }>()
  ).data;
  if (!post) return null;
  if (post.status === "scheduled" || post.status === "lapsed") {
    const now = new Date().toISOString();
    const moved = must(
      await admin
        .from("posts")
        .update({ scheduled_at: now, version: post.version + 1, updated_at: now })
        .eq("workspace_id", workspaceId)
        .eq("id", postId)
        .eq("version", post.version)
        .eq("status", post.status)
        .select("id"),
    ) as unknown[];
    if (moved.length === 0) return null;
    return publishPost(workspaceId, postId, [post.status]);
  }
  if (post.status === "failed" || post.status === "partial") return publishPost(workspaceId, postId, [post.status]);
  return null;
}

// Posts later than this when the check finds them are not sent: they become lapsed and wait
// for "Post now" (BACKEND.md §8.5: never published hours late).
export const LAPSE_AFTER_MS = 30 * 60_000;
// A post still publishing after this long has probably lost its job; the check sends it again.
export const STUCK_AFTER_MS = 15 * 60_000;

export type DuePost = { workspaceId: string; postId: string; scheduledAt: string };
type DueRow = { id: string; workspace_id: string; scheduled_at: string };

// The every-minute check (BACKEND.md §8.2). Posts more than LAPSE_AFTER_MS late become lapsed.
// Every other due post is claimed in one statement (scheduled -> publishing), so two checks
// can never take the same post, and returned to be sent by its own job. Posts stuck in
// publishing are returned again; sending one twice is harmless, as each account is claimed on
// its own and the job's event id drops a repeat.
export async function claimDuePosts(now = Date.now()): Promise<{ lapsed: number; due: DuePost[] }> {
  const admin = adminClient();
  const at = new Date(now).toISOString();
  const cutoff = new Date(now - LAPSE_AFTER_MS).toISOString();
  const lapsed = must(await admin.from("posts").update({ status: "lapsed", updated_at: at }).eq("status", "scheduled").lt("scheduled_at", cutoff).select("id")) as unknown[];
  const claimed = must(
    await admin
      .from("posts")
      .update({ status: "publishing", updated_at: at })
      .eq("status", "scheduled")
      .gte("scheduled_at", cutoff)
      .lte("scheduled_at", at)
      .select("id, workspace_id, scheduled_at"),
  ) as DueRow[];
  const stuck = must(
    await admin
      .from("posts")
      .select("id, workspace_id, scheduled_at")
      .eq("status", "publishing")
      .lt("updated_at", new Date(now - STUCK_AFTER_MS).toISOString())
      .limit(500),
  ) as DueRow[];
  const due = [...claimed, ...stuck].map((p) => ({ workspaceId: p.workspace_id, postId: p.id, scheduledAt: p.scheduled_at }));
  return { lapsed: lapsed.length, due };
}

// TikTok videos still processing when their send stopped waiting (needs_check, with TikTok's
// publish id): asked again by the minute check until TikTok finishes, then the post gets its
// final status. Past the deadline in next_retry_at they fail with a plain reason.
export async function resolveTikTokChecks(now = Date.now()): Promise<number> {
  const admin = adminClient();
  const rows = must(
    await admin
      .from("post_targets")
      .select(`post_id, workspace_id, provider_post_id, next_retry_at, ${TARGET_SELECT}`)
      .eq("provider", "tiktok")
      .eq("status", "needs_check")
      .not("provider_post_id", "is", null)
      .limit(50),
  ) as unknown as Array<TargetRow & { post_id: string; workspace_id: string; provider_post_id: string; next_retry_at: string | null }>;
  let settled = 0;
  for (const row of rows) {
    let update: Record<string, unknown> | null = null;
    try {
      if (!row.social_accounts) throw new TikTokError("access_token_invalid", "account removed");
      const token = await freshToken(row.social_accounts);
      const s = await postStatus(token, row.provider_post_id);
      if (s.status === "PUBLISH_COMPLETE") {
        const creator = s.postId ? await creatorInfo(token).catch(() => null) : null;
        update = {
          status: "published",
          provider_post_id: s.postId ?? row.provider_post_id,
          provider_url: s.postId && creator ? `https://www.tiktok.com/@${creator.username}/video/${s.postId}` : null,
          published_at: new Date(now).toISOString(),
          error_code: null,
          error_message: null,
        };
      } else if (s.status === "FAILED") {
        update = { status: "failed", error_code: s.failReason ?? "failed", error_message: explain(s.failReason ?? "") };
      } else if (row.next_retry_at && Date.parse(row.next_retry_at) < now) {
        update = { status: "failed", error_code: "timeout", error_message: "TikTok did not finish processing this video. Check the TikTok profile, then try again if it is missing." };
      }
    } catch (e) {
      if (!(e instanceof TikTokError)) throw e;
      if (e.code === "access_token_invalid" || e.code === "invalid_grant") update = { status: "failed", error_code: "permission_revoked", error_message: explain("access_token_invalid") };
      // Anything else (TikTok busy, rate limits): ask again next minute.
    }
    if (!update) continue;
    ok(await admin.from("post_targets").update(update).eq("id", row.id).eq("status", "needs_check"));
    await finalizePost(row.workspace_id, row.post_id);
    settled++;
  }
  return settled;
}

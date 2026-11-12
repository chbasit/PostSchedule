import "server-only";
import { getPlatform, type PlatformId } from "@/providers/catalog";
import { readImage } from "./ai/storage";
import { decrypt, type KeyRing } from "./crypto";
import { tokenKeys } from "./env";
import { readMedia } from "./media/storage";
import { BlueskyError, login, publish as publishToBluesky } from "./providers/bluesky";
import { must, ok } from "./route";
import { adminClient } from "./supabase";

// Sends one post to every account it targets (BACKEND.md §8). The post is claimed first
// (scheduled -> publishing), so a double click or a repeated job never posts twice. Each
// account gets its own result: published with the platform's link, or failed with a plain
// reason. The post ends as published, partial or failed.

type MediaRow = { position: number; media_assets: { kind: string; storage_key: string; source: "upload" | "ai" } | null };
type TargetRow = {
  id: string;
  provider: PlatformId;
  caption_override: string | null;
  social_accounts: { id: string; provider_account_id: string; access_token_enc: string | null; metadata: { pds?: string } | null } | null;
};

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

export async function publishPost(workspaceId: string, postId: string): Promise<void> {
  const admin = adminClient();
  const claimed = (
    await admin
      .from("posts")
      .update({ status: "publishing", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("id", postId)
      .eq("status", "scheduled")
      .select("main_caption")
      .maybeSingle<{ main_caption: string }>()
  ).data;
  if (!claimed) return;

  const targets = must(
    await admin
      .from("post_targets")
      .select("id, provider, caption_override, social_accounts(id, provider_account_id, access_token_enc, metadata)")
      .eq("workspace_id", workspaceId)
      .eq("post_id", postId)
      .in("status", ["pending", "queued", "failed"]),
  ) as unknown as TargetRow[];
  const media = (
    must(await admin.from("post_media").select("position, media_assets(kind, storage_key, source)").eq("workspace_id", workspaceId).eq("post_id", postId)) as unknown as MediaRow[]
  ).sort((a, b) => a.position - b.position);

  let ring: KeyRing | null = null;
  let published = 0;
  for (const target of targets) {
    ok(await admin.from("post_targets").update({ status: "publishing" }).eq("id", target.id));
    try {
      if (target.provider !== "bluesky") throw new PublishError("unsupported", `Publishing to ${getPlatform(target.provider).name} is not available yet.`);
      ring ??= tokenKeys();
      const result = await toBluesky(ring, target, target.caption_override ?? claimed.main_caption, media);
      ok(
        await admin
          .from("post_targets")
          .update({ status: "published", provider_post_id: result.id, provider_url: result.url, published_at: new Date().toISOString(), error_code: null, error_message: null })
          .eq("id", target.id),
      );
      published++;
    } catch (e) {
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

  const status = targets.length > 0 && published === targets.length ? "published" : published > 0 ? "partial" : "failed";
  ok(await admin.from("posts").update({ status, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("id", postId));
}

import { ApiFailure, fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { creatorInfo, explain, TikTokError } from "@/server/providers/tiktok";
import { route, uuid } from "@/server/route";
import { adminClient } from "@/server/supabase";
import { freshToken, type TikTokAccount } from "@/server/tiktok";

// The TikTok creator's posting settings, read fresh each time the post screen opens (TikTok's
// Content Sharing Guidelines): nickname, who may view, and which interactions are allowed.
export const GET = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  await requireMember(ws, "post.create");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const account = (
    await adminClient()
      .from("social_accounts")
      .select("id, workspace_id, provider, access_token_enc, refresh_token_enc, expires_at")
      .eq("workspace_id", ws)
      .eq("id", id)
      .maybeSingle<TikTokAccount & { provider: string }>()
  ).data;
  if (!account) throw fail.notFound();
  if (account.provider !== "tiktok") throw fail.validation("Only TikTok accounts have creator settings.");
  try {
    return await creatorInfo(await freshToken(account));
  } catch (e) {
    if (!(e instanceof TikTokError)) throw e;
    if (e.code === "access_token_invalid" || e.code === "invalid_grant" || e.code === "scope_not_authorized") {
      await adminClient().from("social_accounts").update({ status: "needs_reconnect" }).eq("workspace_id", ws).eq("id", id);
      throw fail.validation(explain("access_token_invalid"), { reason: "reconnect" });
    }
    if (e.code.startsWith("spam_risk") || e.code === "reached_active_user_cap") throw fail.validation(explain(e.code), { reason: "cannot_post" });
    if (e.code === "rate_limit_exceeded") throw fail.rateLimited(60);
    throw new ApiFailure(502, "provider_error", "TikTok did not answer. Try again in a minute.");
  }
});

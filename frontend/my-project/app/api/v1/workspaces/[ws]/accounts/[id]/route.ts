import { decrypt } from "@/server/crypto";
import { tokenKeys } from "@/server/env";
import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { revokeToken } from "@/server/providers/tiktok";
import { ok, route, uuid } from "@/server/route";
import { adminClient } from "@/server/supabase";
import { tiktokEnv } from "@/server/tiktok";

// Removing an account keeps its history: waiting posts skip it, tokens are wiped, and the
// row is marked revoked. Membership and role were checked first; the workspace is explicit.
// For TikTok, the platform is also told to drop our access (best effort: the account is
// removed here whatever TikTok answers).
export const DELETE = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  await requireMember(ws, "account.connect");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const db = adminClient();
  const account = (
    await db.from("social_accounts").select("provider, access_token_enc").eq("workspace_id", ws).eq("id", id).maybeSingle<{ provider: string; access_token_enc: string | null }>()
  ).data;
  const tiktok = tiktokEnv();
  if (account?.provider === "tiktok" && account.access_token_enc && tiktok) {
    try {
      await revokeToken({ ...tiktok, token: decrypt(tokenKeys(), account.access_token_enc) });
    } catch {
      // A token that no longer decrypts or that TikTok already dropped: nothing to revoke.
    }
  }
  ok(await db.from("post_targets").update({ status: "skipped" }).eq("workspace_id", ws).eq("social_account_id", id).eq("status", "pending"));
  ok(
    await db
      .from("social_accounts")
      .update({ status: "revoked", access_token_enc: null, refresh_token_enc: null })
      .eq("workspace_id", ws)
      .eq("id", id),
  );
  return undefined;
});

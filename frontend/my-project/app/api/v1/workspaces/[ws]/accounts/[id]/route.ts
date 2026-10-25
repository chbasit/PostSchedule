import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { ok, route, uuid } from "@/server/route";
import { adminClient } from "@/server/supabase";

// Removing an account keeps its history: waiting posts skip it, tokens are wiped, and the
// row is marked revoked. Membership and role were checked first; the workspace is explicit.
export const DELETE = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  await requireMember(ws, "account.connect");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const db = adminClient();
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

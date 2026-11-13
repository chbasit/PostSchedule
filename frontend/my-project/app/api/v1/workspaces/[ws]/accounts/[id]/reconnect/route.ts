import { getPlatform, type PlatformId } from "@/providers/catalog";
import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { route, uuid } from "@/server/route";
import { adminClient } from "@/server/supabase";
import { startConnect } from "@/server/tiktok";

// Signs in again for an account TikTok signed out (or that was disconnected): the callback
// updates this same account. Bluesky reconnects through the connect dialog's app password.
export const POST = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  await requireMember(ws, "account.connect");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const account = (await adminClient().from("social_accounts").select("provider").eq("workspace_id", ws).eq("id", id).maybeSingle<{ provider: PlatformId }>()).data;
  if (!account) throw fail.notFound();
  if (account.provider === "tiktok") return startConnect(ws, id);
  throw fail.notConfigured(`Reconnecting ${getPlatform(account.provider).name}`);
});

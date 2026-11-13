import { z } from "zod";
import { getPlatform, type PlatformId } from "@/providers/catalog";
import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { accountInsights } from "@/server/insights";
import { route, uuid } from "@/server/route";
import { adminClient } from "@/server/supabase";

// The account's numbers read from the platform when asked (founder's call, 2026-11-13).
// Bluesky today; the other platforms join as their connections ship.
const query = z.object({
  days: z.enum(["7", "30", "90"]).transform(Number),
  tz: z.string().max(64).refine((zone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }),
});

export const GET = route<{ ws: string; id: string }>(async (req, { ws, id }) => {
  await requireMember(ws);
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const parsed = query.safeParse({ days: req.nextUrl.searchParams.get("days"), tz: req.nextUrl.searchParams.get("tz") });
  if (!parsed.success) throw fail.validation("Choose 7, 30 or 90 days and a valid time zone.");
  const account = (
    await adminClient().from("social_accounts").select("id, provider, provider_account_id").eq("workspace_id", ws).eq("id", id).maybeSingle<{
      id: string;
      provider: PlatformId;
      provider_account_id: string;
    }>()
  ).data;
  if (!account) throw fail.notFound();
  if (account.provider !== "bluesky") throw fail.notConfigured(`${getPlatform(account.provider).name} insights`);
  return accountInsights(ws, { id: account.id, provider: account.provider, providerAccountId: account.provider_account_id }, parsed.data.days as 7 | 30 | 90, parsed.data.tz);
});

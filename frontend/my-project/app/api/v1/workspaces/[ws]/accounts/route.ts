import { requireMember } from "@/server/guards";
import { toAccount, type AccountRow } from "@/server/mappers";
import { must, route } from "@/server/route";

export const GET = route<{ ws: string }>(async (_req, { ws }) => {
  const { db } = await requireMember(ws);
  const rows = must(
    await db
      .from("social_accounts_public")
      .select("id, workspace_id, provider, display_name, handle, status, created_at")
      .eq("workspace_id", ws)
      .neq("status", "revoked")
      .order("created_at", { ascending: true }),
  ) as AccountRow[];
  return rows.map(toAccount);
});

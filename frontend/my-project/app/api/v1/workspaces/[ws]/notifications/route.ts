import { requireMember } from "@/server/guards";
import { toNotification, type NotificationRow } from "@/server/mappers";
import { must, route } from "@/server/route";

export const GET = route<{ ws: string }>(async (_req, { ws }) => {
  const { db, user } = await requireMember(ws);
  const rows = must(
    await db
      .from("notifications")
      .select("id, kind, post_id, account_id, created_at, read_at")
      .eq("workspace_id", ws)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ) as NotificationRow[];
  return rows.map(toNotification);
});

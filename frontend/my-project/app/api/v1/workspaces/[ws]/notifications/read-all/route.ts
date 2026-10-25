import { requireMember } from "@/server/guards";
import { ok, route } from "@/server/route";

export const POST = route<{ ws: string }>(async (_req, { ws }) => {
  const { db, user } = await requireMember(ws);
  ok(await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("workspace_id", ws).eq("user_id", user.id).is("read_at", null));
  return undefined;
});

import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { ok, route, uuid } from "@/server/route";

export const DELETE = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  const { db } = await requireMember(ws, "member.manage");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  ok(await db.from("invites").update({ revoked_at: new Date().toISOString() }).eq("workspace_id", ws).eq("id", id).is("accepted_at", null));
  return undefined;
});

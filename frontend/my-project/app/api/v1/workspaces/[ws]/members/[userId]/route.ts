import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { fromDb, route, uuid } from "@/server/route";

// Owners cannot be removed this way (ownership transfer is its own flow).
export const DELETE = route<{ ws: string; userId: string }>(async (_req, { ws, userId }) => {
  const { db } = await requireMember(ws, "member.manage");
  if (!uuid.safeParse(userId).success) throw fail.notFound();
  const { data, error } = await db
    .from("workspace_members")
    .delete()
    .eq("workspace_id", ws)
    .eq("user_id", userId)
    .neq("role", "owner")
    .select("user_id");
  if (error) throw fromDb(error);
  if (!data?.length) {
    const target = await db.from("workspace_members").select("role").eq("workspace_id", ws).eq("user_id", userId).maybeSingle();
    if (target.data?.role === "owner") throw fail.forbidden("The workspace owner can't be removed.");
  }
  return undefined;
});

import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { toTag, type TagRow } from "@/server/mappers";
import { must, ok, readBody, route, uuid } from "@/server/route";
import { tagBody } from "@/server/tags";

export const PATCH = route<{ ws: string; id: string }>(async (req, { ws, id }) => {
  const { db } = await requireMember(ws, "post.create");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const patch = await readBody(req, tagBody.partial());
  return toTag(
    must(await db.from("tags").update(patch).eq("workspace_id", ws).eq("id", id).select("id, workspace_id, name, color, created_at").single()) as TagRow,
  );
});

// Posts keep existing; only the tag and its links go.
export const DELETE = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  const { db } = await requireMember(ws, "post.create");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  ok(await db.from("tags").delete().eq("workspace_id", ws).eq("id", id));
  return undefined;
});

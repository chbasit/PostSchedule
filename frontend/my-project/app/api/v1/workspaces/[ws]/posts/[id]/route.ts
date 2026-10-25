import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { expectedVersion, getPost, postInput, savePost } from "@/server/posts";
import { ok, readBody, route, uuid } from "@/server/route";

export const GET = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  const { db } = await requireMember(ws);
  return getPost(db, ws, id);
});

export const PATCH = route<{ ws: string; id: string }>(async (req, { ws, id }) => {
  const { db } = await requireMember(ws, "post.create");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const version = expectedVersion(req.headers.get("if-match"));
  const input = await readBody(req, postInput);
  return savePost(db, ws, input, { id, version });
});

// Deleting twice is not an error (TEST.md DBL-21); row-level security decides who may delete.
export const DELETE = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  const { db } = await requireMember(ws, "post.delete");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  ok(await db.from("posts").delete().eq("workspace_id", ws).eq("id", id));
  return undefined;
});

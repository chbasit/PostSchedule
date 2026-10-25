import { requireMember } from "@/server/guards";
import { idempotent } from "@/server/idempotency";
import { toTag, type TagRow } from "@/server/mappers";
import { must, readBody, route } from "@/server/route";
import { tagBody } from "@/server/tags";

export const GET = route<{ ws: string }>(async (_req, { ws }) => {
  const { db } = await requireMember(ws);
  const rows = must(await db.from("tags").select("id, workspace_id, name, color, created_at").eq("workspace_id", ws).order("name")) as TagRow[];
  return rows.map(toTag);
});

// A second tag with the same name (any case) is a conflict, which the picker explains.
export const POST = route<{ ws: string }>(async (req, { ws }) => {
  const { db } = await requireMember(ws, "post.create");
  const input = await readBody(req, tagBody);
  return idempotent(ws, "tag.create", req.headers.get("idempotency-key"), input, async () =>
    toTag(must(await db.from("tags").insert({ workspace_id: ws, ...input }).select("id, workspace_id, name, color, created_at").single()) as TagRow),
  );
});

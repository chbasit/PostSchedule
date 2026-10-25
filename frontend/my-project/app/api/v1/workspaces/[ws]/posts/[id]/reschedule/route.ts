import { z } from "zod";
import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { expectedVersion, getPost } from "@/server/posts";
import { fromDb, readBody, route, uuid } from "@/server/route";

const body = z.object({ scheduledAt: z.iso.datetime({ offset: true }) });

// Drag-and-drop in the calendar: only the time changes, guarded by the version read.
export const POST = route<{ ws: string; id: string }>(async (req, { ws, id }) => {
  const { db } = await requireMember(ws, "post.create");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const version = expectedVersion(req.headers.get("if-match"));
  const { scheduledAt } = await readBody(req, body);
  if (Date.parse(scheduledAt) <= Date.now()) throw fail.validation("The scheduled time is in the past.", { field: "scheduledAt", reason: "past" });
  const { data, error } = await db
    .from("posts")
    .update({ scheduled_at: scheduledAt, version: version + 1, updated_at: new Date().toISOString() })
    .eq("workspace_id", ws)
    .eq("id", id)
    .eq("version", version)
    .in("status", ["scheduled", "pending_approval", "draft"])
    .select("id")
    .maybeSingle();
  if (error) throw fromDb(error);
  if (!data) {
    const exists = await db.from("posts").select("id").eq("workspace_id", ws).eq("id", id).maybeSingle();
    if (exists.data) throw fail.conflict("Someone else changed this post. Reload to see their version.");
    throw fail.notFound();
  }
  return getPost(db, ws, id);
});

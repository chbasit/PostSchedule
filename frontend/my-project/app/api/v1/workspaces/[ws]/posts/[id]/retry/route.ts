import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { getPost } from "@/server/posts";
import { publishNow } from "@/server/publish";
import { route, uuid } from "@/server/route";

// "Post now" for a scheduled or lapsed post, "Retry" for a failed or partial one. Sent while
// the person waits, like "Post now" in the composer, so they see the result at once; the claim
// in publishPost makes a second click (or the every-minute check) skip a post already going out.
export const POST = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  const { db } = await requireMember(ws, "post.create");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  await publishNow(ws, id);
  return getPost(db, ws, id);
});

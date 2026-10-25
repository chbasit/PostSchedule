import type { PostFilter, PostStatus } from "@/lib/api/types";
import { requireMember } from "@/server/guards";
import { idempotent } from "@/server/idempotency";
import { listPosts, postInput, savePost } from "@/server/posts";
import { readBody, route } from "@/server/route";

export const GET = route<{ ws: string }>(async (req, { ws }) => {
  const { db } = await requireMember(ws);
  const q = req.nextUrl.searchParams;
  const filter: PostFilter = {
    status: q.getAll("status").length ? (q.getAll("status") as PostStatus[]) : undefined,
    from: q.get("from") ?? undefined,
    to: q.get("to") ?? undefined,
    q: q.get("q") ?? undefined,
    tagIds: q.getAll("tag").length ? q.getAll("tag") : undefined,
  };
  return listPosts(db, ws, filter);
});

export const POST = route<{ ws: string }>(async (req, { ws }) => {
  const { db } = await requireMember(ws, "post.create");
  const input = await readBody(req, postInput);
  return idempotent(ws, "post.create", req.headers.get("idempotency-key"), input, () => savePost(db, ws, input, null));
});

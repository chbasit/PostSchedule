import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

export const POST = route<{ ws: string }>(async (_req, { ws }) => {
  await requireMember(ws, "post.create");
  throw fail.notConfigured("The AI writer");
});

import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

// Publishing runs in background jobs (CLAUDE.md rule 5), which are not connected yet.
export const POST = route<{ ws: string; id: string }>(async (_req, { ws }) => {
  await requireMember(ws, "post.create");
  throw fail.notConfigured("Publishing");
});

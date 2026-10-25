import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

// Presigned uploads to Cloudflare R2 (BACKEND.md 10) arrive with the storage keys.
export const POST = route<{ ws: string }>(async (_req, { ws }) => {
  await requireMember(ws, "post.create");
  throw fail.notConfigured("Media uploads");
});

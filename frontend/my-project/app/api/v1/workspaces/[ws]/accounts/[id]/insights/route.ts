import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

// Filled by the analytics fetch jobs once accounts can be connected (BACKEND.md 12).
export const GET = route<{ ws: string; id: string }>(async (_req, { ws }) => {
  await requireMember(ws);
  throw fail.notConfigured("Account insights");
});

import { creditStatus } from "@/server/ai/credits";
import { requireAi } from "@/server/env";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

// Every member may see the balance; only editors and up can spend it.
export const GET = route<{ ws: string }>(async (_req, { ws }) => {
  requireAi();
  await requireMember(ws);
  return creditStatus(ws);
});

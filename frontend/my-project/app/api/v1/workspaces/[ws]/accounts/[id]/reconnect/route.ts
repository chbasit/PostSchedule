import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

export const POST = route<{ ws: string; id: string }>(async (_req, { ws }) => {
  await requireMember(ws, "account.connect");
  throw fail.notConfigured("Connecting social accounts");
});

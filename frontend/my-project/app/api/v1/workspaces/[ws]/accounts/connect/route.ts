import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

// Needs each platform's OAuth app (client id and secret) and token encryption keys.
export const POST = route<{ ws: string }>(async (_req, { ws }) => {
  await requireMember(ws, "account.connect");
  throw fail.notConfigured("Connecting social accounts");
});

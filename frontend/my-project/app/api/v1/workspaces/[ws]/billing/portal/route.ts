import { portalUrl } from "@/server/billing/service";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

// Invoices, card and plan changes live in Lemon Squeezy's customer portal (PAY-19).
export const POST = route<{ ws: string }>(async (_req, { ws }) => {
  await requireMember(ws, "billing.manage");
  return portalUrl(ws);
});

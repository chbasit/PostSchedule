import { cookies } from "next/headers";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { createCheckout } from "@/server/billing/service";
import { requireMember } from "@/server/guards";
import { idempotent } from "@/server/idempotency";
import { readBody, route } from "@/server/route";

const body = z.object({ plan: z.enum(["solo", "pro", "agency", "scale"]), interval: z.enum(["month", "year"]) });

// Owners only (PAY-20). Repeat clicks reuse the same checkout (PAY-01 to PAY-03).
export const POST = route<{ ws: string }>(async (req, { ws }) => {
  const { user } = await requireMember(ws, "billing.manage");
  const input = await readBody(req, body);
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = routing.locales.find((l) => l === cookieLocale) ?? routing.defaultLocale;
  return idempotent(ws, "billing.checkout", req.headers.get("idempotency-key"), input, () =>
    createCheckout({ workspaceId: ws, userId: user.id, email: user.email ?? "", plan: input.plan, interval: input.interval, locale }),
  );
});

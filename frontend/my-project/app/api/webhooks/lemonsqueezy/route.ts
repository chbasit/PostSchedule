import { NextResponse, type NextRequest } from "next/server";
import { handleWebhook } from "@/server/billing/service";
import { errorResponse } from "@/server/route";

// Lemon Squeezy calls this for every billing event. The raw body is needed for the
// signature, so this handler reads text, not JSON. 200 acknowledges; anything else is
// retried by Lemon Squeezy (up to three more times).
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    await handleWebhook(await req.text(), req.headers.get("x-signature"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, requestId);
  }
}

import { z } from "zod";
import { DEV_MODE } from "@/config/site";
import { authFailure, email } from "@/server/auth";
import { resetCodeTries } from "@/server/auth-codes";
import { devResendCode } from "@/server/dev-codes";
import { siteUrl } from "@/server/env";
import { readBody, route } from "@/server/route";
import { userClient } from "@/server/supabase";

// Supabase allows one email per address a minute; development mode only waits a moment.
const COOLDOWN_SEC = DEV_MODE ? 5 : 60;

// A new sign-up code; the older one stops working. Same answer for any address.
export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ email }));
  if (DEV_MODE) {
    const dev = await devResendCode(input.email);
    await resetCodeTries("signup", input.email);
    return { retryAfterSec: COOLDOWN_SEC, dev };
  }
  const db = await userClient();
  const { error } = await db.auth.resend({ type: "signup", email: input.email, options: { emailRedirectTo: `${siteUrl()}/api/v1/auth/callback` } });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) throw authFailure(error);
  await resetCodeTries("signup", input.email);
  return { retryAfterSec: COOLDOWN_SEC };
});

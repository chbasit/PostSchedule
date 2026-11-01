import { z } from "zod";
import { DEV_MODE } from "@/config/site";
import { authFailure, email } from "@/server/auth";
import { resetCodeTries } from "@/server/auth-codes";
import { devRecoveryCode } from "@/server/dev-codes";
import { readBody, route } from "@/server/route";
import { userClient } from "@/server/supabase";

const COOLDOWN_SEC = DEV_MODE ? 5 : 60;

// Emails a reset code. Same answer whether or not the address has an account (FRONTEND.md F16).
export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ email }));
  if (DEV_MODE) {
    const dev = await devRecoveryCode(input.email);
    await resetCodeTries("recovery", input.email);
    return { retryAfterSec: COOLDOWN_SEC, dev };
  }
  const db = await userClient();
  const { error } = await db.auth.resetPasswordForEmail(input.email);
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) throw authFailure(error);
  await resetCodeTries("recovery", input.email);
  return { retryAfterSec: COOLDOWN_SEC };
});

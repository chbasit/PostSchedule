import { z } from "zod";
import { authFailure, email } from "@/server/auth";
import { siteUrl } from "@/server/env";
import { readBody, route } from "@/server/route";
import { userClient } from "@/server/supabase";

const COOLDOWN_SEC = 60;

export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ email }));
  const db = await userClient();
  const { error } = await db.auth.resend({ type: "signup", email: input.email, options: { emailRedirectTo: `${siteUrl()}/auth/confirm` } });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) throw authFailure(error);
  return { retryAfterSec: COOLDOWN_SEC };
});

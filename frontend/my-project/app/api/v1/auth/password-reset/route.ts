import { z } from "zod";
import { authFailure, email } from "@/server/auth";
import { siteUrl } from "@/server/env";
import { readBody, route } from "@/server/route";
import { userClient } from "@/server/supabase";

// Same answer whether or not the address has an account (FRONTEND.md F16).
export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ email }));
  const db = await userClient();
  const { error } = await db.auth.resetPasswordForEmail(input.email, { redirectTo: `${siteUrl()}/reset-password` });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) throw authFailure(error);
  return undefined;
});

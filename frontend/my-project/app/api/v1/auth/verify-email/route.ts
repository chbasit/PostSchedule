import { z } from "zod";
import { authFailure, email } from "@/server/auth";
import { assertCanTryCode, code, invalidCode, isWrongCode, noteWrongCode, resetCodeTries } from "@/server/auth-codes";
import { readBody, route } from "@/server/route";
import { loadSession, markSignedIn } from "@/server/session";
import { userClient } from "@/server/supabase";

// The code from the sign-up email. A right code confirms the address and signs the person in.
export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ email, code }));
  await assertCanTryCode("signup", input.email);
  const db = await userClient();
  const { data, error } = await db.auth.verifyOtp({ type: "email", email: input.email, token: input.code });
  if (error || !data.user) {
    if (!error || isWrongCode(error)) await noteWrongCode("signup", input.email);
    throw error ? authFailure(error) : invalidCode();
  }
  await resetCodeTries("signup", input.email);
  await markSignedIn();
  return loadSession(db, data.user);
});

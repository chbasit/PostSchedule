import { z } from "zod";
import { authFailure, email, password } from "@/server/auth";
import { assertCanTryCode, code, invalidCode, isWrongCode, noteWrongCode, resetCodeTries } from "@/server/auth-codes";
import { readBody, route } from "@/server/route";
import { markSignedOut } from "@/server/session";
import { userClient } from "@/server/supabase";

// The reset code with the new password. The code works once; afterwards every session of
// this person is ended, including any held by whoever knew the old password.
export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ email, code, password }));
  const db = await userClient();
  // A right code signs the person in. If the new password is then refused (the old one, or
  // a leaked one), that session lets them try another without a second code; a signed-in
  // person may change their password anyway.
  const { data: current } = await db.auth.getUser();
  if (current.user?.email?.toLowerCase() !== input.email) {
    await assertCanTryCode("recovery", input.email);
    const verified = await db.auth.verifyOtp({ type: "recovery", email: input.email, token: input.code });
    if (verified.error || !verified.data.user) {
      if (!verified.error || isWrongCode(verified.error)) await noteWrongCode("recovery", input.email);
      throw verified.error ? authFailure(verified.error) : invalidCode();
    }
    await resetCodeTries("recovery", input.email);
  }
  const updated = await db.auth.updateUser({ password: input.password });
  if (updated.error) throw authFailure(updated.error);
  await db.auth.signOut({ scope: "global" });
  await markSignedOut();
  return undefined;
});

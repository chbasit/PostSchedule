import { z } from "zod";
import { authFailure, password } from "@/server/auth";
import { fail } from "@/server/errors";
import { readBody, route } from "@/server/route";
import { markSignedOut } from "@/server/session";
import { userClient } from "@/server/supabase";

// The reset link's token, plus the new password. The token works once. Afterwards every
// session of this person is ended, including any held by whoever knew the old password.
export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ token: z.string().min(10).max(500), password }));
  const db = await userClient();
  const verified = await db.auth.verifyOtp({ type: "recovery", token_hash: input.token });
  if (verified.error) throw authFailure(verified.error);
  if (!verified.data.user) throw fail.validation("This link has expired or was already used.", { reason: "expired" });
  const updated = await db.auth.updateUser({ password: input.password });
  if (updated.error) throw authFailure(updated.error);
  await db.auth.signOut({ scope: "global" });
  await markSignedOut();
  return undefined;
});

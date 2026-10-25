import { z } from "zod";
import { authFailure } from "@/server/auth";
import { fail } from "@/server/errors";
import { readBody, route } from "@/server/route";
import { loadSession, markSignedIn } from "@/server/session";
import { userClient } from "@/server/supabase";

// Called by the confirm page's button, never by opening the link (mail scanners open links).
export const POST = route(async (req) => {
  const input = await readBody(req, z.object({ token: z.string().min(10).max(500) }));
  const db = await userClient();
  const { data, error } = await db.auth.verifyOtp({ type: "email", token_hash: input.token });
  if (error) throw authFailure(error);
  if (!data.user) throw fail.validation("This link has expired or was already used.", { reason: "expired" });
  await markSignedIn();
  return loadSession(db, data.user);
});

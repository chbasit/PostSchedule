import { z } from "zod";
import { authFailure, email } from "@/server/auth";
import { readBody, route } from "@/server/route";
import { loadSession, markSignedIn } from "@/server/session";
import { userClient } from "@/server/supabase";

const body = z.object({ email, password: z.string().min(1).max(200) });

export const POST = route(async (req) => {
  const input = await readBody(req, body);
  const db = await userClient();
  const { data, error } = await db.auth.signInWithPassword(input);
  if (error) throw authFailure(error);
  await markSignedIn();
  return loadSession(db, data.user);
});

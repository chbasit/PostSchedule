import { route } from "@/server/route";
import { loadSession, markSignedOut } from "@/server/session";
import { userClient } from "@/server/supabase";

// The current session, or null when signed out. Also refreshes the auth cookies.
export const GET = route(async () => {
  const db = await userClient();
  const { data } = await db.auth.getUser();
  if (!data.user) {
    await markSignedOut();
    return { session: null };
  }
  return { session: await loadSession(db, data.user) };
});

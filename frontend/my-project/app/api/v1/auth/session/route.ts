import { route } from "@/server/route";
import { loadSessionRows, markSignedOut, toSession } from "@/server/session";
import { userClient } from "@/server/supabase";

// The current session, or null when signed out. Also refreshes the auth cookies.
// Every page load asks for this, so Auth's check of the token and the two reads run side by
// side; the reads carry the same token (row-level security) and are used only when Auth
// confirms the same person.
export const GET = route(async () => {
  const db = await userClient();
  const { data: current } = await db.auth.getSession();
  const subject = current.session?.user.id;
  if (!subject) {
    await markSignedOut();
    return { session: null };
  }
  const [auth, rows] = await Promise.allSettled([db.auth.getUser(), loadSessionRows(db, subject)]);
  const user = auth.status === "fulfilled" ? auth.value.data.user : null;
  if (!user || user.id !== subject) {
    await markSignedOut();
    return { session: null };
  }
  // Auth says yes but the database failed: report the failure, not a sign-out.
  if (rows.status === "rejected") throw rows.reason;
  return { session: toSession(rows.value, user) };
});

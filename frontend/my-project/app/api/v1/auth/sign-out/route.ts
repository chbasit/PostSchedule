import { route } from "@/server/route";
import { markSignedOut } from "@/server/session";
import { userClient } from "@/server/supabase";

export const POST = route(async () => {
  const db = await userClient();
  await db.auth.signOut({ scope: "local" });
  await markSignedOut();
  return undefined;
});

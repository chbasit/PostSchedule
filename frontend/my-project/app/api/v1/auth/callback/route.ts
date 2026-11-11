import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/utils";
import { siteUrl } from "@/server/env";
import { route } from "@/server/route";
import { landingAfterSignIn, markSignedIn } from "@/server/session";
import { userClient } from "@/server/supabase";

// Supabase sends people back here with a one-time code (email links). Google sign-in has its
// own callback (auth/google/callback). Redirects use the public site URL: behind a proxy the
// request's own URL is an internal address.
export const GET = route(async (req) => {
  const origin = siteUrl();
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth", origin));
  const db = await userClient();
  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=oauth", origin));
  await markSignedIn();
  return NextResponse.redirect(new URL(await landingAfterSignIn(db, data.user.id, next), origin));
});

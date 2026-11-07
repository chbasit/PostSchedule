import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/utils";
import { siteUrl } from "@/server/env";
import { route } from "@/server/route";
import { markSignedIn } from "@/server/session";
import { userClient } from "@/server/supabase";

// Google sends people back here with a one-time code. Redirects use the public site URL (see
// the Google route).
export const GET = route(async (req) => {
  const origin = siteUrl();
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth", origin));
  const db = await userClient();
  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=oauth", origin));
  await markSignedIn();
  if (next) return NextResponse.redirect(new URL(next, origin));
  const { data: profile } = await db.from("profiles").select("onboarded_at").eq("id", data.user.id).maybeSingle();
  return NextResponse.redirect(new URL(profile?.onboarded_at ? "/dashboard" : "/onboarding/start", origin));
});

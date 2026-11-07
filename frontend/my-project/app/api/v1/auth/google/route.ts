import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/utils";
import { siteUrl } from "@/server/env";
import { route } from "@/server/route";
import { userClient } from "@/server/supabase";

// Starts Google sign-in. Supabase keeps the PKCE verifier in a cookie for the callback.
// Links use the public site URL: behind a proxy the request's own URL is an internal address.
export const GET = route(async (req) => {
  const origin = siteUrl();
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH !== "true") {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", origin));
  }
  const db = await userClient();
  const callback = new URL("/api/v1/auth/callback", origin);
  if (next) callback.searchParams.set("next", next);
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/login?error=oauth", origin));
  return NextResponse.redirect(data.url);
});

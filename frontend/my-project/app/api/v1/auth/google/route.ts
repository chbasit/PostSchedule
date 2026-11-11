import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/utils";
import { googleEnv, siteUrl } from "@/server/env";
import { ATTEMPT_COOKIE, ATTEMPT_COOKIE_PATH, CALLBACK_PATH, authorizeUrl, encodeAttempt, newAttempt } from "@/server/google-oauth";
import { route } from "@/server/route";

// Starts Google sign-in on our own domain (src/server/google-oauth.ts): the attempt's state,
// nonce and PKCE verifier wait in a short-lived cookie for the callback. Links use the public
// site URL: behind a proxy the request's own URL is an internal address.
export const GET = route(async (req) => {
  const origin = siteUrl();
  const google = googleEnv();
  if (!google) return NextResponse.redirect(new URL("/login?error=google_unavailable", origin));
  const attempt = newAttempt(safeNextPath(req.nextUrl.searchParams.get("next")));
  const res = NextResponse.redirect(authorizeUrl({ clientId: google.GOOGLE_CLIENT_ID, redirectUri: `${origin}${CALLBACK_PATH}`, attempt }));
  res.cookies.set(ATTEMPT_COOKIE, encodeAttempt(attempt), {
    httpOnly: true,
    // Lax: the cookie comes back on Google's top-level redirect to the callback.
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: ATTEMPT_COOKIE_PATH,
    maxAge: 60 * 10,
  });
  return res;
});

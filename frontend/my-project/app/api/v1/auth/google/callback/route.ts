import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleEnv, siteUrl } from "@/server/env";
import { ATTEMPT_COOKIE, ATTEMPT_COOKIE_PATH, CALLBACK_PATH, decodeAttempt, exchangeCode } from "@/server/google-oauth";
import { route } from "@/server/route";
import { landingAfterSignIn, markSignedIn } from "@/server/session";
import { userClient } from "@/server/supabase";

// Google sends people back here. The state must match the attempt cookie, the code is swapped
// for an ID token, and Supabase checks that token (signature, audience, nonce) and signs the
// person in or creates their account.
export const GET = route(async (req) => {
  const origin = siteUrl();
  const failed = () => NextResponse.redirect(new URL("/login?error=oauth", origin));
  const store = await cookies();
  const attempt = decodeAttempt(store.get(ATTEMPT_COOKIE)?.value);
  // One use only: a reload or a second tab starts again.
  store.set(ATTEMPT_COOKIE, "", { httpOnly: true, sameSite: "lax", path: ATTEMPT_COOKIE_PATH, maxAge: 0 });

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const google = googleEnv();
  // No code: the person cancelled on Google's screen, or Google refused the request.
  if (!google || !attempt || !code || params.get("state") !== attempt.state) return failed();

  const idToken = await exchangeCode({
    code,
    verifier: attempt.verifier,
    clientId: google.GOOGLE_CLIENT_ID,
    clientSecret: google.GOOGLE_CLIENT_SECRET,
    redirectUri: `${origin}${CALLBACK_PATH}`,
  });
  if (!idToken) return failed();

  const db = await userClient();
  const { data, error } = await db.auth.signInWithIdToken({ provider: "google", token: idToken, nonce: attempt.nonce });
  if (error || !data.user) {
    // A client id missing from Supabase's Google provider shows up here.
    console.warn("[auth] google id token refused", error?.code, error?.status, error?.message);
    return failed();
  }
  await markSignedIn();
  return NextResponse.redirect(new URL(await landingAfterSignIn(db, data.user.id, attempt.next), origin));
});

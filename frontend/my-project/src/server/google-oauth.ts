import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

// Google sign-in runs on our own domain, so Google's screens name agentiqsocial.com instead
// of the Supabase project address (DECISIONS.md 2026-11-11). The app does the OAuth code flow
// with Google itself and hands the ID token to Supabase (signInWithIdToken). Rules, from
// developers.google.com/identity/openid-connect (checked 2026-11-11):
// - the authorization code flow with PKCE (S256) and a state value we check on return;
// - the nonce we send comes back inside the ID token. Supabase compares the token's nonce
//   with the SHA-256 hex of the nonce it is given, so Google gets the hash and Supabase the
//   raw value.
// Pure functions apart from exchangeCode, so they can be unit tested without a server.

export const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const CALLBACK_PATH = "/api/v1/auth/google/callback";
// Holds one sign-in attempt between leaving for Google and coming back; only sent to the
// Google routes.
export const ATTEMPT_COOKIE = "ps_google";
export const ATTEMPT_COOKIE_PATH = "/api/v1/auth/google";

const random = () => randomBytes(32).toString("base64url");
const sha256 = (value: string) => createHash("sha256").update(value, "utf8");

export type Attempt = { state: string; nonce: string; verifier: string; next: string | null };

export function newAttempt(next: string | null): Attempt {
  return { state: random(), nonce: random(), verifier: random(), next };
}

export function authorizeUrl(input: { clientId: string; redirectUri: string; attempt: Attempt }): string {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.attempt.state,
    nonce: sha256(input.attempt.nonce).digest("hex"),
    code_challenge: sha256(input.attempt.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

const attemptJson = z.object({
  state: z.string().min(20),
  nonce: z.string().min(20),
  verifier: z.string().min(43),
  next: z.string().nullable(),
});

export function encodeAttempt(attempt: Attempt): string {
  return Buffer.from(JSON.stringify(attempt), "utf8").toString("base64url");
}

// Null for a missing, expired or altered cookie.
export function decodeAttempt(value: string | undefined): Attempt | null {
  if (!value) return null;
  try {
    const parsed = attemptJson.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// The code from Google's redirect, swapped for the ID token. Null when Google refuses it
// (used, expired, or a redirect URI that does not match the one sent).
export async function exchangeCode(input: {
  code: string;
  verifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      code_verifier: input.verifier,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => null)) as { id_token?: unknown; error?: unknown } | null;
  if (!res.ok || typeof body?.id_token !== "string") {
    // Google's error code only ("invalid_grant", ...); the body can hold tokens.
    console.warn("[auth] google token exchange", res.status, typeof body?.error === "string" ? body.error : "");
    return null;
  }
  return body.id_token;
}

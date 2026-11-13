import "server-only";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { decrypt, encrypt, type KeyRing } from "./crypto";
import { siteUrl, tokenKeys } from "./env";
import { fail } from "./errors";
import { readPull, signPull } from "./media/pull-token";
import { authorizeUrl, CALLBACK_PATH, refreshTokens, TikTokError } from "./providers/tiktok";
import { adminClient } from "./supabase";

// TikTok's side of the app (founder's call, 2026-11-13): its keys, the sign-in attempt, fresh
// access tokens and the signed links TikTok downloads videos from. HTTP calls are in
// providers/tiktok.ts.

const keys = z.object({ TIKTOK_CLIENT_ID: z.string().min(8), TIKTOK_CLIENT_SECRET: z.string().min(16) });

// Null while the TikTok app's keys are not set; connecting then says "not set up yet".
export function tiktokEnv(): { clientKey: string; clientSecret: string } | null {
  const parsed = keys.safeParse(process.env);
  return parsed.success ? { clientKey: parsed.data.TIKTOK_CLIENT_ID, clientSecret: parsed.data.TIKTOK_CLIENT_SECRET } : null;
}

export function requireTiktok() {
  const env = tiktokEnv();
  if (!env) throw fail.notConfigured("Connecting TikTok");
  return env;
}

// --- The sign-in attempt ---------------------------------------------------------------------
// Waits in a short-lived cookie between leaving for TikTok and coming back: the random state
// TikTok must return, and the workspace (and account, when reconnecting) it is for.

export const ATTEMPT_COOKIE = "ps_tiktok";
export const ATTEMPT_COOKIE_PATH = "/api/v1/oauth/tiktok";
const attemptJson = z.object({ state: z.string().min(20), ws: z.uuid(), account: z.uuid().nullable() });
export type Attempt = z.infer<typeof attemptJson>;

export function newAttempt(ws: string, account: string | null = null): Attempt {
  return { state: randomBytes(24).toString("base64url"), ws, account };
}
export const encodeAttempt = (a: Attempt) => Buffer.from(JSON.stringify(a), "utf8").toString("base64url");
export function decodeAttempt(value: string | undefined): Attempt | null {
  if (!value) return null;
  try {
    const parsed = attemptJson.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function attemptCookie(origin: string) {
  // Lax: the cookie comes back on TikTok's top-level redirect to the callback.
  return { httpOnly: true, sameSite: "lax" as const, secure: origin.startsWith("https://"), path: ATTEMPT_COOKIE_PATH, maxAge: 60 * 10 };
}

// Connect and Reconnect: the address of TikTok's sign-in page, with the attempt in a cookie.
// Links use the public site URL: behind Hostinger's proxy the request's own URL is internal.
export function startConnect(ws: string, account: string | null): NextResponse {
  const env = requireTiktok();
  const origin = siteUrl();
  const attempt = newAttempt(ws, account);
  const res = NextResponse.json({ kind: "redirect", url: authorizeUrl({ clientKey: env.clientKey, redirectUri: `${origin}${CALLBACK_PATH}`, state: attempt.state }) });
  res.cookies.set(ATTEMPT_COOKIE, encodeAttempt(attempt), attemptCookie(origin));
  return res;
}

// --- Fresh access tokens ---------------------------------------------------------------------

export type TikTokAccount = { id: string; workspace_id: string; access_token_enc: string | null; refresh_token_enc: string | null; expires_at: string | null };

// A token with at least five minutes left. TikTok replaces the refresh token on every refresh
// and the old one stops working, so the new pair is saved only if no one else refreshed first
// (compare-and-swap on the stored refresh token); the loser reads the winner's token.
export async function freshToken(account: TikTokAccount, ring: KeyRing = tokenKeys()): Promise<string> {
  if (!account.access_token_enc || !account.refresh_token_enc) throw new TikTokError("access_token_invalid", "Reconnect this TikTok account.");
  if (account.expires_at && Date.parse(account.expires_at) - Date.now() > 5 * 60_000) return decrypt(ring, account.access_token_enc);
  const env = requireTiktok();
  const next = await refreshTokens({ ...env, refreshToken: decrypt(ring, account.refresh_token_enc) });
  const admin = adminClient();
  const saved = await admin
    .from("social_accounts")
    .update({
      access_token_enc: encrypt(ring, next.accessToken),
      refresh_token_enc: encrypt(ring, next.refreshToken),
      expires_at: new Date(next.expiresAt).toISOString(),
      status: "active",
    })
    .eq("id", account.id)
    .eq("workspace_id", account.workspace_id)
    .eq("refresh_token_enc", account.refresh_token_enc)
    .select("id");
  if (saved.data?.length) return next.accessToken;
  const latest = (await admin.from("social_accounts").select("access_token_enc").eq("id", account.id).maybeSingle<{ access_token_enc: string | null }>()).data;
  if (!latest?.access_token_enc) throw new TikTokError("access_token_invalid", "Reconnect this TikTok account.");
  return decrypt(ring, latest.access_token_enc);
}

// --- Signed video links ----------------------------------------------------------------------
// TikTok downloads the video from our own domain (verified in its developer portal), through a
// signed one-hour link (src/server/media/pull-token.ts).

export const pullUrl = (storageKey: string) => signPull(storageKey, tokenKeys(), siteUrl());
export const readPullToken = (token: string) => readPull(token, tokenKeys());

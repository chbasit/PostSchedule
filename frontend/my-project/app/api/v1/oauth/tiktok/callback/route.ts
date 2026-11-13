import { NextResponse } from "next/server";
import { encrypt } from "@/server/crypto";
import { siteUrl, tokenKeys } from "@/server/env";
import { requireMember } from "@/server/guards";
import { CALLBACK_PATH, creatorInfo, exchangeCode, userInfo } from "@/server/providers/tiktok";
import { route } from "@/server/route";
import { adminClient } from "@/server/supabase";
import { ATTEMPT_COOKIE, attemptCookie, decodeAttempt, tiktokEnv } from "@/server/tiktok";

// TikTok sends people back here after they allow (or refuse) access. The state must match the
// attempt cookie set when they left; the person must still be allowed to connect accounts in
// that workspace. Tokens are stored encrypted. Every outcome lands on a page, never on an
// error body: the account's insights when it worked, Settings > Accounts with a reason if not.
export const GET = route(async (req) => {
  const origin = siteUrl();
  const back = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    res.cookies.set(ATTEMPT_COOKIE, "", { ...attemptCookie(origin), maxAge: 0 });
    return res;
  };
  const failed = (reason: string) => back(`/en/dashboard/settings/accounts?connect_error=${reason}&platform=tiktok`);

  const q = req.nextUrl.searchParams;
  const attempt = decodeAttempt(req.cookies.get(ATTEMPT_COOKIE)?.value);
  if (!attempt || !q.get("state") || q.get("state") !== attempt.state) return failed("expired");
  if (q.get("error")) return failed(q.get("error") === "access_denied" ? "denied" : "refused");
  const code = q.get("code");
  if (!code) return failed("refused");
  try {
    await requireMember(attempt.ws, "account.connect");
  } catch {
    return failed("session");
  }
  const env = tiktokEnv();
  if (!env) return failed("unavailable");

  let tokens;
  try {
    tokens = await exchangeCode({ ...env, code, redirectUri: `${origin}${CALLBACK_PATH}` });
  } catch {
    return failed("refused");
  }
  if (!tokens.scopes.includes("video.publish")) return failed("scopes");
  // Name and picture (user.info.basic); the @username comes with the posting permission.
  const who = await userInfo(tokens.accessToken).catch(() => null);
  const creator = await creatorInfo(tokens.accessToken).catch(() => null);

  const ring = tokenKeys();
  const fields = {
    display_name: creator?.nickname || who?.displayName || "TikTok",
    handle: creator?.username ?? null,
    avatar_url: who?.avatarUrl ?? creator?.avatarUrl ?? null,
    access_token_enc: encrypt(ring, tokens.accessToken),
    refresh_token_enc: encrypt(ring, tokens.refreshToken),
    expires_at: new Date(tokens.expiresAt).toISOString(),
    scopes: tokens.scopes,
    status: "active",
    metadata: { refresh_expires_at: new Date(tokens.refreshExpiresAt).toISOString() },
  };
  const admin = adminClient();
  const existing = (
    await admin.from("social_accounts").select("id").eq("workspace_id", attempt.ws).eq("provider", "tiktok").eq("provider_account_id", tokens.openId).maybeSingle<{ id: string }>()
  ).data;
  const saved = existing
    ? await admin.from("social_accounts").update(fields).eq("workspace_id", attempt.ws).eq("id", existing.id).select("id").single<{ id: string }>()
    : await admin
        .from("social_accounts")
        .insert({ ...fields, workspace_id: attempt.ws, provider: "tiktok", provider_account_id: tokens.openId })
        .select("id")
        .single<{ id: string }>();
  if (saved.error || !saved.data) {
    if (saved.error?.message.includes("account_limit_reached")) return failed("limit");
    console.error("[tiktok] saving the account failed", saved.error?.message);
    return failed("refused");
  }
  return back(`/en/dashboard/accounts/${saved.data.id}?connected=tiktok`);
});

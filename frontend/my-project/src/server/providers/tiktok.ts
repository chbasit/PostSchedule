// TikTok: Login Kit for Web and the Content Posting API, Direct Post (BACKEND.md §9). Endpoints,
// fields, limits and error codes from developers.tiktok.com, read 2026-11-13: login-kit-web,
// oauth-user-access-token-management (token, refresh, revoke), tiktok-api-v2-get-user-info,
// content-posting-api-reference-query-creator-info, -direct-post, -get-video-status,
// content-posting-api-media-transfer-guide and content-sharing-guidelines.
// - Access tokens last 2 hours, refresh tokens 180 days; every refresh returns a NEW refresh
//   token, which must replace the stored one.
// - Unaudited apps may post only as SELF_ONLY, from private accounts, for up to 5 users a day.
// - Files already on our servers are sent by URL (PULL_FROM_URL) from a domain verified in the
//   TikTok developer portal, not uploaded (content-sharing-guidelines, "Technical").

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const API = "https://open.tiktokapis.com/v2";
const TIMEOUT = 30_000;

// Just what the posting flow needs: who is connecting, and permission to post.
export const SCOPES = ["user.info.basic", "video.publish"] as const;
export const CALLBACK_PATH = "/api/v1/oauth/tiktok/callback";

export type TikTokPrivacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";

export class TikTokError extends Error {
  constructor(
    // TikTok's own error.code (access_token_invalid, spam_risk_too_many_posts, …), or ours:
    // "unavailable" when TikTok did not answer, "http_<status>" otherwise.
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

type Envelope<T> = { data?: T; error?: { code?: string; message?: string } };

async function call<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
  } catch {
    throw new TikTokError("unavailable", "TikTok did not answer.");
  }
  const body = (await res.json().catch(() => null)) as (Envelope<T> & Record<string, unknown>) | null;
  const code = body?.error?.code;
  if (res.ok && (!code || code === "ok")) return (body?.data ?? body) as T;
  throw new TikTokError(code && code !== "ok" ? code : `http_${res.status}`, body?.error?.message || `HTTP ${res.status}`, res.status);
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" });

// --- Login Kit ---------------------------------------------------------------------------

export function authorizeUrl(input: { clientKey: string; redirectUri: string; state: string }): string {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_key: input.clientKey,
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: input.redirectUri,
    state: input.state,
  }).toString();
  return url.toString();
}

export type TikTokTokens = { accessToken: string; refreshToken: string; openId: string; scopes: string[]; expiresAt: number; refreshExpiresAt: number };

type TokenResponse = { access_token: string; refresh_token: string; open_id: string; scope: string; expires_in: number; refresh_expires_in: number; error?: string; error_description?: string };

// The token endpoint answers without the data/error envelope: fields at the top level, and
// "error" / "error_description" when it refuses.
async function tokenCall(body: Record<string, string>): Promise<TikTokTokens> {
  let res: Response;
  try {
    res = await fetch(`${API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch {
    throw new TikTokError("unavailable", "TikTok did not answer.");
  }
  const t = (await res.json().catch(() => null)) as TokenResponse | null;
  if (!res.ok || !t?.access_token) throw new TikTokError(t?.error ?? `http_${res.status}`, t?.error_description ?? "TikTok refused the sign-in.", res.status);
  const now = Date.now();
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    openId: t.open_id,
    scopes: t.scope.split(",").map((s) => s.trim()).filter(Boolean),
    expiresAt: now + t.expires_in * 1000,
    refreshExpiresAt: now + t.refresh_expires_in * 1000,
  };
}

export function exchangeCode(input: { clientKey: string; clientSecret: string; code: string; redirectUri: string }) {
  return tokenCall({ client_key: input.clientKey, client_secret: input.clientSecret, code: input.code, grant_type: "authorization_code", redirect_uri: input.redirectUri });
}

export function refreshTokens(input: { clientKey: string; clientSecret: string; refreshToken: string }) {
  return tokenCall({ client_key: input.clientKey, client_secret: input.clientSecret, grant_type: "refresh_token", refresh_token: input.refreshToken });
}

// When someone disconnects the account here, TikTok forgets our access too.
export async function revokeToken(input: { clientKey: string; clientSecret: string; token: string }): Promise<void> {
  await fetch(`${API}/oauth/revoke/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: input.clientKey, client_secret: input.clientSecret, token: input.token }),
    signal: AbortSignal.timeout(TIMEOUT),
  }).catch(() => undefined);
}

export async function userInfo(token: string): Promise<{ openId: string; displayName: string | null; avatarUrl: string | null }> {
  const data = await call<{ user: { open_id: string; display_name?: string; avatar_url?: string } }>(`${API}/user/info/?fields=open_id,display_name,avatar_url`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return { openId: data.user.open_id, displayName: data.user.display_name?.trim() || null, avatarUrl: data.user.avatar_url ?? null };
}

// --- Content Posting API -----------------------------------------------------------------

export type CreatorInfo = {
  avatarUrl: string | null;
  username: string;
  nickname: string;
  privacyOptions: TikTokPrivacy[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoSeconds: number;
};

// Read again every time the post screen opens and right before posting (guidelines B).
export async function creatorInfo(token: string): Promise<CreatorInfo> {
  const d = await call<{
    creator_avatar_url?: string;
    creator_username: string;
    creator_nickname: string;
    privacy_level_options: TikTokPrivacy[];
    comment_disabled: boolean;
    duet_disabled: boolean;
    stitch_disabled: boolean;
    max_video_post_duration_sec: number;
  }>(`${API}/post/publish/creator_info/query/`, { method: "POST", headers: bearer(token) });
  return {
    avatarUrl: d.creator_avatar_url ?? null,
    username: d.creator_username,
    nickname: d.creator_nickname,
    privacyOptions: d.privacy_level_options,
    commentDisabled: d.comment_disabled,
    duetDisabled: d.duet_disabled,
    stitchDisabled: d.stitch_disabled,
    maxVideoSeconds: d.max_video_post_duration_sec,
  };
}

export type DirectPost = {
  title: string;
  privacyLevel: TikTokPrivacy;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  aiGenerated: boolean;
  videoUrl: string;
};

export async function startDirectPost(token: string, post: DirectPost): Promise<string> {
  const d = await call<{ publish_id: string }>(`${API}/post/publish/video/init/`, {
    method: "POST",
    headers: bearer(token),
    body: JSON.stringify({
      post_info: {
        title: post.title,
        privacy_level: post.privacyLevel,
        disable_comment: post.disableComment,
        disable_duet: post.disableDuet,
        disable_stitch: post.disableStitch,
        brand_content_toggle: post.brandContent,
        brand_organic_toggle: post.brandOrganic,
        is_aigc: post.aiGenerated,
      },
      source_info: { source: "PULL_FROM_URL", video_url: post.videoUrl },
    }),
  });
  return d.publish_id;
}

export type PostStatus = { status: "PROCESSING_UPLOAD" | "PROCESSING_DOWNLOAD" | "SEND_TO_USER_INBOX" | "PUBLISH_COMPLETE" | "FAILED"; failReason: string | null; postId: string | null };

export async function postStatus(token: string, publishId: string): Promise<PostStatus> {
  const d = await call<{ status: PostStatus["status"]; fail_reason?: string; publicaly_available_post_id?: Array<string | number> }>(`${API}/post/publish/status/fetch/`, {
    method: "POST",
    headers: bearer(token),
    body: JSON.stringify({ publish_id: publishId }),
  });
  // Spelled "publicaly" in TikTok's API; only present once a public post passes moderation.
  const id = d.publicaly_available_post_id?.[0];
  return { status: d.status, failReason: d.fail_reason ?? null, postId: id === undefined ? null : String(id) };
}

// Plain-language reasons for the failures TikTok lists (get-video-status, error codes).
export function explain(code: string): string {
  const reasons: Record<string, string> = {
    spam_risk_too_many_posts: "TikTok's daily posting limit for this account is reached. Try again tomorrow, or post from the TikTok app.",
    spam_risk_user_banned_from_posting: "TikTok does not allow this account to post right now.",
    spam_risk_text: "TikTok refused the caption. Change it and try again.",
    spam_risk: "TikTok refused this post.",
    reached_active_user_cap: "Too many people posted to TikTok through AgentiqSocial today. Try again tomorrow.",
    unaudited_client_can_only_post_to_private_accounts: "Until TikTok approves AgentiqSocial, the TikTok account must be private and posts are visible only to you.",
    privacy_level_option_mismatch: "That audience is not available for this TikTok account. Choose who can view the post again.",
    url_ownership_unverified: "TikTok could not fetch the video: agentiqsocial.com is not verified in the TikTok developer portal yet.",
    file_format_check_failed: "TikTok cannot read this video file. Export it as MP4 (H.264) and try again.",
    duration_check_failed: "The video is too long or too short for this TikTok account.",
    frame_rate_check_failed: "TikTok needs a frame rate between 23 and 60 fps.",
    picture_size_check_failed: "TikTok needs a video at least 360 pixels and at most 4096 pixels on each side.",
    video_pull_failed: "TikTok could not download the video. Try again.",
    auth_removed: "Access to this TikTok account was removed. Reconnect it.",
    access_token_invalid: "TikTok signed AgentiqSocial out of this account. Reconnect it.",
    scope_not_authorized: "TikTok did not give AgentiqSocial permission to post. Reconnect the account and allow posting.",
    rate_limit_exceeded: "TikTok is limiting requests right now. Try again in a minute.",
    publish_cancelled: "The post was cancelled on TikTok.",
  };
  return reasons[code] ?? "TikTok could not publish this post.";
}

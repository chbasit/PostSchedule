import "server-only";
import type { User as AuthUser } from "@supabase/supabase-js";
import type {
  Invite,
  MediaSummary,
  Member,
  Notification,
  Persona,
  Post,
  PostTarget,
  SocialAccount,
  Tag,
  TagColor,
  TargetOptions,
  User,
  Workspace,
} from "@/lib/api/types";
import type { Role } from "@/lib/auth/permissions";
import type { BillingInterval, PlanKey } from "@/lib/billing/plans";
import type { PlatformId, PostType } from "@/providers/catalog";

// Database rows (snake_case) to the wire types the frontend uses (camelCase, BACKEND.md 4).

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  persona: Persona | null;
  timezone: string;
  locale: string;
  use_24h: boolean;
  onboarded_at: string | null;
};

export function toUser(profile: ProfileRow, auth: AuthUser): User {
  return {
    id: profile.id,
    email: auth.email ?? profile.email,
    displayName: profile.display_name,
    emailVerified: !!auth.email_confirmed_at,
    locale: profile.locale,
    timezone: profile.timezone,
    use24h: profile.use_24h,
    persona: profile.persona,
    onboardedAt: profile.onboarded_at,
  };
}

export type SubscriptionRow = {
  plan_key: PlanKey;
  interval: BillingInterval | null;
  status: Workspace["subscription"]["status"];
  account_limit: number;
  member_limit: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
};

export type WorkspaceRow = {
  id: string;
  name: string;
  kind: Workspace["kind"];
  // One-to-one embeds come back as an object or a one-item array depending on PostgREST.
  subscriptions: SubscriptionRow | SubscriptionRow[] | null;
};

export function toWorkspace(ws: WorkspaceRow, role: Role): Workspace {
  const sub = Array.isArray(ws.subscriptions) ? ws.subscriptions[0] : ws.subscriptions;
  return {
    id: ws.id,
    name: ws.name,
    kind: ws.kind,
    role,
    planKey: sub?.plan_key ?? "free",
    subscription: {
      status: sub?.status ?? "active",
      interval: sub?.interval ?? null,
      trialEndsAt: sub?.trial_ends_at ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAt: sub?.cancel_at ?? null,
    },
    accountLimit: sub?.account_limit ?? 3,
    memberLimit: sub?.member_limit ?? 1,
  };
}

export type AccountRow = {
  id: string;
  workspace_id: string;
  provider: PlatformId;
  display_name: string | null;
  handle: string | null;
  status: SocialAccount["status"];
  created_at: string;
};

export function toAccount(a: AccountRow): SocialAccount {
  return {
    id: a.id,
    workspaceId: a.workspace_id,
    provider: a.provider,
    displayName: a.display_name ?? a.handle ?? "",
    handle: a.handle ?? "",
    status: a.status,
    createdAt: a.created_at,
  };
}

export type MediaRow = {
  id: string;
  kind: "image" | "video" | "audio" | "pdf";
  name: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  storage_key?: string;
  source?: "upload" | "ai";
};

export function toMedia(m: MediaRow): MediaSummary {
  return {
    id: m.id,
    kind: m.kind === "video" ? "video" : "image",
    name: m.name,
    bytes: m.bytes ?? 0,
    width: m.width ?? 0,
    height: m.height ?? 0,
    durationSec: m.duration_ms === null ? null : m.duration_ms / 1000,
    // Signed media URLs arrive with the storage step (BACKEND.md 10).
    previewUrl: null,
  };
}

export type TargetRow = {
  id: string;
  social_account_id: string;
  provider: PlatformId;
  caption_override: string | null;
  options: TargetOptions | null;
  status: PostTarget["status"];
  error_code: PostTarget["errorCode"];
  error_message: string | null;
  provider_url: string | null;
  published_at: string | null;
};

export type PostRow = {
  id: string;
  workspace_id: string;
  type: PostType;
  status: Post["status"];
  main_caption: string;
  scheduled_at: string | null;
  timezone: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ai_generated: boolean;
  post_targets: TargetRow[] | null;
  post_tags: Array<{ tag_id: string }> | null;
  post_media: Array<{ position: number; media_assets: MediaRow | MediaRow[] | null }> | null;
};

// Everything a post needs in one query.
export const POST_SELECT =
  "id, workspace_id, type, status, main_caption, scheduled_at, timezone, version, created_by, created_at, updated_at, ai_generated, " +
  "post_targets(id, social_account_id, provider, caption_override, options, status, error_code, error_message, provider_url, published_at), " +
  "post_tags(tag_id), post_media(position, media_assets(id, kind, name, bytes, width, height, duration_ms, storage_key, source))";

export function toPost(p: PostRow): Post {
  const media = (p.post_media ?? [])
    .sort((a, b) => a.position - b.position)
    .flatMap((pm) => {
      const m = Array.isArray(pm.media_assets) ? pm.media_assets[0] : pm.media_assets;
      return m ? [toMedia(m)] : [];
    });
  return {
    id: p.id,
    workspaceId: p.workspace_id,
    type: p.type,
    status: p.status,
    mainCaption: p.main_caption,
    scheduledAt: p.scheduled_at,
    timezone: p.timezone,
    version: p.version,
    createdBy: p.created_by ?? "",
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    targets: (p.post_targets ?? []).map((t) => ({
      id: t.id,
      socialAccountId: t.social_account_id,
      provider: t.provider,
      captionOverride: t.caption_override,
      status: t.status,
      errorCode: t.error_code,
      errorMessage: t.error_message,
      providerUrl: t.provider_url,
      publishedAt: t.published_at,
      options: t.options,
    })),
    media,
    tagIds: (p.post_tags ?? []).map((t) => t.tag_id),
    aiGenerated: p.ai_generated,
  };
}

export type TagRow = { id: string; workspace_id: string; name: string; color: TagColor; created_at: string };

export function toTag(t: TagRow): Tag {
  return { id: t.id, workspaceId: t.workspace_id, name: t.name, color: t.color, createdAt: t.created_at };
}

export function toMember(m: { user_id: string; role: Role; created_at: string }, profile: { display_name: string; email: string } | undefined): Member {
  return {
    userId: m.user_id,
    displayName: profile?.display_name ?? "—",
    email: profile?.email ?? "",
    role: m.role,
    joinedAt: m.created_at,
  };
}

export type InviteRow = { id: string; email: string; role: Role; created_at: string; expires_at: string };

export function toInvite(i: InviteRow): Invite {
  return { id: i.id, email: i.email, role: i.role, createdAt: i.created_at, expiresAt: i.expires_at };
}

export type NotificationRow = {
  id: string;
  kind: Notification["kind"];
  post_id: string | null;
  account_id: string | null;
  created_at: string;
  read_at: string | null;
};

export function toNotification(n: NotificationRow): Notification {
  return { id: n.id, kind: n.kind, postId: n.post_id, accountId: n.account_id, createdAt: n.created_at, read: n.read_at !== null };
}

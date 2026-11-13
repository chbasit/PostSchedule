import type { Role } from "@/lib/auth/permissions";
import type { ImageAspect, ImageStyle } from "@/lib/ai/images";
import type { AiImageQuality, BillingInterval, PlanKey } from "@/lib/billing/plans";
import type { InsightMetric, PlatformId, PostType, Privacy } from "@/providers/catalog";

// Wire types shared with the backend (E:\PostSchedule\backend). Field names are
// camelCase on the wire; the database uses snake_case (BACKEND.md §4).

export type PostStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "publishing"
  | "published"
  | "partial"
  | "failed"
  | "lapsed"
  | "paused";

export type TargetStatus =
  | "pending"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "skipped"
  | "needs_check";

export type AccountStatus = "active" | "needs_reconnect" | "revoked";

export type ProviderErrorCode =
  | "rate_limited"
  | "token_expired"
  | "permission_revoked"
  | "media_invalid"
  | "content_rejected"
  | "transient"
  | "unknown";

export type Persona = "creator" | "startup" | "agency" | "other";

export type User = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  locale: string;
  timezone: string;
  use24h: boolean;
  persona: Persona | null;
  onboardedAt: string | null;
};

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "cancelled" | "expired";

export type Workspace = {
  id: string;
  name: string;
  kind: "personal" | "agency" | "client";
  role: Role;
  planKey: PlanKey;
  subscription: {
    status: SubscriptionStatus;
    interval: BillingInterval | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAt: string | null;
  };
  accountLimit: number;
  memberLimit: number;
};

export type Session = {
  user: User;
  workspaces: Workspace[];
};

// Development mode only (src/config/site.ts): the code that would have been emailed, or why
// none was made. Production responses never carry it.
export type DevNote = "account_exists" | "no_account" | "already_confirmed";
export type DevDelivery = { dev?: { code?: string; note?: DevNote } };

export type SocialAccount = {
  id: string;
  workspaceId: string;
  provider: PlatformId;
  displayName: string;
  handle: string;
  status: AccountStatus;
  createdAt: string;
};

export type MediaSummary = {
  id: string;
  kind: "image" | "video";
  name: string;
  bytes: number;
  width: number;
  height: number;
  durationSec: number | null;
  previewUrl: string | null;
};

// Per-account settings the platform asks for (providers/<platform> publishOptions):
// a YouTube title, who can see the video, and so on. Only fields the platform uses are set.
export type TargetOptions = {
  title?: string;
  privacy?: Privacy;
  madeForKids?: boolean;
  notifySubscribers?: boolean;
  embeddable?: boolean;
  // Creator controls (TikTok's Content Sharing Guidelines): the person picks who can view from
  // the creator's own options, with nothing chosen for them; interactions start off; a
  // commercial disclosure says whether the video promotes their brand, another, or both.
  audience?: CreatorAudience;
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
  disclose?: boolean;
  ownBrand?: boolean;
  paidPartnership?: boolean;
};

export type CreatorAudience = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";

// The creator's current posting settings, read from the platform each time the post screen
// opens (TikTok: creator_info).
export type CreatorInfo = {
  avatarUrl: string | null;
  username: string;
  nickname: string;
  privacyOptions: CreatorAudience[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoSeconds: number;
};

export type PostTarget = {
  id: string;
  socialAccountId: string;
  provider: PlatformId;
  captionOverride: string | null;
  status: TargetStatus;
  errorCode: ProviderErrorCode | null;
  errorMessage: string | null;
  providerUrl: string | null;
  publishedAt: string | null;
  options: TargetOptions | null;
};

export type Post = {
  id: string;
  workspaceId: string;
  type: PostType;
  status: PostStatus;
  mainCaption: string;
  scheduledAt: string | null;
  timezone: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  targets: PostTarget[];
  media: MediaSummary[];
  tagIds: string[];
  // The author marked this post as made with AI, so platforms that support labels can show one.
  aiGenerated: boolean;
};

export type PostInput = {
  type: PostType;
  mainCaption: string;
  accountIds: string[];
  captionOverrides: Record<string, string>; // accountId -> caption
  targetOptions: Record<string, TargetOptions>; // accountId -> options
  media: MediaSummary[];
  intent: "draft" | "schedule" | "now" | "queue";
  scheduledAt: string | null; // UTC ISO
  timezone: string | null;
  tagIds: string[];
  aiGenerated: boolean;
};

export type PostFilter = {
  status?: PostStatus | PostStatus[];
  from?: string;
  to?: string;
  q?: string;
  // Posts carrying any of these tags.
  tagIds?: string[];
};

// Tag colours map to the tinted surfaces in globals.css.
export type TagColor = "blue" | "violet" | "green" | "amber" | "rose" | "peach";

export type Tag = {
  id: string;
  workspaceId: string;
  name: string;
  color: TagColor;
  createdAt: string;
};

export type AiRewriteAction = "rephrase" | "shorten" | "expand" | "casual" | "formal";

export type AiGenerateInput = {
  prompt: string;
  platforms: PlatformId[];
  // The strictest caption limit among the chosen platforms.
  maxLength: number;
  locale: string;
};

export type AiRewriteInput = {
  text: string;
  action: AiRewriteAction;
  maxLength: number;
  locale: string;
};

export type AiResult = {
  text: string;
  // Monthly AI credits (BACKEND.md §16). null when the plan has no limit.
  creditsRemaining: number | null;
  creditsLimit: number | null;
};

// The workspace's AI credits this month (UTC calendar month). Bonus credits come from
// top-up packs and are spent after the plan's monthly credits.
export type AiCredits = {
  limit: number;
  bonus: number;
  used: number;
  remaining: number;
  resetsAt: string;
};

export type AiImageInput = {
  prompt: string;
  style: ImageStyle;
  aspect: ImageAspect;
  quality: AiImageQuality;
  count: number;
};

// A generated image in the workspace's AI library. `media` is an ordinary media asset, so
// it attaches to posts like an upload.
export type AiImage = {
  id: string;
  prompt: string;
  style: ImageStyle;
  aspect: ImageAspect;
  quality: AiImageQuality;
  createdAt: string;
  media: MediaSummary;
};

export type AiImageResult = {
  images: AiImage[];
  credits: AiCredits;
};

export type InsightsRange = 7 | 30 | 90;

export type InsightPost = {
  // null when the post was published outside this app; insights cover the whole account.
  postId: string | null;
  // The platform's own id for the post (a Bluesky at:// address), used to open its replies;
  // null when the platform's API does not give one.
  ref: string | null;
  caption: string;
  type: PostType;
  publishedAt: string;
  url: string | null;
  metrics: Partial<Record<InsightMetric, number>>;
};

export type AccountInsights = {
  accountId: string;
  // Calendar days ("YYYY-MM-DD") in the requested timezone, both ends included, and the
  // equal-length period before them.
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  // Only the metrics the platform reports (providers/<platform> insights.metrics). `previous` is
  // null when the platform keeps no history for that number (Bluesky's followers): blank, not 0.
  totals: Partial<Record<InsightMetric, { value: number; previous: number | null }>>;
  // False when the platform gives only today's follower count (Bluesky): the daily
  // followers and newFollowers below are then not real and are not shown.
  followerHistory: boolean;
  daily: Array<{ date: string; followers: number; newFollowers: number; posts: number; engagements: number }>;
  posts: InsightPost[];
  // When the numbers were last read from the platform.
  syncedAt: string;
};

// Replies people left on one of the account's posts (Engage, founder's call 2026-11-13), as a
// tree: each reply with the replies to it. `ref` is the platform's id for the reply.
export type CommentAuthor = { name: string; handle: string; avatarUrl: string | null };
export type PostComment = {
  ref: string;
  author: CommentAuthor;
  text: string;
  createdAt: string;
  likes: number;
  // Written by the connected account itself (an answer sent from here or from the app).
  mine: boolean;
  replies: PostComment[];
};
export type PostComments = { postRef: string; url: string | null; total: number; comments: PostComment[] };

export type Member = {
  userId: string;
  displayName: string;
  email: string;
  role: Role;
  joinedAt: string;
};

export type Invite = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
};

export type Notification = {
  id: string;
  kind: "published" | "failed" | "needs_reconnect" | "approval_requested" | "invite";
  postId: string | null;
  accountId: string | null;
  createdAt: string;
  read: boolean;
};

export type AppPasswordLogin = { handle: string; appPassword: string };

export type ConnectResult =
  | { kind: "redirect"; url: string } // real OAuth: go to the platform's consent screen
  | { kind: "connected"; account: SocialAccount };

export type UploadHandle = {
  promise: Promise<MediaSummary>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
};

export type MutationOptions = { idempotencyKey?: string };

export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "idempotency_mismatch"
  | "rate_limited"
  | "plan_limit_reached"
  | "feature_not_in_plan"
  | "media_invalid"
  | "provider_error"
  | "network"
  | "timeout"
  // The feature needs a service that has not been set up yet (keys missing).
  | "not_configured"
  | "internal";

export interface ApiClient {
  auth: {
    session(): Promise<Session | null>;
    signIn(input: { email: string; password: string }): Promise<Session>;
    signUp(input: { displayName: string; email: string; password: string }): Promise<Session & DevDelivery>;
    signOut(): Promise<void>;
    // Emails a reset code; the same answer whether or not the address has an account.
    requestPasswordReset(email: string): Promise<{ retryAfterSec: number } & DevDelivery>;
    // The emailed reset code with the new password. Every session ends afterwards.
    resetPassword(input: { email: string; code: string; password: string }): Promise<void>;
    resendVerification(email: string): Promise<{ retryAfterSec: number } & DevDelivery>;
    // The code from the sign-up email; a right code confirms the address and signs in.
    verifyEmail(input: { email: string; code: string }): Promise<Session>;
  };
  me: {
    update(patch: Partial<Pick<User, "displayName" | "locale" | "timezone" | "use24h" | "persona" | "onboardedAt">>): Promise<User>;
  };
  accounts: {
    list(ws: string): Promise<SocialAccount[]>;
    // Bluesky signs in with the handle and an app password; the others go through OAuth.
    connect(ws: string, provider: PlatformId, opts?: MutationOptions, credentials?: AppPasswordLogin): Promise<ConnectResult>;
    reconnect(ws: string, accountId: string): Promise<ConnectResult>;
    remove(ws: string, accountId: string): Promise<void>;
    // The last `days` days up to today in `timezone`, compared with the period before.
    insights(ws: string, accountId: string, input: { days: InsightsRange; timezone: string }): Promise<AccountInsights>;
    // The replies on one of the account's posts, and answering one of them (or the post).
    comments(ws: string, accountId: string, postRef: string): Promise<PostComments>;
    reply(ws: string, accountId: string, input: { postRef: string; parentRef: string; text: string }, opts?: MutationOptions): Promise<PostComment>;
    // TikTok only: the creator's posting settings, fresh (Content Sharing Guidelines).
    creatorInfo(ws: string, accountId: string): Promise<CreatorInfo>;
  };
  posts: {
    list(ws: string, filter?: PostFilter): Promise<Post[]>;
    get(ws: string, id: string): Promise<Post>;
    create(ws: string, input: PostInput, opts?: MutationOptions): Promise<Post>;
    update(ws: string, id: string, input: PostInput, version: number): Promise<Post>;
    reschedule(ws: string, id: string, scheduledAt: string, version: number): Promise<Post>;
    retry(ws: string, id: string, opts?: MutationOptions): Promise<Post>;
    remove(ws: string, id: string): Promise<void>;
  };
  media: {
    upload(ws: string, file: File, onProgress: (fraction: number) => void): UploadHandle;
  };
  members: {
    list(ws: string): Promise<Member[]>;
    invites(ws: string): Promise<Invite[]>;
    invite(ws: string, input: { email: string; role: Role }, opts?: MutationOptions): Promise<Invite>;
    revokeInvite(ws: string, inviteId: string): Promise<void>;
    remove(ws: string, userId: string): Promise<void>;
  };
  tags: {
    list(ws: string): Promise<Tag[]>;
    create(ws: string, input: { name: string; color: TagColor }, opts?: MutationOptions): Promise<Tag>;
    update(ws: string, tagId: string, patch: Partial<Pick<Tag, "name" | "color">>): Promise<Tag>;
    remove(ws: string, tagId: string): Promise<void>;
  };
  ai: {
    generate(ws: string, input: AiGenerateInput): Promise<AiResult>;
    rewrite(ws: string, input: AiRewriteInput): Promise<AiResult>;
    credits(ws: string): Promise<AiCredits>;
    images: {
      // Newest first.
      list(ws: string): Promise<AiImage[]>;
      // Charges the credits up front and refunds them if the provider fails.
      generate(ws: string, input: AiImageInput, opts?: MutationOptions): Promise<AiImageResult>;
      remove(ws: string, imageId: string): Promise<void>;
    };
  };
  billing: {
    createCheckout(ws: string, plan: PlanKey, interval: BillingInterval, opts?: MutationOptions): Promise<{ url: string }>;
    // Lemon Squeezy's customer portal: invoices, card and cancellation.
    portal(ws: string): Promise<{ url: string }>;
  };
  notifications: {
    list(ws: string): Promise<Notification[]>;
    markAllRead(ws: string): Promise<void>;
  };
}

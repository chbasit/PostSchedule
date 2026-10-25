// Client-safe description of a platform: what it supports and its media limits.
// OAuth, tokens and publishing live in the backend adapter, never here.

export type PlatformId = "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "bluesky";

export type PostType = "text" | "image" | "video" | "story";

export type AspectRange = {
  // Width / height. 9:16 = 0.5625, 1:1 = 1, 16:9 = 1.777.
  min: number;
  max: number;
  recommended: number;
  recommendedLabel: string;
};

export type VideoLimits = {
  format: string; // e.g. "Reels", "Shorts"
  aspect: AspectRange;
  minDurationSec: number;
  maxDurationSec: number;
  maxBytes: number;
  minWidth: number;
  recommendedWidth: number;
  recommendedHeight: number;
  maxBitrateKbps?: number;
};

export type LimitSource = {
  url: string;
  // ISO date the values were checked against the vendor docs. null = not yet verified.
  verifiedAt: string | null;
};

// Numbers an account page can show. Engagement rate is engagements (likes, comments,
// shares, saves) divided by reach, impressions or views, in that order, or by followers
// when the platform reports none of them.
export type InsightMetric =
  | "followers"
  | "posts"
  | "impressions"
  | "reach"
  | "views"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "clicks"
  | "engagementRate";

// The platform's own word for a generic metric, e.g. LinkedIn "reactions" for likes.
export type MetricTerm = "subscribers" | "reactions" | "replies" | "reposts";

export type InsightsSpec = {
  // Shown in this order on the account page.
  metrics: InsightMetric[];
  terms?: Partial<Record<InsightMetric, MetricTerm>>;
  // VERIFY each list against the platform's insights API before launch (CLAUDE.md).
  source: LimitSource;
};

export type Privacy = "public" | "unlisted" | "private";

// Settings a platform asks for on each post, beyond the caption. The composer shows a
// field for each one present. VERIFY against the platform's publishing API.
export type PublishOptionsSpec = {
  // A title separate from the caption (YouTube), with its character limit.
  title?: { limit: number };
  // Who can see the post; the first value is the default.
  privacy?: Privacy[];
  // Whether the platform asks if the video is made for children (YouTube, COPPA).
  madeForKids?: boolean;
  notifySubscribers?: boolean;
  embeddable?: boolean;
};

export type PreviewAction = "like" | "dislike" | "comment" | "share" | "repost" | "send" | "save";

// How the composer's preview draws a post on this platform. Approximate: platforms change
// their interfaces, so this is a likeness, not a pixel copy (TEST.md PRE-11).
export type PreviewSpec = {
  // Full-screen vertical player (Shorts, Reels, TikTok) or a feed card.
  video: "vertical" | "feed";
  image: "vertical" | "feed";
  // Several images: swipe one at a time, or a grid.
  gallery: "carousel" | "grid";
  // Icons down the side of the vertical player, top to bottom.
  rail: PreviewAction[];
  // The feed card's action bar, and whether it shows words next to the icons.
  actions: PreviewAction[];
  actionLabels: boolean;
  // Feed cards that put the text above the media (Facebook, LinkedIn, Bluesky).
  textFirst: boolean;
  follow: "follow" | "subscribe" | null;
};

export type PlatformDescriptor = {
  id: PlatformId;
  name: string;
  monogram: string;
  // Brand colour for the platform chip only, never a page colour. Stepped darker where
  // needed so the white logo clears 4.5:1 (YouTube, Facebook, Bluesky).
  brandColor: string;
  // The platform's logo as one SVG path on a 24×24 grid, drawn white on the brand colour.
  // From Simple Icons (CC0, simpleicons.org); used only to name the platform.
  logo: string;
  // CSS background for the mark when the brand is more than one colour (Instagram).
  markBackground?: string;
  capabilities: Record<PostType, boolean>;
  captionLimit: number;
  // Most images in one post (carousel or multi-image); 0 when images are not supported. VERIFY.
  maxImages: number;
  video: VideoLimits;
  source: LimitSource;
  insights: InsightsSpec;
  publishOptions?: PublishOptionsSpec;
  preview: PreviewSpec;
};

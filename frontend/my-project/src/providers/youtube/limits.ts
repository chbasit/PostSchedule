import type { PlatformDescriptor } from "../types";

// VERIFY before launch against YouTube Shorts and Data API upload docs.
export const youtube: PlatformDescriptor = {
  id: "youtube",
  name: "YouTube",
  monogram: "YT",
  brandColor: "#D00000",
  logo: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  capabilities: { text: false, image: false, video: true, story: false },
  captionLimit: 5000,
  maxImages: 0,
  video: {
    format: "Shorts",
    aspect: { min: 0.5, max: 1, recommended: 9 / 16, recommendedLabel: "9:16" },
    minDurationSec: 1,
    maxDurationSec: 3 * 60,
    maxBytes: 256 * 1024 * 1024 * 1024,
    minWidth: 480,
    recommendedWidth: 1080,
    recommendedHeight: 1920,
  },
  source: {
    url: "https://support.google.com/youtube/answer/10059070",
    verifiedAt: null,
  },
  insights: {
    metrics: ["followers", "posts", "views", "likes", "comments", "shares", "engagementRate"],
    terms: { followers: "subscribers" },
    source: { url: "https://developers.google.com/youtube/analytics/metrics", verifiedAt: null },
  },
  // VERIFY against the YouTube Data API (videos.insert: snippet.title, status.privacyStatus,
  // status.selfDeclaredMadeForKids, status.embeddable, notifySubscribers).
  publishOptions: {
    title: { limit: 100 },
    privacy: ["public", "unlisted", "private"],
    madeForKids: true,
    notifySubscribers: true,
    embeddable: true,
  },
  preview: {
    video: "vertical",
    image: "feed",
    gallery: "carousel",
    rail: ["like", "dislike", "comment", "share"],
    actions: ["like", "dislike", "share"],
    actionLabels: false,
    textFirst: false,
    follow: "subscribe",
  },
};

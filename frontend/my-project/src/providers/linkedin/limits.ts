import type { PlatformDescriptor } from "../types";

// VERIFY before launch against the LinkedIn Videos API docs.
export const linkedin: PlatformDescriptor = {
  id: "linkedin",
  name: "LinkedIn",
  monogram: "IN",
  brandColor: "#0A66C2",
  logo: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  capabilities: { text: true, image: true, video: true, story: false },
  captionLimit: 3000,
  maxImages: 20,
  video: {
    format: "Video",
    aspect: { min: 1 / 2.4, max: 2.4, recommended: 16 / 9, recommendedLabel: "16:9" },
    minDurationSec: 3,
    maxDurationSec: 30 * 60,
    maxBytes: 500 * 1024 * 1024,
    minWidth: 256,
    recommendedWidth: 1920,
    recommendedHeight: 1080,
  },
  source: {
    url: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api",
    verifiedAt: null,
  },
  insights: {
    metrics: ["followers", "posts", "impressions", "likes", "comments", "shares", "clicks", "engagementRate"],
    terms: { likes: "reactions", shares: "reposts" },
    source: {
      url: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/share-statistics",
      verifiedAt: null,
    },
  },
  preview: {
    video: "feed",
    image: "feed",
    gallery: "grid",
    rail: ["like", "comment", "repost", "send"],
    actions: ["like", "comment", "repost", "send"],
    actionLabels: true,
    textFirst: true,
    follow: null,
  },
};

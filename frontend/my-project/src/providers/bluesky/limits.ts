import type { PlatformDescriptor } from "../types";

// First adapter in the build order (BACKEND.md §9). VERIFY limits against the AT Protocol docs.
export const bluesky: PlatformDescriptor = {
  id: "bluesky",
  name: "Bluesky",
  monogram: "BS",
  brandColor: "#0B62D0",
  logo: "M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026",
  capabilities: { text: true, image: true, video: true, story: false },
  captionLimit: 300,
  maxImages: 4,
  video: {
    format: "Video",
    aspect: { min: 1 / 3, max: 3, recommended: 9 / 16, recommendedLabel: "9:16" },
    minDurationSec: 1,
    maxDurationSec: 3 * 60,
    maxBytes: 100 * 1024 * 1024,
    minWidth: 240,
    recommendedWidth: 1080,
    recommendedHeight: 1920,
  },
  source: {
    url: "https://docs.bsky.app/docs/tutorials/video",
    verifiedAt: null,
  },
  insights: {
    metrics: ["followers", "posts", "likes", "comments", "shares", "engagementRate"],
    terms: { comments: "replies", shares: "reposts" },
    source: { url: "https://docs.bsky.app/docs/api/app-bsky-feed-get-posts", verifiedAt: null },
  },
  preview: {
    video: "feed",
    image: "feed",
    gallery: "grid",
    rail: ["comment", "repost", "like"],
    actions: ["comment", "repost", "like"],
    actionLabels: false,
    textFirst: true,
    follow: null,
  },
};

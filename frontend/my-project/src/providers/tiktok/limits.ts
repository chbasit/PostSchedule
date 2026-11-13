import type { PlatformDescriptor } from "../types";

// Limits from the Content Posting API media transfer guide (read 2026-11-13): MP4/MOV/WebM,
// 23–60 fps, 360–4096 px a side, up to 10 minutes (the creator's own limit can be lower) and 4 GB.
export const tiktok: PlatformDescriptor = {
  id: "tiktok",
  name: "TikTok",
  monogram: "TT",
  brandColor: "#111111",
  logo: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  // Videos only for now: photo posts go through a different TikTok endpoint (later).
  capabilities: { text: false, image: false, video: true, story: false },
  captionLimit: 2200,
  maxImages: 35,
  video: {
    format: "Video",
    aspect: { min: 0.5, max: 1.78, recommended: 9 / 16, recommendedLabel: "9:16" },
    minDurationSec: 3,
    maxDurationSec: 10 * 60,
    maxBytes: 4 * 1024 * 1024 * 1024,
    minWidth: 360,
    recommendedWidth: 1080,
    recommendedHeight: 1920,
  },
  source: {
    url: "https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide",
    verifiedAt: "2026-11-13",
  },
  // Who can view, interactions and disclosure, set by the person each time (src/features/composer/creator-controls.tsx).
  publishOptions: { creatorControls: true },
  insights: {
    metrics: ["followers", "posts", "views", "likes", "comments", "shares", "engagementRate"],
    source: { url: "https://developers.tiktok.com/doc/tiktok-api-v2-video-object", verifiedAt: null },
  },
  preview: {
    video: "vertical",
    image: "vertical",
    gallery: "carousel",
    rail: ["like", "comment", "save", "share"],
    actions: ["like", "comment", "save", "share"],
    actionLabels: false,
    textFirst: false,
    follow: "follow",
  },
};

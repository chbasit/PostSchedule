import type { PlatformDescriptor } from "../types";

// VERIFY before launch against the Facebook Reels publishing docs.
export const facebook: PlatformDescriptor = {
  id: "facebook",
  name: "Facebook",
  monogram: "FB",
  brandColor: "#1565D8",
  logo: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  capabilities: { text: true, image: true, video: true, story: true },
  captionLimit: 63206,
  maxImages: 10,
  video: {
    format: "Reels",
    aspect: { min: 0.5, max: 1.91, recommended: 9 / 16, recommendedLabel: "9:16" },
    minDurationSec: 3,
    maxDurationSec: 90,
    maxBytes: 1024 * 1024 * 1024,
    minWidth: 540,
    recommendedWidth: 1080,
    recommendedHeight: 1920,
  },
  source: {
    url: "https://developers.facebook.com/docs/video-api/guides/reels-publishing",
    verifiedAt: null,
  },
  insights: {
    metrics: ["followers", "posts", "reach", "likes", "comments", "shares", "clicks", "engagementRate"],
    terms: { likes: "reactions" },
    source: { url: "https://developers.facebook.com/docs/graph-api/reference/insights", verifiedAt: null },
  },
  preview: {
    video: "vertical",
    image: "feed",
    gallery: "carousel",
    rail: ["like", "comment", "share"],
    actions: ["like", "comment", "share"],
    actionLabels: true,
    textFirst: true,
    follow: "follow",
  },
};

import { AtSign, Bold, Clapperboard, GalleryHorizontal, Grid3x3, Type, type LucideIcon } from "lucide-react";
import type { PlatformId } from "@/providers/catalog";

// Every free tool, in the order the tools page and the footer list them. Each one is a public
// page at /tools/<slug> that works without an account; its text lives under tools.<key>.
export type ToolKey =
  | "carouselSplitter"
  | "gridMaker"
  | "videoChecker"
  | "linkedinFormatter"
  | "youtubeTitle"
  | "instagramUsername"
  | "tiktokUsername";

export type ToolInfo = { key: ToolKey; slug: string; icon: LucideIcon; platform: PlatformId | null };

export const TOOLS: readonly ToolInfo[] = [
  { key: "carouselSplitter", slug: "instagram-carousel-splitter", icon: GalleryHorizontal, platform: "instagram" },
  { key: "gridMaker", slug: "instagram-grid-maker", icon: Grid3x3, platform: "instagram" },
  { key: "videoChecker", slug: "video-checker", icon: Clapperboard, platform: null },
  { key: "linkedinFormatter", slug: "linkedin-text-formatter", icon: Bold, platform: "linkedin" },
  { key: "youtubeTitle", slug: "youtube-title-checker", icon: Type, platform: "youtube" },
  { key: "instagramUsername", slug: "instagram-username-checker", icon: AtSign, platform: "instagram" },
  { key: "tiktokUsername", slug: "tiktok-username-checker", icon: AtSign, platform: "tiktok" },
];

export function getTool(key: ToolKey): ToolInfo {
  const tool = TOOLS.find((t) => t.key === key);
  if (!tool) throw new Error(`unknown_tool:${key}`);
  return tool;
}

export const toolHref = (tool: ToolInfo) => `/tools/${tool.slug}`;

// Tools for the same platform first, then the rest, for "More free tools".
export function relatedTools(key: ToolKey, count = 3): ToolInfo[] {
  const self = getTool(key);
  const others = TOOLS.filter((t) => t.key !== key);
  return [...others.filter((t) => t.platform && t.platform === self.platform), ...others.filter((t) => !t.platform || t.platform !== self.platform)].slice(0, count);
}

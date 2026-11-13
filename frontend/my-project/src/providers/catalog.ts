import { bluesky } from "./bluesky/limits";
import { facebook } from "./facebook/limits";
import { instagram } from "./instagram/limits";
import { linkedin } from "./linkedin/limits";
import { tiktok } from "./tiktok/limits";
import type { PlatformDescriptor, PlatformId } from "./types";
import { youtube } from "./youtube/limits";

// The rest of the app reads platforms from here and never branches on platform names.
export const PLATFORMS: readonly PlatformDescriptor[] = [
  instagram,
  tiktok,
  youtube,
  facebook,
  linkedin,
  bluesky,
];

const byId = new Map(PLATFORMS.map((p) => [p.id, p]));

// Platforms whose connection is built (app/api/v1/workspaces/[ws]/accounts/connect). The
// connect dialog marks the others "Soon" instead of offering a button that can only fail
// (founder's report, 2026-11-13). Add a platform here when its sign-in flow ships.
export const CONNECT_READY: ReadonlySet<PlatformId> = new Set<PlatformId>(["bluesky", "tiktok"]);

// Platforms whose replies can be read and answered from Insights (src/server/engage.ts).
export const COMMENTS_READY: ReadonlySet<PlatformId> = new Set<PlatformId>(["bluesky"]);

// Platforms whose numbers Insights reads today. The connect dialog promises "read results"
// only for these: TikTok is connected with posting permission alone for now.
export const INSIGHTS_READY: ReadonlySet<PlatformId> = new Set<PlatformId>(["bluesky"]);

export function getPlatform(id: PlatformId): PlatformDescriptor {
  const platform = byId.get(id);
  if (!platform) throw new Error(`unknown_platform:${id}`);
  return platform;
}

export type {
  InsightMetric,
  MetricTerm,
  PlatformDescriptor,
  PlatformId,
  PostType,
  PreviewAction,
  Privacy,
  PublishOptionsSpec,
} from "./types";

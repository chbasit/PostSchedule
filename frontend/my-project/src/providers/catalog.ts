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

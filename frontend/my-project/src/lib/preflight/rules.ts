import type { PlatformDescriptor } from "@/providers/catalog";

// Pre-flight rules are data-driven and pure so the browser and the server agree
// (BACKEND.md §10.3). Rule of thumb: warn unless the platform would reject the post.

export type CheckStatus = "pass" | "warn" | "block";
export type RuleId = "aspect" | "resolution" | "duration" | "size" | "bitrate" | "caption" | "count" | "title";
export type FixId = "reframe" | "trim" | "compress";

export type MediaFacts = {
  kind: "video" | "image";
  bytes: number;
  width: number;
  height: number;
  durationSec: number | null;
  bitrateKbps: number | null;
};

export type PreflightCheck = {
  rule: RuleId;
  status: CheckStatus;
  // Interpolation values for the translated message.
  values: Record<string, string | number>;
  fix?: FixId;
  // The user chose the fix: a new derived copy will be made and the original kept (BACKEND.md §10.3).
  fixed?: boolean;
  // Which file the check is about when a post has several ("Photo 2"), and its media id.
  subject?: string;
  mediaId?: string;
};

export function applyFixes(checks: PreflightCheck[], fixes: readonly FixId[]): PreflightCheck[] {
  return checks.map((c) => (c.fix && c.status !== "pass" && fixes.includes(c.fix) ? { ...c, status: "pass", fixed: true } : c));
}

const ASPECT_TOLERANCE = 0.03;
const LOW_BITRATE_KBPS = 2_000;

export function aspectLabel(width: number, height: number): string {
  const r = width / height;
  const known: Array<[number, string]> = [
    [9 / 16, "9:16"],
    [4 / 5, "4:5"],
    [1, "1:1"],
    [16 / 9, "16:9"],
    [4 / 3, "4:3"],
    [3 / 4, "3:4"],
  ];
  const hit = known.find(([v]) => Math.abs(v - r) / v < ASPECT_TOLERANCE);
  return hit ? hit[1] : `${r.toFixed(2)}:1`;
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

type CheckOptions = {
  // Vertical formats (video, stories) are cropped to the platform frame; feed images are not.
  vertical?: boolean;
};

export function checkMedia(media: MediaFacts, platform: PlatformDescriptor, opts: CheckOptions = {}): PreflightCheck[] {
  const limits = platform.video;
  const checks: PreflightCheck[] = [];
  const ratio = media.width / media.height;
  const actual = aspectLabel(media.width, media.height);
  const aspectValues = { actual, target: limits.aspect.recommendedLabel, platform: platform.name, format: limits.format };

  // Aspect ratio
  if (media.kind === "video" || opts.vertical) {
    if (ratio < limits.aspect.min || ratio > limits.aspect.max) {
      checks.push({ rule: "aspect", status: "block", values: aspectValues, fix: "reframe" });
    } else if (Math.abs(ratio - limits.aspect.recommended) / limits.aspect.recommended > ASPECT_TOLERANCE) {
      checks.push({ rule: "aspect", status: "warn", values: aspectValues, fix: "reframe" });
    } else {
      checks.push({ rule: "aspect", status: "pass", values: aspectValues });
    }
  }

  // Resolution (short side against the recommended short side)
  const shortSide = Math.min(media.width, media.height);
  const recommendedShort = Math.min(limits.recommendedWidth, limits.recommendedHeight);
  const resolution = `${media.width}×${media.height}`;
  if (shortSide < limits.minWidth) {
    checks.push({ rule: "resolution", status: "block", values: { actual: resolution, min: limits.minWidth } });
  } else if (shortSide < recommendedShort) {
    checks.push({
      rule: "resolution",
      status: "warn",
      values: { actual: resolution, recommended: `${limits.recommendedWidth}×${limits.recommendedHeight}` },
    });
  } else {
    checks.push({ rule: "resolution", status: "pass", values: { actual: resolution } });
  }

  // File size
  const size = formatBytes(media.bytes);
  if (media.bytes > limits.maxBytes) {
    checks.push({ rule: "size", status: "block", values: { actual: size, max: formatBytes(limits.maxBytes) }, fix: "compress" });
  } else {
    checks.push({ rule: "size", status: "pass", values: { actual: size, max: formatBytes(limits.maxBytes) } });
  }

  if (media.kind === "video") {
    // Duration
    if (media.durationSec !== null) {
      const actualDuration = formatDuration(media.durationSec);
      if (media.durationSec > limits.maxDurationSec) {
        checks.push({
          rule: "duration",
          status: "block",
          values: { actual: actualDuration, max: formatDuration(limits.maxDurationSec) },
          fix: "trim",
        });
      } else if (media.durationSec < limits.minDurationSec) {
        checks.push({
          rule: "duration",
          status: "block",
          values: { actual: actualDuration, min: formatDuration(limits.minDurationSec) },
        });
      } else {
        checks.push({ rule: "duration", status: "pass", values: { actual: actualDuration, max: formatDuration(limits.maxDurationSec) } });
      }
    }

    // Bitrate: too high means the platform re-encodes; too low means a soft picture.
    if (media.bitrateKbps !== null) {
      const actualRate = `${(media.bitrateKbps / 1000).toFixed(1)} Mbps`;
      if (limits.maxBitrateKbps && media.bitrateKbps > limits.maxBitrateKbps) {
        checks.push({
          rule: "bitrate",
          status: "warn",
          values: { actual: actualRate, max: `${limits.maxBitrateKbps / 1000} Mbps` },
          fix: "compress",
        });
      } else if (media.bitrateKbps < LOW_BITRATE_KBPS && shortSide >= 720) {
        checks.push({ rule: "bitrate", status: "warn", values: { actual: actualRate, max: "" } });
      } else {
        checks.push({ rule: "bitrate", status: "pass", values: { actual: actualRate } });
      }
    }
  }

  return checks;
}

// Grapheme count, so emoji sequences count once. Some platforms count differently;
// adapters can override this once each platform's rule is verified (TEST.md UNIT-06).
export function captionLength(text: string): number {
  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text)).length;
  } catch {
    return Array.from(text).length;
  }
}

export function checkCaption(text: string, platform: PlatformDescriptor): PreflightCheck {
  const length = captionLength(text);
  return {
    rule: "caption",
    status: length > platform.captionLimit ? "block" : "pass",
    values: { actual: length, max: platform.captionLimit },
  };
}

// More images than the platform takes in one post.
export function checkCount(images: number, platform: PlatformDescriptor): PreflightCheck | null {
  if (images < 2 || platform.maxImages === 0) return null;
  return {
    rule: "count",
    status: images > platform.maxImages ? "block" : "pass",
    values: { actual: images, max: platform.maxImages, platform: platform.name },
  };
}

// Platforms with a separate title (YouTube) need one, within the limit.
export function checkTitle(title: string, platform: PlatformDescriptor): PreflightCheck | null {
  const limit = platform.publishOptions?.title?.limit;
  if (!limit) return null;
  const length = captionLength(title.trim());
  return {
    rule: "title",
    status: length === 0 || length > limit ? "block" : "pass",
    values: { actual: length, max: limit, platform: platform.name },
  };
}

export function worstStatus(checks: PreflightCheck[]): CheckStatus {
  if (checks.some((c) => c.status === "block")) return "block";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}

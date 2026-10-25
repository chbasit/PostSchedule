// Username rules for the free username checkers, and alternatives built from a name.
// Availability is not checked: that would mean scraping the platforms (CLAUDE.md rule 11),
// so each result links to the profile address instead, for the person to open themselves.
// VERIFY before launch against each platform's help pages; set verifiedAt when checked.

export type HandlePlatform = "instagram" | "tiktok";
export type HandleRule = "length" | "characters" | "startPeriod" | "endPeriod" | "doublePeriod";

export type HandleSpec = {
  min: number;
  max: number;
  rules: readonly HandleRule[];
  profileUrl: (handle: string) => string;
  source: { url: string; verifiedAt: string | null };
};

export const HANDLE_SPECS: Record<HandlePlatform, HandleSpec> = {
  instagram: {
    min: 1,
    max: 30,
    rules: ["length", "characters", "startPeriod", "endPeriod", "doublePeriod"],
    profileUrl: (handle) => `https://www.instagram.com/${encodeURIComponent(handle)}/`,
    source: { url: "https://help.instagram.com/", verifiedAt: null },
  },
  tiktok: {
    min: 2,
    max: 24,
    rules: ["length", "characters", "endPeriod"],
    profileUrl: (handle) => `https://www.tiktok.com/@${encodeURIComponent(handle)}`,
    source: { url: "https://support.tiktok.com/", verifiedAt: null },
  },
};

// What people type: "@Name" and "name" are the same handle (both platforms ignore case).
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export type HandleCheck = { handle: string; length: number; results: Array<{ rule: HandleRule; ok: boolean }>; valid: boolean };

export function checkHandle(raw: string, platform: HandlePlatform): HandleCheck {
  const spec = HANDLE_SPECS[platform];
  const handle = normalizeHandle(raw);
  const length = [...handle].length;
  const passes: Record<HandleRule, boolean> = {
    length: length >= spec.min && length <= spec.max,
    characters: length > 0 && /^[a-z0-9._]+$/.test(handle),
    startPeriod: !handle.startsWith("."),
    endPeriod: !handle.endsWith("."),
    doublePeriod: !handle.includes(".."),
  };
  const results = spec.rules.map((rule) => ({ rule, ok: passes[rule] }));
  return { handle, length, results, valid: length > 0 && results.every((r) => r.ok) };
}

// Latin letters and digits from a name: accents dropped, everything else splits words.
function words(raw: string): string[] {
  return raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Valid alternatives in a fixed, readable order, without the handle itself.
export function suggestHandles(raw: string, platform: HandlePlatform, limit = 8): string[] {
  const parts = words(raw);
  if (parts.length === 0) return [];
  const joined = parts.join("");
  const candidates = [
    joined,
    parts.join("."),
    parts.join("_"),
    `the${joined}`,
    `${joined}.hq`,
    `${joined}_official`,
    `${joined}.co`,
    `get${joined}`,
    `${joined}_app`,
    `its${joined}`,
    `${joined}.daily`,
    `${joined}team`,
  ];
  const own = normalizeHandle(raw);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of candidates) {
    if (candidate === own || seen.has(candidate) || !checkHandle(candidate, platform).valid) continue;
    seen.add(candidate);
    out.push(candidate);
    if (out.length === limit) break;
  }
  return out;
}

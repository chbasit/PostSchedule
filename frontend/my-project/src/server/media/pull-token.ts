import { createHmac, timingSafeEqual } from "node:crypto";
import type { KeyRing } from "../crypto";

// Signed links to one stored file, for platforms that download videos from us (TikTok's
// PULL_FROM_URL). The token names the file and an expiry, signed with a key derived from the
// active encryption key, so it cannot be guessed, changed or used after it expires. Pure, so
// it is unit-tested (pull-token.test.ts).

export const PULL_PATH = "/api/v1/media/pull";

function key(ring: KeyRing) {
  return createHmac("sha256", ring.keys[ring.active]).update("media-pull-v1").digest();
}

export function signPull(storageKey: string, ring: KeyRing, origin: string, now = Date.now(), ttlSec = 3600): string {
  const payload = Buffer.from(JSON.stringify({ k: storageKey, e: Math.floor(now / 1000) + ttlSec }), "utf8").toString("base64url");
  const sig = createHmac("sha256", key(ring)).update(payload).digest("base64url");
  // A file extension on the end, for downloaders that look at it.
  const ext = storageKey.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "mp4";
  return `${origin}${PULL_PATH}/${payload}.${sig}.${ext}`;
}

// The stored file a link's last path part names, or null when altered or expired.
export function readPull(token: string, ring: KeyRing, now = Date.now()): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", key(ring)).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { k, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { k: unknown; e: unknown };
    return typeof k === "string" && typeof e === "number" && e * 1000 > now ? k : null;
  } catch {
    return null;
  }
}

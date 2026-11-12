import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Platform logins (Bluesky app passwords, OAuth tokens) are stored encrypted (BACKEND.md
// §17.1): AES-256-GCM, a fresh 12-byte IV per value, and the key id in front so keys can be
// rotated. ENCRYPTION_KEYS is {"k1":"<base64 32 bytes>", ...}; ENCRYPTION_ACTIVE_KEY_ID picks
// the key new values use. Old values keep decrypting while their key stays in the map.
// Format: "<keyId>:<iv>:<tag>:<ciphertext>", each part base64url.

export type KeyRing = { active: string; keys: Record<string, Buffer> };

export function parseKeyRing(json: string | undefined, active: string | undefined): KeyRing | null {
  if (!json || !active) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const keys: Record<string, Buffer> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[\w-]{1,32}$/.test(id) || typeof value !== "string") return null;
    const key = Buffer.from(value, "base64");
    if (key.length !== 32) return null;
    keys[id] = key;
  }
  return keys[active] ? { active, keys } : null;
}

export function encrypt(ring: KeyRing, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ring.keys[ring.active], iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [ring.active, iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(":");
}

// Throws when the value was changed or its key is gone.
export function decrypt(ring: KeyRing, value: string): string {
  const [id, iv, tag, data] = value.split(":");
  const key = ring.keys[id];
  if (!key || !iv || !tag || data === undefined) throw new Error("undecryptable");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

import "server-only";
import sharp from "sharp";
import { ASPECT_SIZES, type ImageAspect } from "@/lib/ai/images";
import { adminClient } from "../supabase";

// Generated images live in a private Supabase Storage bucket and are shown through
// short-lived signed URLs. When media moves to Cloudflare R2 (BACKEND.md §10), only this
// file changes.

const SIGNED_URL_SECONDS = 60 * 60;

let bucketReady: Promise<void> | null = null;

// Read on its own (not through aiEnv), so posts show their AI images even if the AI
// provider's key is later removed.
function bucket() {
  const name = process.env.AI_STORAGE_BUCKET;
  return name && /^[a-z0-9-]{3,63}$/.test(name) ? name : "ai-images";
}

// Creates the bucket on first use. "Already exists" is the normal case after that.
function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const name = bucket();
    const { error } = await adminClient().storage.createBucket(name, {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      bucketReady = null;
      throw error;
    }
  })();
  return bucketReady;
}

// Crops to the exact ratio the platforms use (keeping the most interesting part) and
// encodes a JPEG that every platform accepts.
export async function normalizeImage(bytes: Buffer, aspect: ImageAspect): Promise<{ bytes: Buffer; width: number; height: number }> {
  const { width, height } = ASPECT_SIZES[aspect];
  const out = await sharp(bytes)
    .rotate()
    .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return { bytes: out, width, height };
}

export async function storeImage(key: string, bytes: Buffer): Promise<void> {
  await ensureBucket();
  const { error } = await adminClient().storage.from(bucket()).upload(key, bytes, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
  if (error) throw error;
}

export async function removeImages(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { error } = await adminClient().storage.from(bucket()).remove(keys);
  if (error) console.error("[ai] storage remove failed", error.message);
}

// The image itself, for publishing to platforms that take the bytes (Bluesky).
export async function readImage(key: string): Promise<Buffer> {
  const { data, error } = await adminClient().storage.from(bucket()).download(key);
  if (error || !data) throw error ?? new Error("image not found");
  return Buffer.from(await data.arrayBuffer());
}

// One request for every URL on a page, however many images it shows.
export async function signedUrls(keys: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return new Map();
  const { data, error } = await adminClient().storage.from(bucket()).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error || !data) {
    console.error("[ai] signing failed", error?.message);
    return new Map();
  }
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

export function imageKey(workspaceId: string, generationId: string, index: number) {
  return `${workspaceId}/${generationId}/${index + 1}.jpg`;
}

// Storage keys of AI images start with the workspace id, so a key is only signed for the
// workspace that owns it.
export const isAiKey = (workspaceId: string, key: string) => key.startsWith(`${workspaceId}/`);

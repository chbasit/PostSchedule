import "server-only";
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "@/lib/media";
import { adminClient } from "../supabase";

// Uploaded photos and videos live in a private Supabase Storage bucket (DECISIONS.md
// 2026-11-12). The browser sends each file straight there through a signed upload URL, so the
// app never handles the bytes; pages and platforms read files through short-lived signed URLs.
// Moving to Cloudflare R2 later (BACKEND.md §10) changes only this file.

const SIGNED_URL_SECONDS = 60 * 60;

let bucketReady: Promise<void> | null = null;

function bucket() {
  const name = process.env.MEDIA_BUCKET;
  return name && /^[a-z0-9-]{3,63}$/.test(name) ? name : "media";
}

// Creates the bucket on first use. "Already exists" is the normal case after that.
function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const { error } = await adminClient().storage.createBucket(bucket(), {
      public: false,
      fileSizeLimit: MAX_UPLOAD_BYTES,
      allowedMimeTypes: Object.keys(UPLOAD_TYPES),
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      bucketReady = null;
      throw error;
    }
  })();
  return bucketReady;
}

// Where the browser PUTs the file. The URL carries its own token and works once.
export async function uploadUrl(key: string): Promise<string> {
  await ensureBucket();
  const { data, error } = await adminClient().storage.from(bucket()).createSignedUploadUrl(key);
  if (error || !data) throw error ?? new Error("no signed upload url");
  return data.signedUrl;
}

// The stored file's size and type, or null when nothing arrived under the key.
export async function storedFile(key: string): Promise<{ bytes: number; mime: string } | null> {
  const slash = key.lastIndexOf("/");
  const { data, error } = await adminClient()
    .storage.from(bucket())
    .list(key.slice(0, slash), { search: key.slice(slash + 1), limit: 1 });
  const file = error ? undefined : data?.find((f) => f.name === key.slice(slash + 1));
  if (!file?.metadata) return null;
  return { bytes: Number(file.metadata.size ?? 0), mime: String(file.metadata.mimetype ?? "") };
}

// The file itself, for publishing to platforms that take the bytes (Bluesky).
export async function readMedia(key: string): Promise<Buffer> {
  const { data, error } = await adminClient().storage.from(bucket()).download(key);
  if (error || !data) throw error ?? new Error("media not found");
  return Buffer.from(await data.arrayBuffer());
}

// One request for every URL on a page, however many files it shows.
export async function signedMediaUrls(keys: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return new Map();
  const { data, error } = await adminClient().storage.from(bucket()).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error || !data) {
    console.error("[media] signing failed", error?.message);
    return new Map();
  }
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

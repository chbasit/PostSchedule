// Upload rules the browser and the server share (DECISIONS.md 2026-11-12).

// Photos and videos are stored in Supabase Storage for now, whose free plan takes files up to
// 50 MB. Raise this together with the storage plan (or a move to Cloudflare R2).
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// The file types the composer accepts, and what each one is.
export const UPLOAD_TYPES = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "video/x-m4v": "video",
} as const satisfies Record<string, "image" | "video">;

export type UploadMime = keyof typeof UPLOAD_TYPES;

export function uploadKind(mime: string): "image" | "video" | null {
  return Object.hasOwn(UPLOAD_TYPES, mime) ? UPLOAD_TYPES[mime as UploadMime] : null;
}

// Keys start with the workspace id, then the asset id, then a safe version of the file name.
export function mediaKey(workspaceId: string, assetId: string, name: string) {
  // Only the last part of a name that carries a path ("../photos/a.jpg").
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${workspaceId}/${assetId}/${stem || "file"}${ext ? `.${ext}` : ""}`;
}

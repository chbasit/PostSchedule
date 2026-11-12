import { z } from "zod";
import { MAX_UPLOAD_BYTES, mediaKey, uploadKind } from "@/lib/media";
import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { uploadUrl } from "@/server/media/storage";
import { ok, readBody, route } from "@/server/route";
import { adminClient } from "@/server/supabase";

// Starts an upload: a media row in "uploading" and a signed URL the browser PUTs the file to
// (src/server/media/storage.ts). The browser measures the file (probeMedia) because this host
// cannot read video files; the platforms check again when the post goes out.
const body = z.object({
  name: z.string().trim().min(1).max(200),
  bytes: z.number().int().positive(),
  mime: z.string().max(100),
  width: z.number().int().min(0).max(20_000).default(0),
  height: z.number().int().min(0).max(20_000).default(0),
  durationSec: z.number().min(0).max(24 * 60 * 60).nullable().default(null),
});

export const POST = route<{ ws: string }>(async (req, { ws }) => {
  const { user } = await requireMember(ws, "post.create");
  const input = await readBody(req, body);
  const kind = uploadKind(input.mime);
  if (!kind) throw fail.validation("This file type is not supported.", { reason: "unsupported_type" });
  if (input.bytes > MAX_UPLOAD_BYTES) throw fail.validation("This file is too large.", { reason: "too_large", maxBytes: MAX_UPLOAD_BYTES });

  const id = crypto.randomUUID();
  const key = mediaKey(ws, id, input.name);
  ok(
    await adminClient()
      .from("media_assets")
      .insert({
        id,
        workspace_id: ws,
        uploader_id: user.id,
        storage_key: key,
        name: input.name,
        kind,
        mime: input.mime,
        bytes: input.bytes,
        width: input.width || null,
        height: input.height || null,
        duration_ms: input.durationSec === null ? null : Math.round(input.durationSec * 1000),
        status: "uploading",
        source: "upload",
      }),
  );
  return { assetId: id, uploadUrl: await uploadUrl(key) };
});

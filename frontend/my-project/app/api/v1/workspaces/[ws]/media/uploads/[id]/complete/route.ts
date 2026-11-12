import type { MediaSummary } from "@/lib/api/types";
import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { signedMediaUrls, storedFile } from "@/server/media/storage";
import { must, ok, route, uuid } from "@/server/route";
import { adminClient } from "@/server/supabase";

type UploadRow = {
  kind: "image" | "video";
  name: string;
  mime: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  storage_key: string;
};

// Finishes an upload: the file must be in storage under the row's key. Its stored size wins
// over what the browser said.
export const POST = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  await requireMember(ws, "post.create");
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const admin = adminClient();
  const row = must(
    await admin
      .from("media_assets")
      .select("kind, name, mime, width, height, duration_ms, storage_key")
      .eq("workspace_id", ws)
      .eq("id", id)
      .eq("source", "upload")
      .maybeSingle<UploadRow>(),
  );

  const stored = await storedFile(row.storage_key);
  if (!stored) throw fail.validation("The file did not arrive. Upload it again.", { reason: "upload_missing" });
  ok(
    await admin
      .from("media_assets")
      .update({ status: "ready", bytes: stored.bytes, mime: stored.mime || row.mime })
      .eq("workspace_id", ws)
      .eq("id", id),
  );

  const urls = await signedMediaUrls([row.storage_key]);
  return {
    id,
    kind: row.kind,
    name: row.name,
    bytes: stored.bytes,
    width: row.width ?? 0,
    height: row.height ?? 0,
    durationSec: row.duration_ms === null ? null : row.duration_ms / 1000,
    previewUrl: urls.get(row.storage_key) ?? null,
  } satisfies MediaSummary;
});

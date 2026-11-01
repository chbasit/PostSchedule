import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildImagePrompt, IMAGE_ASPECTS, IMAGE_QUALITIES, IMAGE_STYLES, MAX_IMAGES_PER_REQUEST, PROMPT_MAX, type ImageAspect, type ImageStyle } from "@/lib/ai/images";
import type { AiImage, AiImageResult } from "@/lib/api/types";
import { imageCost, type AiImageQuality } from "@/lib/billing/plans";
import { aiEnv } from "../env";
import { fail } from "../errors";
import { must, ok, uuid } from "../route";
import { adminClient } from "../supabase";
import { creditStatus, withCredits } from "./credits";
import { imageProvider } from "./providers";
import { imageKey, normalizeImage, removeImages, signedUrls, storeImage } from "./storage";

export const imageInput = z.object({
  prompt: z.string().trim().min(1).max(PROMPT_MAX),
  style: z.enum(IMAGE_STYLES),
  aspect: z.enum(IMAGE_ASPECTS),
  quality: z.enum(IMAGE_QUALITIES),
  count: z.number().int().min(1).max(MAX_IMAGES_PER_REQUEST),
});

type ImageRow = {
  id: string;
  prompt: string;
  style: ImageStyle;
  aspect: ImageAspect;
  quality: AiImageQuality;
  created_at: string;
  media_assets: { id: string; name: string; bytes: number | null; width: number | null; height: number | null; storage_key: string } | null;
};

const IMAGE_SELECT = "id, prompt, style, aspect, quality, created_at, media_assets(id, name, bytes, width, height, storage_key)";

async function toImages(rows: ImageRow[]): Promise<AiImage[]> {
  const urls = await signedUrls(rows.flatMap((r) => (r.media_assets ? [r.media_assets.storage_key] : [])));
  return rows.flatMap((r) => {
    const m = r.media_assets;
    if (!m) return [];
    return [
      {
        id: r.id,
        prompt: r.prompt,
        style: r.style,
        aspect: r.aspect,
        quality: r.quality,
        createdAt: r.created_at,
        media: {
          id: m.id,
          kind: "image" as const,
          name: m.name,
          bytes: m.bytes ?? 0,
          width: m.width ?? 0,
          height: m.height ?? 0,
          durationSec: null,
          previewUrl: urls.get(m.storage_key) ?? null,
        },
      },
    ];
  });
}

// Newest first; the library page shows the latest 200.
export async function listImages(db: SupabaseClient, workspaceId: string): Promise<AiImage[]> {
  const rows = must(await db.from("ai_images").select(IMAGE_SELECT).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200));
  return toImages(rows as unknown as ImageRow[]);
}

export async function generateImages(workspaceId: string, userId: string, input: z.infer<typeof imageInput>): Promise<AiImageResult> {
  const provider = imageProvider(aiEnv("image"));
  const { result: images } = await withCredits(
    {
      workspaceId,
      userId,
      kind: "image",
      credits: imageCost(input.quality, input.count),
      input: { style: input.style, aspect: input.aspect, quality: input.quality, count: input.count, prompt: input.prompt },
    },
    provider,
    async (generationId) => {
      const raw = await provider.generate({
        prompt: buildImagePrompt(input.prompt, input.style, input.aspect),
        aspect: input.aspect,
        quality: input.quality,
        count: input.count,
      });
      // Crop, encode and upload side by side; then register them in one insert each.
      const stored = await Promise.all(
        raw.map(async (img, i) => {
          const out = await normalizeImage(img.bytes, input.aspect);
          const key = imageKey(workspaceId, generationId, i);
          await storeImage(key, out.bytes);
          return { key, ...out };
        }),
      );
      const admin = adminClient();
      try {
        const assets = must(
          await admin
            .from("media_assets")
            .insert(
              stored.map((s, i) => ({
                workspace_id: workspaceId,
                uploader_id: userId,
                storage_key: s.key,
                name: `ai-${input.aspect.replace(":", "x")}-${i + 1}.jpg`,
                kind: "image",
                mime: "image/jpeg",
                bytes: s.bytes.length,
                width: s.width,
                height: s.height,
                status: "ready",
                source: "ai",
              })),
            )
            .select("id, storage_key"),
        ) as Array<{ id: string; storage_key: string }>;
        const byKey = new Map(assets.map((a) => [a.storage_key, a.id]));
        const rows = must(
          await admin
            .from("ai_images")
            .insert(
              stored.map((s) => ({
                workspace_id: workspaceId,
                generation_id: generationId,
                media_asset_id: byKey.get(s.key),
                prompt: input.prompt,
                style: input.style,
                aspect: input.aspect,
                quality: input.quality,
                created_by: userId,
              })),
            )
            .select(IMAGE_SELECT),
        ) as unknown as ImageRow[];
        return toImages(rows);
      } catch (e) {
        // The charge is refunded by withCredits; don't leave orphaned files behind.
        await removeImages(stored.map((s) => s.key));
        throw e;
      }
    },
  );
  return { images, credits: await creditStatus(workspaceId) };
}

// Removes the image from the library. The file itself goes only when no post uses it, so
// scheduled posts never lose their media.
export async function deleteImage(db: SupabaseClient, workspaceId: string, imageId: string): Promise<void> {
  if (!uuid.safeParse(imageId).success) throw fail.notFound();
  // Read through the member's own client: row-level security confirms it is theirs.
  const row = (await db.from("ai_images").select("id, media_asset_id, media_assets(storage_key)").eq("workspace_id", workspaceId).eq("id", imageId).maybeSingle()).data as {
    id: string;
    media_asset_id: string;
    media_assets: { storage_key: string } | null;
  } | null;
  // Deleting twice is not an error (TEST.md DBL-21).
  if (!row) return;
  const admin = adminClient();
  ok(await admin.from("ai_images").delete().eq("workspace_id", workspaceId).eq("id", imageId));
  const { count } = await admin.from("post_media").select("post_id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("media_asset_id", row.media_asset_id);
  if (count === 0) {
    ok(await admin.from("media_assets").delete().eq("workspace_id", workspaceId).eq("id", row.media_asset_id));
    if (row.media_assets?.storage_key) await removeImages([row.media_assets.storage_key]);
  }
}

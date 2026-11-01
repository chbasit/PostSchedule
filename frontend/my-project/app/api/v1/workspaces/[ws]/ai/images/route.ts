import { generateImages, imageInput, listImages } from "@/server/ai/images";
import { requireAi } from "@/server/env";
import { requireMember } from "@/server/guards";
import { idempotent } from "@/server/idempotency";
import { readBody, route } from "@/server/route";

// Image models take up to a minute, and four images are cropped and stored after that.
export const maxDuration = 120;

export const GET = route<{ ws: string }>(async (_req, { ws }) => {
  requireAi();
  const { db } = await requireMember(ws);
  return listImages(db, ws);
});

// Credits are charged before the model runs and refunded if it fails; the Idempotency-Key
// makes a retried request return the first answer instead of paying twice (TEST.md DBL-01).
export const POST = route<{ ws: string }>(async (req, { ws }) => {
  requireAi();
  const { user } = await requireMember(ws, "post.create");
  const input = await readBody(req, imageInput);
  return idempotent(ws, "ai.images", req.headers.get("idempotency-key"), input, () => generateImages(ws, user.id, input));
});

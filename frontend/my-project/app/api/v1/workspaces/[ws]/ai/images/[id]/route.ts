import { deleteImage } from "@/server/ai/images";
import { requireAi } from "@/server/env";
import { requireMember } from "@/server/guards";
import { route } from "@/server/route";

export const DELETE = route<{ ws: string; id: string }>(async (_req, { ws, id }) => {
  requireAi();
  const { db } = await requireMember(ws, "post.create");
  await deleteImage(db, ws, id);
  return undefined;
});

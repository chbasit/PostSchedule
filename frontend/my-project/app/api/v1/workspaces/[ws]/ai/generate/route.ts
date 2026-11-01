import { generateCaption, generateInput } from "@/server/ai/text";
import { requireAi } from "@/server/env";
import { requireMember } from "@/server/guards";
import { readBody, route } from "@/server/route";

export const maxDuration = 60;

export const POST = route<{ ws: string }>(async (req, { ws }) => {
  requireAi();
  const { user } = await requireMember(ws, "post.create");
  const input = await readBody(req, generateInput);
  return generateCaption(ws, user.id, input);
});

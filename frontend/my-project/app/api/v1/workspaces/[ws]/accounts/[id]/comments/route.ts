import { z } from "zod";
import { getPlatform, type PlatformId } from "@/providers/catalog";
import { answer, graphemes, postComments, REPLY_MAX, type EngageAccount } from "@/server/engage";
import { fail } from "@/server/errors";
import { requireMember } from "@/server/guards";
import { idempotent } from "@/server/idempotency";
import { forgetAccount } from "@/server/insights";
import { readBody, route, uuid } from "@/server/route";
import { adminClient } from "@/server/supabase";

// Replies on the account's posts: GET reads them, POST answers one (or the post itself).
// Anyone in the workspace can read; answering needs the right to post (BACKEND.md 5.3).
const ref = z.string().startsWith("at://").max(300);
const body = z.object({
  postRef: ref,
  parentRef: ref,
  text: z
    .string()
    .trim()
    .min(1)
    .refine((t) => graphemes(t) <= REPLY_MAX, `Replies on Bluesky hold up to ${REPLY_MAX} characters.`),
});

async function loadAccount(ws: string, id: string): Promise<EngageAccount> {
  if (!uuid.safeParse(id).success) throw fail.notFound();
  const row = (
    await adminClient()
      .from("social_accounts")
      .select("provider, provider_account_id, handle, display_name, access_token_enc, metadata")
      .eq("workspace_id", ws)
      .eq("id", id)
      .maybeSingle<{ provider: PlatformId; provider_account_id: string; handle: string | null; display_name: string | null; access_token_enc: string | null; metadata: { pds?: string } | null }>()
  ).data;
  if (!row) throw fail.notFound();
  if (row.provider !== "bluesky") throw fail.notConfigured(`Replies on ${getPlatform(row.provider).name}`);
  return { providerAccountId: row.provider_account_id, handle: row.handle, displayName: row.display_name, tokenEnc: row.access_token_enc, pds: row.metadata?.pds };
}

export const GET = route<{ ws: string; id: string }>(async (req, { ws, id }) => {
  await requireMember(ws);
  const post = ref.safeParse(req.nextUrl.searchParams.get("post"));
  if (!post.success) throw fail.validation("Choose a post.");
  return postComments(await loadAccount(ws, id), post.data);
});

export const POST = route<{ ws: string; id: string }>(async (req, { ws, id }) => {
  await requireMember(ws, "post.create");
  const input = await readBody(req, body);
  const account = await loadAccount(ws, id);
  return idempotent(ws, "comment.reply", req.headers.get("idempotency-key"), input, async () => {
    const sent = await answer(account, input.postRef, input.parentRef, input.text);
    forgetAccount(account.providerAccountId);
    return sent;
  });
});

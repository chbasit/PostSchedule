import "server-only";
import type { PostComment, PostComments } from "@/lib/api/types";
import { decrypt } from "./crypto";
import { tokenKeys } from "./env";
import { ApiFailure, fail } from "./errors";
import { BlueskyError, getPost, login, postedAt, postThread, postUrl, reply, type ThreadNode } from "./providers/bluesky";

// Replies on the account's posts, read and answered from the dashboard (founder's call,
// 2026-11-13; Bluesky first, the platform the app can connect today).

export type EngageAccount = { providerAccountId: string; handle: string | null; displayName: string | null; tokenEnc: string | null; pds: string | undefined };

// Only the account's own posts: at://<its DID>/app.bsky.feed.post/<id>.
function ownPost(account: EngageAccount, ref: string) {
  if (!ref.startsWith(`at://${account.providerAccountId}/app.bsky.feed.post/`)) throw fail.validation("This post is not from this account.", { reason: "not_own_post" });
}

function toComments(nodes: ThreadNode[] | undefined, did: string): PostComment[] {
  return (nodes ?? [])
    .filter((n) => n.$type?.endsWith("#threadViewPost") && n.post)
    .map((n) => {
      const post = n.post!;
      return {
        ref: post.uri,
        author: { name: post.author.displayName?.trim() || post.author.handle, handle: post.author.handle, avatarUrl: post.author.avatar ?? null },
        text: post.record.text ?? "",
        createdAt: postedAt(post),
        likes: post.likeCount ?? 0,
        mine: post.author.did === did,
        replies: toComments(n.replies, did),
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const count = (list: PostComment[]): number => list.reduce((n, c) => n + 1 + count(c.replies), 0);

export async function postComments(account: EngageAccount, postRef: string): Promise<PostComments> {
  ownPost(account, postRef);
  let thread;
  try {
    thread = await postThread(postRef);
  } catch (e) {
    if (e instanceof BlueskyError && e.code === "rate_limited") throw fail.rateLimited(60);
    throw new ApiFailure(502, "provider_error", "Bluesky did not answer. Try again in a minute.");
  }
  if (!thread?.post) throw fail.notFound();
  const comments = toComments(thread.replies, account.providerAccountId);
  return { postRef, url: postUrl(thread.post), total: count(comments), comments };
}

// Bluesky posts hold up to 300 graphemes (what people see as characters).
export const REPLY_MAX = 300;
export function graphemes(text: string) {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
}

export async function answer(account: EngageAccount, postRef: string, parentRef: string, text: string): Promise<PostComment> {
  ownPost(account, postRef);
  if (!account.tokenEnc) throw fail.validation("Reconnect this Bluesky account to reply.", { reason: "reconnect" });
  try {
    const parent = await getPost(parentRef);
    if (!parent) throw fail.notFound();
    // A reply's thread starts at our post; answering the post itself makes it the root too.
    const root = parent.record.reply?.root ?? { uri: parent.uri, cid: parent.cid };
    if (root.uri !== postRef) throw fail.validation("This reply is not on this post.", { reason: "other_thread" });
    const session = await login(account.providerAccountId, decrypt(tokenKeys(), account.tokenEnc), account.pds);
    const created = await reply(session, text, root, { uri: parent.uri, cid: parent.cid });
    return {
      ref: created.uri,
      author: { name: account.displayName ?? session.handle, handle: session.handle, avatarUrl: null },
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      mine: true,
      replies: [],
    };
  } catch (e) {
    if (!(e instanceof BlueskyError)) throw e;
    if (e.code === "auth") throw fail.validation("Bluesky refused the app password. Reconnect the account.", { reason: "reconnect" });
    if (e.code === "rate_limited") throw fail.rateLimited(60);
    if (e.code === "rejected") throw fail.validation(`Bluesky said: ${e.message}`, { reason: "rejected" });
    throw new ApiFailure(502, "provider_error", "Bluesky did not answer. Try again in a minute.");
  }
}

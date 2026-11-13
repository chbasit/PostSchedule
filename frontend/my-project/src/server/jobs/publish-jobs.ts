import "server-only";
import { z } from "zod";
import { claimDuePosts, resolveTikTokChecks, sendClaimedPost } from "../publish";
import { inngest } from "./inngest";

// Scheduled publishing (BACKEND.md §8, DECISIONS.md 2026-11-13). Every minute one check
// claims the posts that are due and sends one event per post; each event runs its own publish
// job, so a slow platform holds up one post, not the rest, and a job that fails is retried.

const DUE_EVENT = "post/publish.due";
// Events per send, well under Inngest's request size.
const BATCH = 500;

const dueData = z.object({ workspaceId: z.uuid(), postId: z.uuid(), scheduledAt: z.string() });

export const findDuePosts = inngest.createFunction(
  // Two checks may overlap safely: the claim is one statement, so no post is taken twice. No
  // "singleton" lock on purpose: a stuck check holding it would stop every check after it.
  { id: "find-due-posts", triggers: [{ cron: "* * * * *" }], timeouts: { finish: "5m" } },
  async ({ step }) => {
    const { lapsed, due } = await step.run("claim-due-posts", () => claimDuePosts());
    // TikTok videos that were still processing when their send stopped waiting.
    await step.run("check-tiktok-processing", () => resolveTikTokChecks());
    for (let i = 0; i < due.length; i += BATCH) {
      await step.sendEvent(
        `send-batch-${i / BATCH}`,
        // The id drops a repeat of the same post and time (a stuck post sent again).
        due.slice(i, i + BATCH).map((post) => ({ name: DUE_EVENT, id: `publish:${post.postId}:${post.scheduledAt}`, data: post })),
      );
    }
    return { lapsed, due: due.length };
  },
);

export const publishDuePost = inngest.createFunction(
  {
    id: "publish-post",
    triggers: [{ event: DUE_EVENT }],
    // At most 5 posts on their way at once (Inngest's free plan allows 5; raise this with a paid
    // plan), and 2 per workspace, so one busy workspace never holds up everyone else's posts
    // (BACKEND.md §8.2, fairness).
    concurrency: [{ limit: 5 }, { key: "event.data.workspaceId", limit: 2 }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { workspaceId, postId } = dueData.parse(event.data);
    return step.run("send-post", () => sendClaimedPost(workspaceId, postId));
  },
);

export const functions = [findDuePosts, publishDuePost];

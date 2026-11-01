import "server-only";
import { z } from "zod";
import type { AiResult, AiRewriteAction } from "@/lib/api/types";
import { AI_COSTS } from "@/lib/billing/plans";
import { PLATFORMS } from "@/providers/catalog";
import { aiEnv } from "../env";
import { creditStatus, withCredits } from "./credits";
import { textProvider } from "./providers";

// The composer's AI writer. Prompts carry only what the person typed and the platforms they
// chose (BACKEND.md §16 isolation); the output is plain text the UI shows escaped.

const locale = z.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/).max(20);
const maxLength = z.number().int().min(20).max(63_206);

export const generateInput = z.object({
  prompt: z.string().trim().min(1).max(600),
  platforms: z.array(z.enum(PLATFORMS.map((p) => p.id) as [string, ...string[]])).max(10),
  maxLength,
  locale,
});

export const rewriteInput = z.object({
  text: z.string().trim().min(1).max(20_000),
  action: z.enum(["rephrase", "shorten", "expand", "casual", "formal"]),
  maxLength,
  locale,
});

const ACTIONS: Record<AiRewriteAction, string> = {
  rephrase: "Rephrase it with fresh wording, keeping the meaning and length.",
  shorten: "Make it noticeably shorter while keeping the key message.",
  expand: "Expand it with one or two more useful sentences, without inventing facts.",
  casual: "Make the tone more casual and friendly.",
  formal: "Make the tone more formal and professional.",
};

function system(language: string, limit: number) {
  return [
    "You write social media captions for a brand.",
    `Write in the language with the code "${language}".`,
    `Stay under ${limit} characters, including hashtags and emoji.`,
    "Use at most three relevant hashtags, at the end.",
    "Never invent prices, dates, statistics, quotes or claims that the request does not give.",
    "Answer with the caption only: no preamble, no quotes around it, no notes.",
  ].join(" ");
}

const tokens = (limit: number) => Math.min(1500, Math.ceil(limit / 3) + 120);

// Models sometimes wrap the caption in quotes despite the instruction.
const clean = (text: string) => text.replace(/^["“”']+|["“”']+$/g, "").trim();

async function run(workspaceId: string, userId: string, input: Record<string, unknown>, ask: { system: string; user: string; maxTokens: number }): Promise<AiResult> {
  const provider = textProvider(aiEnv("text"));
  const { result } = await withCredits({ workspaceId, userId, kind: "caption", credits: AI_COSTS.caption, input }, provider, () => provider.complete(ask));
  const credits = await creditStatus(workspaceId);
  return { text: clean(result), creditsRemaining: credits.remaining, creditsLimit: credits.limit + credits.bonus };
}

export function generateCaption(workspaceId: string, userId: string, input: z.infer<typeof generateInput>) {
  const names = input.platforms.map((id) => PLATFORMS.find((p) => p.id === id)?.name ?? id).join(", ");
  return run(workspaceId, userId, { action: "generate", platforms: input.platforms, prompt: input.prompt }, {
    system: system(input.locale, input.maxLength),
    user: `Write one caption${names ? ` for ${names}` : ""} about:\n${input.prompt}`,
    maxTokens: tokens(input.maxLength),
  });
}

export function rewriteCaption(workspaceId: string, userId: string, input: z.infer<typeof rewriteInput>) {
  return run(workspaceId, userId, { action: input.action }, {
    system: system(input.locale, input.maxLength),
    user: `${ACTIONS[input.action]}\n\nCaption:\n${input.text}`,
    maxTokens: tokens(input.maxLength),
  });
}

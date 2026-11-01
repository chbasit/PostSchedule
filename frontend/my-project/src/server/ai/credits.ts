import "server-only";
import type { AiCredits } from "@/lib/api/types";
import { ApiFailure, fail } from "../errors";
import { fromDb } from "../route";
import { adminClient } from "../supabase";
import { ProviderError, type ProviderId } from "./providers";

// AI credits (BACKEND.md §16). The database does the arithmetic under a row lock
// (reserve_ai_credits), so concurrent requests can never overspend. Callers have already
// checked membership: these run with the service role.

type StatusRow = { credit_limit: number; bonus: number; used: number; resets_at: string };

export async function creditStatus(workspaceId: string): Promise<AiCredits> {
  const { data, error } = await adminClient().rpc("ai_credit_status", { p_workspace_id: workspaceId }).maybeSingle<StatusRow>();
  if (error) throw fromDb(error);
  if (!data) throw fail.notFound();
  return {
    limit: data.credit_limit,
    bonus: data.bonus,
    used: data.used,
    remaining: Math.max(0, data.credit_limit - data.used) + data.bonus,
    resetsAt: new Date(data.resets_at).toISOString(),
  };
}

async function reserve(workspaceId: string, userId: string, kind: "caption" | "image", credits: number, input: Record<string, unknown>) {
  const { data, error } = await adminClient()
    .rpc("reserve_ai_credits", { p_workspace_id: workspaceId, p_user_id: userId, p_kind: kind, p_credits: credits, p_input: input })
    .single<{ generation_id: string; remaining: number }>();
  if (error) {
    if (error.message.includes("ai_credits_exhausted")) {
      const status = await creditStatus(workspaceId).catch(() => null);
      throw fail.planLimit("You do not have enough AI credits left this month.", { reason: "ai_credits", needed: credits, remaining: status?.remaining ?? null });
    }
    throw fromDb(error);
  }
  return data;
}

async function settle(workspaceId: string, generationId: string, ok: boolean, provider: string | null, model: string | null, errorText: string | null) {
  const { error } = await adminClient().rpc("settle_ai_generation", {
    p_generation_id: generationId,
    p_workspace_id: workspaceId,
    p_ok: ok,
    p_provider: provider,
    p_model: model,
    p_error: errorText,
  });
  // The ledger row stays pending and stops counting after 15 minutes; never fail the request.
  if (error) console.error("[ai] settle failed", generationId, error.code);
}

export function providerFailure(e: ProviderError): ApiFailure {
  switch (e.kind) {
    case "rate_limited":
      return fail.rateLimited(30);
    case "content_rejected":
      return fail.validation("The AI service would not create this. Change the description and try again.", { reason: "content_rejected" });
    default:
      return new ApiFailure(502, "provider_error", "The AI service did not answer. No credits were used. Try again.");
  }
}

/**
 * Charges `credits`, runs the work, and keeps the charge only if it succeeds. Provider
 * errors become API errors; anything else is refunded and rethrown.
 */
export async function withCredits<T>(
  ctx: { workspaceId: string; userId: string; kind: "caption" | "image"; credits: number; input: Record<string, unknown> },
  provider: { id: ProviderId; model: string },
  run: (generationId: string) => Promise<T>,
): Promise<{ result: T; generationId: string }> {
  const { generation_id: generationId } = await reserve(ctx.workspaceId, ctx.userId, ctx.kind, ctx.credits, ctx.input);
  try {
    const result = await run(generationId);
    await settle(ctx.workspaceId, generationId, true, provider.id, provider.model, null);
    return { result, generationId };
  } catch (e) {
    await settle(ctx.workspaceId, generationId, false, provider.id, provider.model, e instanceof Error ? e.message : "failed");
    if (e instanceof ProviderError) throw providerFailure(e);
    throw e;
  }
}

import "server-only";
import { z } from "zod";
import type { BillingInterval, PlanKey } from "@/lib/billing/plans";
import { billingEnv, siteUrl } from "../env";
import { ApiFailure, fail } from "../errors";
import { must, ok } from "../route";
import { adminClient } from "../supabase";
import {
  API_BASE,
  bodyHash,
  checkoutRequest,
  checkoutResponse,
  isStale,
  parseVariants,
  subscriptionPatch,
  subscriptionResponse,
  verifySignature,
  webhookPayload,
  type WebhookPayload,
} from "./lemonsqueezy";

function headers(apiKey: string) {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`,
  };
}

const PAID_STATUSES = ["trialing", "active", "past_due", "paused", "cancelled"];

// BACKEND.md 11.2: one checkout per workspace and plan at a time, variant from our own map.
export async function createCheckout(input: {
  workspaceId: string;
  userId: string;
  email: string;
  plan: PlanKey;
  interval: BillingInterval;
  locale: string;
}): Promise<{ url: string }> {
  const env = billingEnv();
  const variants = parseVariants(env.LEMONSQUEEZY_VARIANTS);
  const variantId = variants.byPlan.get(`${input.plan}:${input.interval}`);
  if (!variantId) throw fail.validation("That plan isn't on sale yet.", { field: "plan" });

  const db = adminClient();
  const sub = must(
    await db.from("subscriptions").select("plan_key, interval, status, ls_subscription_id").eq("workspace_id", input.workspaceId).single(),
  ) as { plan_key: string; interval: string | null; status: string; ls_subscription_id: string | null };
  if (sub.ls_subscription_id && PAID_STATUSES.includes(sub.status)) {
    // A second checkout would start a second subscription. Plan changes go through the portal.
    throw fail.conflict("This workspace already has a paid plan. Change it from Invoices and payment method.", { reason: "has_subscription" });
  }

  const soon = new Date(Date.now() + 5 * 60_000).toISOString();
  const open = await db
    .from("checkout_sessions")
    .select("url")
    .eq("workspace_id", input.workspaceId)
    .eq("plan_key", input.plan)
    .eq("interval", input.interval)
    .gt("expires_at", soon)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open.data) return { url: open.data.url as string };

  const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
  const res = await fetch(`${API_BASE}/checkouts`, {
    method: "POST",
    headers: headers(env.LEMONSQUEEZY_API_KEY),
    body: JSON.stringify(
      checkoutRequest({
        storeId: env.LEMONSQUEEZY_STORE_ID,
        variantId,
        email: input.email,
        workspaceId: input.workspaceId,
        userId: input.userId,
        redirectUrl: `${siteUrl()}/${input.locale}/dashboard/settings/billing?checkout=return&plan=${input.plan}`,
        testMode: env.LEMONSQUEEZY_TEST_MODE === "true",
        expiresAt,
      }),
    ),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res || !res.ok) {
    console.error("[lemonsqueezy] checkout failed", res?.status);
    throw new ApiFailure(502, "provider_error", "The payment page could not be opened. Try again in a moment.");
  }
  const created = checkoutResponse.parse(await res.json());
  ok(
    await db.from("checkout_sessions").insert({
      workspace_id: input.workspaceId,
      plan_key: input.plan,
      interval: input.interval,
      checkout_id: created.data.id,
      url: created.data.attributes.url,
      created_by: input.userId,
      expires_at: expiresAt,
    }),
  );
  return { url: created.data.attributes.url };
}

// The customer portal link is pre-signed and short-lived, so it is fetched each time.
export async function portalUrl(workspaceId: string): Promise<{ url: string }> {
  const env = billingEnv();
  const db = adminClient();
  const { data } = await db.from("subscriptions").select("ls_subscription_id").eq("workspace_id", workspaceId).single();
  const id = (data?.ls_subscription_id as string | null) ?? null;
  if (!id) throw fail.validation("This workspace has no paid plan yet.", { reason: "no_subscription" });
  const res = await fetch(`${API_BASE}/subscriptions/${encodeURIComponent(id)}`, {
    headers: headers(env.LEMONSQUEEZY_API_KEY),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res || !res.ok) throw new ApiFailure(502, "provider_error", "The billing portal could not be opened. Try again in a moment.");
  const url = subscriptionResponse.parse(await res.json()).data.attributes.urls.customer_portal;
  if (!url) throw new ApiFailure(502, "provider_error", "The billing portal could not be opened. Try again in a moment.");
  return { url };
}

// BACKEND.md 11.3: verify, record once, apply, answer 200 quickly.
export async function handleWebhook(rawBody: string, signature: string | null): Promise<void> {
  const env = billingEnv();
  if (!verifySignature(rawBody, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    throw new ApiFailure(401, "unauthenticated", "Invalid signature.");
  }
  let json: unknown;
  let payload: WebhookPayload;
  try {
    json = JSON.parse(rawBody);
    payload = webhookPayload.parse(json);
  } catch {
    throw fail.validation("Unreadable webhook body.");
  }

  const db = adminClient();
  const eventId = bodyHash(rawBody);
  const inserted = await db
    .from("webhook_events")
    .insert({ provider: "lemonsqueezy", event_id: eventId, event_name: payload.meta.event_name, payload: json as object });
  if (inserted.error) {
    if (inserted.error.code !== "23505") throw inserted.error;
    const { data } = await db.from("webhook_events").select("processed_at").eq("provider", "lemonsqueezy").eq("event_id", eventId).single();
    // Already applied: a duplicate delivery changes nothing (PAY-09).
    if (data?.processed_at) return;
  }

  try {
    await applyEvent(payload, env.LEMONSQUEEZY_TEST_MODE === "true", parseVariants(env.LEMONSQUEEZY_VARIANTS));
    ok(await db.from("webhook_events").update({ processed_at: new Date().toISOString(), error: null }).eq("provider", "lemonsqueezy").eq("event_id", eventId));
  } catch (e) {
    await db.from("webhook_events").update({ error: String(e).slice(0, 500) }).eq("provider", "lemonsqueezy").eq("event_id", eventId);
    throw e;
  }
}

async function applyEvent(payload: WebhookPayload, testModeAllowed: boolean, variants: ReturnType<typeof parseVariants>) {
  const db = adminClient();
  const name = payload.meta.event_name;
  const attributes = payload.data.attributes as { test_mode?: boolean };
  // A production server never lets a test purchase grant a paid plan.
  if (attributes.test_mode && !testModeAllowed) return;
  // Payment events carry invoices; the subscription_updated that follows carries the state.
  if (payload.data.type !== "subscriptions") {
    if (name.endsWith("refunded")) {
      await db.from("audit_log").insert({ action: `billing.${name}`, entity: payload.data.type, entity_id: payload.data.id, meta: {} });
    }
    return;
  }

  const custom = z.uuid().safeParse(payload.meta.custom_data?.workspace_id);
  let workspaceId = custom.success ? custom.data : null;
  if (!workspaceId) {
    const { data } = await db.from("subscriptions").select("workspace_id").eq("ls_subscription_id", payload.data.id).maybeSingle();
    workspaceId = (data?.workspace_id as string | undefined) ?? null;
  }
  if (!workspaceId) {
    console.warn("[lemonsqueezy] subscription event without a workspace", name, payload.data.id);
    return;
  }

  const patch = subscriptionPatch(payload.data.id, payload.data.attributes, variants);
  if (!patch) {
    console.warn("[lemonsqueezy] unknown variant", name, payload.data.id);
    return;
  }
  const current = must(await db.from("subscriptions").select("ls_updated_at").eq("workspace_id", workspaceId).single()) as {
    ls_updated_at: string | null;
  };
  if (isStale(current.ls_updated_at, patch.ls_updated_at)) return;

  ok(await db.from("subscriptions").update({ ...patch, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId));
  await db.from("audit_log").insert({
    workspace_id: workspaceId,
    action: `billing.${name}`,
    entity: "subscription",
    entity_id: payload.data.id,
    meta: { status: patch.status, plan: patch.plan_key, interval: patch.interval },
  });
}

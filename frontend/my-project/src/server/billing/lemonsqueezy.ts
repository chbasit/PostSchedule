import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getPlan, type BillingInterval, type PlanKey } from "@/lib/billing/plans";

// Lemon Squeezy rules, from docs.lemonsqueezy.com (checked 2026-10-23):
// - webhooks are signed with HMAC-SHA256 of the raw body, hex digest, in X-Signature;
// - the event name is meta.event_name, our checkout custom data comes back in meta.custom_data;
// - there is no delivery id, so duplicates are found by hashing the raw body;
// - subscription status is on_trial | active | paused | past_due | unpaid | cancelled | expired.
// Pure functions only, so they can be unit tested without a server.

export const API_BASE = "https://api.lemonsqueezy.com/v1";

export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function bodyHash(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

// {"solo:month":"123", ...} from the environment, both ways round. Unknown plans are refused.
export type VariantMap = { byPlan: Map<string, string>; byVariant: Map<string, { plan: PlanKey; interval: BillingInterval }> };

const variantJson = z.record(z.string().regex(/^(solo|pro|agency|scale):(month|year)$/), z.union([z.string().regex(/^\d+$/), z.number().int()]));

export function parseVariants(json: string): VariantMap {
  const entries = Object.entries(variantJson.parse(JSON.parse(json)));
  const byPlan = new Map<string, string>();
  const byVariant = new Map<string, { plan: PlanKey; interval: BillingInterval }>();
  for (const [key, id] of entries) {
    const [plan, interval] = key.split(":") as [PlanKey, BillingInterval];
    byPlan.set(key, String(id));
    byVariant.set(String(id), { plan, interval });
  }
  return { byPlan, byVariant };
}

const subscriptionAttributes = z.object({
  store_id: z.union([z.number(), z.string()]).transform(String),
  customer_id: z.union([z.number(), z.string()]).transform(String),
  variant_id: z.union([z.number(), z.string()]).transform(String),
  status: z.enum(["on_trial", "active", "paused", "past_due", "unpaid", "cancelled", "expired"]),
  cancelled: z.boolean().optional(),
  trial_ends_at: z.string().nullable().optional(),
  renews_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  pause: z.object({ mode: z.string(), resumes_at: z.string().nullable() }).nullable().optional(),
  updated_at: z.string(),
  test_mode: z.boolean().optional(),
});

export const webhookPayload = z.object({
  meta: z.object({
    event_name: z.string(),
    test_mode: z.boolean().optional(),
    custom_data: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
  data: z.object({
    type: z.string(),
    id: z.union([z.string(), z.number()]).transform(String),
    attributes: z.record(z.string(), z.unknown()),
  }),
});

export type WebhookPayload = z.infer<typeof webhookPayload>;

export type SubscriptionPatch = {
  plan_key: PlanKey;
  interval: BillingInterval | null;
  status: "trialing" | "active" | "past_due" | "paused" | "cancelled" | "expired";
  account_limit: number;
  member_limit: number;
  ls_customer_id: string;
  ls_subscription_id: string;
  ls_variant_id: string;
  ls_updated_at: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  paused_until: string | null;
};

// What a subscription event means for our subscriptions row. Null when the variant is not
// one of ours (never trust a plan we did not sell, TEST.md PAY-07).
export function subscriptionPatch(subscriptionId: string, rawAttributes: unknown, variants: VariantMap): SubscriptionPatch | null {
  const a = subscriptionAttributes.parse(rawAttributes);
  const sold = variants.byVariant.get(a.variant_id);
  if (!sold) return null;
  const base = {
    ls_customer_id: a.customer_id,
    ls_subscription_id: subscriptionId,
    ls_variant_id: a.variant_id,
    ls_updated_at: a.updated_at,
    trial_ends_at: a.trial_ends_at ?? null,
    paused_until: a.pause?.resumes_at ?? null,
  };
  // Expired: back to Free, keeping every post and account (BACKEND.md 11.3).
  if (a.status === "expired") {
    const free = getPlan("free");
    return {
      ...base,
      plan_key: "free",
      interval: null,
      status: "active",
      account_limit: free.accounts,
      member_limit: free.seats,
      current_period_end: null,
      cancel_at: null,
    };
  }
  const plan = getPlan(sold.plan);
  const status: SubscriptionPatch["status"] =
    a.status === "on_trial" ? "trialing" : a.status === "unpaid" ? "past_due" : a.status === "cancelled" ? "cancelled" : a.status;
  return {
    ...base,
    plan_key: sold.plan,
    interval: sold.interval,
    status,
    account_limit: plan.accounts,
    member_limit: plan.seats,
    current_period_end: a.renews_at ?? a.ends_at ?? null,
    // Cancelled keeps access until the end of the paid period (PAY-13).
    cancel_at: a.status === "cancelled" ? (a.ends_at ?? a.renews_at ?? null) : null,
  };
}

// Events can arrive out of order; an older update never overwrites a newer one (PAY-10).
export function isStale(stored: string | null | undefined, incoming: string): boolean {
  return !!stored && Date.parse(stored) > Date.parse(incoming);
}

export function checkoutRequest(input: {
  storeId: string;
  variantId: string;
  email: string;
  workspaceId: string;
  userId: string;
  redirectUrl: string;
  testMode: boolean;
  expiresAt: string;
}) {
  return {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: input.email,
          // Set by the server, never by the browser: the webhook trusts only this (PAY-25).
          custom: { workspace_id: input.workspaceId, user_id: input.userId },
        },
        product_options: { redirect_url: input.redirectUrl },
        test_mode: input.testMode,
        expires_at: input.expiresAt,
      },
      relationships: {
        store: { data: { type: "stores", id: input.storeId } },
        variant: { data: { type: "variants", id: input.variantId } },
      },
    },
  };
}

export const checkoutResponse = z.object({
  data: z.object({ id: z.union([z.string(), z.number()]).transform(String), attributes: z.object({ url: z.url() }) }),
});

export const subscriptionResponse = z.object({
  data: z.object({ attributes: z.object({ urls: z.object({ customer_portal: z.url().nullable().optional() }) }) }),
});

import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bodyHash, checkoutRequest, isStale, parseVariants, subscriptionPatch, verifySignature, webhookPayload } from "./lemonsqueezy";

const SECRET = "test-signing-secret";
const sign = (body: string, secret = SECRET) => createHmac("sha256", secret).update(body, "utf8").digest("hex");

const variants = parseVariants(JSON.stringify({ "pro:month": "111", "pro:year": 112, "solo:month": "101" }));

function attrs(overrides: Record<string, unknown> = {}) {
  return {
    store_id: 1,
    customer_id: 55,
    variant_id: 111,
    status: "active",
    cancelled: false,
    trial_ends_at: null,
    renews_at: "2026-11-23T10:00:00.000000Z",
    ends_at: null,
    pause: null,
    updated_at: "2026-10-23T10:00:00.000000Z",
    ...overrides,
  };
}

describe("verifySignature", () => {
  const body = JSON.stringify({ meta: { event_name: "subscription_created" } });

  it("accepts the HMAC-SHA256 hex digest of the raw body", () => {
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a missing, malformed or wrong signature (PAY-05)", () => {
    expect(verifySignature(body, null, SECRET)).toBe(false);
    expect(verifySignature(body, "not-hex!", SECRET)).toBe(false);
    expect(verifySignature(body, sign(body, "other-secret"), SECRET)).toBe(false);
    expect(verifySignature(body, sign(body).slice(0, 10), SECRET)).toBe(false);
  });

  it("rejects a body changed after signing", () => {
    expect(verifySignature(body.replace("created", "cancelled"), sign(body), SECRET)).toBe(false);
  });
});

describe("bodyHash", () => {
  it("is stable for the same body and differs for another", () => {
    expect(bodyHash("a")).toBe(bodyHash("a"));
    expect(bodyHash("a")).not.toBe(bodyHash("b"));
  });
});

describe("parseVariants", () => {
  it("maps both ways and accepts numeric ids", () => {
    expect(variants.byPlan.get("pro:year")).toBe("112");
    expect(variants.byVariant.get("111")).toEqual({ plan: "pro", interval: "month" });
  });

  it("refuses plans we do not sell", () => {
    expect(() => parseVariants(JSON.stringify({ "free:month": "1" }))).toThrow();
    expect(() => parseVariants(JSON.stringify({ "pro:week": "1" }))).toThrow();
  });
});

describe("subscriptionPatch", () => {
  it("applies the plan's limits for an active subscription", () => {
    const patch = subscriptionPatch("9001", attrs(), variants);
    expect(patch).toMatchObject({
      plan_key: "pro",
      interval: "month",
      status: "active",
      account_limit: 25,
      member_limit: 3,
      ls_subscription_id: "9001",
      ls_customer_id: "55",
      current_period_end: "2026-11-23T10:00:00.000000Z",
      cancel_at: null,
    });
  });

  it("maps Lemon Squeezy statuses to ours", () => {
    expect(subscriptionPatch("1", attrs({ status: "on_trial", trial_ends_at: "2026-11-06T00:00:00Z" }), variants)).toMatchObject({
      status: "trialing",
      trial_ends_at: "2026-11-06T00:00:00Z",
    });
    expect(subscriptionPatch("1", attrs({ status: "unpaid" }), variants)?.status).toBe("past_due");
    expect(subscriptionPatch("1", attrs({ status: "past_due" }), variants)?.status).toBe("past_due");
    expect(subscriptionPatch("1", attrs({ status: "paused", pause: { mode: "void", resumes_at: "2026-12-01T00:00:00Z" } }), variants)).toMatchObject({
      status: "paused",
      paused_until: "2026-12-01T00:00:00Z",
    });
  });

  it("keeps the plan until the period ends when cancelled (PAY-13)", () => {
    const patch = subscriptionPatch("1", attrs({ status: "cancelled", cancelled: true, renews_at: null, ends_at: "2026-11-23T10:00:00Z" }), variants);
    expect(patch).toMatchObject({ plan_key: "pro", status: "cancelled", cancel_at: "2026-11-23T10:00:00Z" });
  });

  it("drops to Free with Free limits when expired", () => {
    const patch = subscriptionPatch("1", attrs({ status: "expired", ends_at: "2026-10-23T00:00:00Z" }), variants);
    expect(patch).toMatchObject({ plan_key: "free", interval: null, status: "active", account_limit: 3, member_limit: 1, cancel_at: null });
  });

  it("ignores variants we did not sell (PAY-07)", () => {
    expect(subscriptionPatch("1", attrs({ variant_id: 999 }), variants)).toBeNull();
  });

  it("rejects an unknown status instead of guessing", () => {
    expect(() => subscriptionPatch("1", attrs({ status: "refunded" }), variants)).toThrow();
  });
});

describe("isStale (PAY-10)", () => {
  it("skips an update older than the stored one", () => {
    expect(isStale("2026-10-23T10:00:00Z", "2026-10-23T09:59:59Z")).toBe(true);
  });

  it("applies newer, equal or first updates", () => {
    expect(isStale("2026-10-23T10:00:00Z", "2026-10-23T10:00:01Z")).toBe(false);
    expect(isStale("2026-10-23T10:00:00Z", "2026-10-23T10:00:00Z")).toBe(false);
    expect(isStale(null, "2026-10-23T10:00:00Z")).toBe(false);
  });
});

describe("checkoutRequest", () => {
  it("puts the workspace in custom data and links the store and variant", () => {
    const body = checkoutRequest({
      storeId: "42",
      variantId: "111",
      email: "owner@example.com",
      workspaceId: "ws-1",
      userId: "user-1",
      redirectUrl: "https://example.com/en/dashboard/settings/billing?checkout=return&plan=pro",
      testMode: true,
      expiresAt: "2026-10-24T10:00:00Z",
    });
    expect(body.data.attributes.checkout_data.custom).toEqual({ workspace_id: "ws-1", user_id: "user-1" });
    expect(body.data.relationships.store.data).toEqual({ type: "stores", id: "42" });
    expect(body.data.relationships.variant.data).toEqual({ type: "variants", id: "111" });
    expect(body.data.attributes.test_mode).toBe(true);
  });
});

describe("webhookPayload", () => {
  it("reads the event name, custom data and subscription id", () => {
    const parsed = webhookPayload.parse({
      meta: { event_name: "subscription_updated", test_mode: true, custom_data: { workspace_id: "ws-1" } },
      data: { type: "subscriptions", id: 9001, attributes: attrs() },
    });
    expect(parsed.meta.custom_data?.workspace_id).toBe("ws-1");
    expect(parsed.data.id).toBe("9001");
  });
});

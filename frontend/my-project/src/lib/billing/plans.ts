// Single source of truth for plans (CLAUDE.md rule 12). Feeds the pricing page,
// the billing screen, entitlement hints and JSON-LD. Prices are a hypothesis to
// validate with ~20 buyers before launch.

export type PlanKey = "free" | "solo" | "pro" | "agency" | "scale";
export type BillingInterval = "month" | "year";

// Feature flags are message keys under "plans.features", listed in the order plan cards and
// the comparison table show them.
export const FEATURES = [
  "preflight",
  "previews",
  "fixes",
  "captions",
  "calendar",
  "timing",
  "tags",
  "reports",
  "approvals",
  "clientLinks",
  "api",
  "languages",
] as const;
export type Feature = (typeof FEATURES)[number];

export type Plan = {
  key: PlanKey;
  priceMonthly: number; // USD
  accounts: number;
  seats: number;
  highlighted?: boolean;
  features: Feature[];
};

// What every plan has: the checks and previews, one-click fixes, a caption per platform, the
// calendar, posting now, by queue or at any time zone, tags, and every app language.
export const EVERY_PLAN: readonly Feature[] = ["preflight", "previews", "fixes", "captions", "calendar", "timing", "tags", "languages"];

export const PLANS: readonly Plan[] = [
  { key: "free", priceMonthly: 0, accounts: 3, seats: 1, features: [...EVERY_PLAN] },
  { key: "solo", priceMonthly: 12, accounts: 10, seats: 1, features: [...EVERY_PLAN, "reports"] },
  { key: "pro", priceMonthly: 24, accounts: 25, seats: 3, highlighted: true, features: [...EVERY_PLAN, "reports", "approvals"] },
  { key: "agency", priceMonthly: 59, accounts: 75, seats: 10, features: [...EVERY_PLAN, "reports", "approvals", "clientLinks"] },
  { key: "scale", priceMonthly: 119, accounts: 200, seats: 25, features: [...EVERY_PLAN, "reports", "approvals", "clientLinks", "api"] },
];

// A plan's features in display order.
export function planFeatures(plan: Plan): Feature[] {
  return FEATURES.filter((f) => plan.features.includes(f));
}

export const TRIAL_DAYS = 14;
export const FOUNDING_CUSTOMERS = 100;
export const FOUNDING_LOCK_MONTHS = 24;

// Yearly billing = two months free.
export function yearlyPrice(plan: Plan): number {
  return plan.priceMonthly * 10;
}

export function priceFor(plan: Plan, interval: BillingInterval): number {
  return interval === "year" ? yearlyPrice(plan) : plan.priceMonthly;
}

export function getPlan(key: PlanKey): Plan {
  const plan = PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`unknown_plan:${key}`);
  return plan;
}

export function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

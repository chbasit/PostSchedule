// Single source of truth for plans (CLAUDE.md rule 12). Feeds the pricing page,
// the billing screen, entitlement hints and JSON-LD. Prices are a hypothesis to
// validate with ~20 buyers before launch.

export type PlanKey = "free" | "solo" | "pro" | "agency" | "scale";
export type BillingInterval = "month" | "year";

export type Plan = {
  key: PlanKey;
  priceMonthly: number; // USD
  accounts: number;
  seats: number;
  highlighted?: boolean;
  // Feature flags are message keys under "plans.features".
  features: Array<"preflight" | "previews" | "calendar" | "approvals" | "clientLinks" | "api" | "reports">;
};

export const PLANS: readonly Plan[] = [
  { key: "free", priceMonthly: 0, accounts: 3, seats: 1, features: ["preflight", "previews", "calendar"] },
  { key: "solo", priceMonthly: 12, accounts: 10, seats: 1, features: ["preflight", "previews", "calendar", "reports"] },
  {
    key: "pro",
    priceMonthly: 24,
    accounts: 25,
    seats: 3,
    highlighted: true,
    features: ["preflight", "previews", "calendar", "reports", "approvals"],
  },
  {
    key: "agency",
    priceMonthly: 59,
    accounts: 75,
    seats: 10,
    features: ["preflight", "previews", "calendar", "reports", "approvals", "clientLinks"],
  },
  {
    key: "scale",
    priceMonthly: 119,
    accounts: 200,
    seats: 25,
    features: ["preflight", "previews", "calendar", "reports", "approvals", "clientLinks", "api"],
  },
];

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

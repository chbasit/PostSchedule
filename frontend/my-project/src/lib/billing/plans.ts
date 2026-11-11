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
  // USD for a year paid at once. Must equal the Lemon Squeezy variants' prices.
  priceYearly: number;
  accounts: number;
  seats: number;
  // AI credits granted each calendar month (UTC); unused credits do not roll over.
  aiCredits: number;
  highlighted?: boolean;
  features: Feature[];
};

// What every plan has: the checks and previews, one-click fixes, a caption per platform, the
// calendar, posting now, by queue or at any time zone, tags, and every app language.
export const EVERY_PLAN: readonly Feature[] = ["preflight", "previews", "fixes", "captions", "calendar", "timing", "tags", "languages"];

export const PLANS: readonly Plan[] = [
  { key: "free", priceMonthly: 0, priceYearly: 0, accounts: 3, seats: 1, aiCredits: 25, features: [...EVERY_PLAN] },
  { key: "solo", priceMonthly: 15, priceYearly: 150, accounts: 10, seats: 1, aiCredits: 300, features: [...EVERY_PLAN, "reports"] },
  {
    key: "pro",
    priceMonthly: 25,
    priceYearly: 270,
    accounts: 25,
    seats: 3,
    aiCredits: 800,
    highlighted: true,
    features: [...EVERY_PLAN, "reports", "approvals"],
  },
  { key: "agency", priceMonthly: 60, priceYearly: 680, accounts: 75, seats: 10, aiCredits: 2000, features: [...EVERY_PLAN, "reports", "approvals", "clientLinks"] },
  {
    key: "scale",
    priceMonthly: 130,
    priceYearly: 1480,
    accounts: 200,
    seats: 25,
    aiCredits: 4000,
    features: [...EVERY_PLAN, "reports", "approvals", "clientLinks", "api"],
  },
];

// What each AI action costs in credits. One credit is about US$0.0125 of model cost at
// OpenAI's and Google's list prices (2026-10), so a plan's worst-case AI spend stays well
// under its price: Pro's 800 credits are about $10 at most. Change costs here only; the
// server charges from this table and the UI shows the same numbers.
export const AI_COSTS = {
  caption: 1,
  image: { standard: 5, hd: 20 },
} as const;

export type AiImageQuality = keyof typeof AI_COSTS.image;

export function imageCost(quality: AiImageQuality, count: number): number {
  return AI_COSTS.image[quality] * count;
}

// A plan's features in display order.
export function planFeatures(plan: Plan): Feature[] {
  return FEATURES.filter((f) => plan.features.includes(f));
}

export const TRIAL_DAYS = 14;
export const FOUNDING_CUSTOMERS = 100;
export const FOUNDING_LOCK_MONTHS = 24;

export function yearlyPrice(plan: Plan): number {
  return plan.priceYearly;
}

// What a year paid at once saves against twelve monthly payments, in whole percent. It
// differs by plan (DECISIONS.md 2026-11-11).
export function yearlySaving(plan: Plan): number {
  return plan.priceMonthly ? Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100) : 0;
}

// The best saving on any plan, for the yearly toggle ("Save up to …").
export const MAX_YEARLY_SAVING = Math.max(...PLANS.map(yearlySaving));

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

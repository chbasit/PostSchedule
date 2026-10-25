import "server-only";
import { z } from "zod";
import { fail } from "./errors";

// Server configuration, checked on first use so a missing value fails with a clear message
// (BACKEND.md section 3). Only NEXT_PUBLIC_* values ever reach the browser.

const core = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Supabase's publishable key (sb_publishable_…), or the legacy anon key.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  // Supabase's secret key (sb_secret_…), or the legacy service_role key. Server only.
  SUPABASE_SECRET_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

const billing = z.object({
  LEMONSQUEEZY_API_KEY: z.string().min(10),
  LEMONSQUEEZY_STORE_ID: z.string().regex(/^\d+$/),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(6),
  // {"solo:month":"123","solo:year":"124",...}: one Lemon Squeezy variant per plan and interval.
  LEMONSQUEEZY_VARIANTS: z.string().min(2),
  LEMONSQUEEZY_TEST_MODE: z.enum(["true", "false"]).default("true"),
});

let coreEnv: z.infer<typeof core> | null = null;

export function serverEnv() {
  if (coreEnv) return coreEnv;
  const parsed = core.safeParse({
    ...process.env,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    console.error("[env] missing or invalid:", parsed.error.issues.map((i) => i.path.join(".")).join(", "));
    throw fail.notConfigured("The database");
  }
  coreEnv = parsed.data;
  return coreEnv;
}

export function billingEnv() {
  const parsed = billing.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] billing missing or invalid:", parsed.error.issues.map((i) => i.path.join(".")).join(", "));
    throw fail.notConfigured("Billing");
  }
  return parsed.data;
}

export function siteUrl() {
  return serverEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

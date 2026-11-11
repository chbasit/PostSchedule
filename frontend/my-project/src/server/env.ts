import "server-only";
import { z } from "zod";
import { AI_ENABLED } from "@/config/site";
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

// Google sign-in's OAuth client: the same one Supabase's Google provider lists, so Supabase
// accepts its ID tokens (DECISIONS.md 2026-11-11).
const google = z.object({
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
});

// AI services (BACKEND.md §16). Each kind of work picks its provider; only that provider's
// key is required. Models can be changed without a deploy of new code.
const ai = z.object({
  AI_TEXT_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  AI_IMAGE_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  OPENAI_API_KEY: z.string().min(20).optional(),
  GEMINI_API_KEY: z.string().min(20).optional(),
  // Defaults per provider live in src/server/ai/providers.
  AI_TEXT_MODEL: z.string().min(1).optional(),
  AI_IMAGE_MODEL: z.string().min(1).optional(),
  // Private Supabase Storage bucket for generated images; created on first use.
  AI_STORAGE_BUCKET: z.string().regex(/^[a-z0-9-]{3,63}$/).default("ai-images"),
});

export type AiEnv = z.infer<typeof ai>;

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

// Null while Google sign-in is switched off or its client is not set; the caller sends the
// person back to the sign-in page instead of showing an error body.
export function googleEnv() {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH !== "true") return null;
  const parsed = google.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] Google sign-in missing or invalid:", parsed.error.issues.map((i) => i.path.join(".")).join(", "));
    return null;
  }
  return parsed.data;
}

// Every AI route starts here: while AI is switched off ("Coming soon"), nothing runs and
// nothing is charged, whatever keys are set.
export function requireAi() {
  if (!AI_ENABLED) throw fail.notConfigured("AI features");
}

export function aiEnv(kind: "text" | "image"): AiEnv {
  requireAi();
  // A key left blank in .env (KEY=) means "not set", not an invalid value.
  const parsed = ai.safeParse(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")));
  const feature = kind === "image" ? "AI images" : "The AI writer";
  if (!parsed.success) {
    console.error("[env] AI settings invalid:", parsed.error.issues.map((i) => i.path.join(".")).join(", "));
    throw fail.notConfigured(feature);
  }
  const provider = kind === "image" ? parsed.data.AI_IMAGE_PROVIDER : parsed.data.AI_TEXT_PROVIDER;
  if (!(provider === "openai" ? parsed.data.OPENAI_API_KEY : parsed.data.GEMINI_API_KEY)) throw fail.notConfigured(feature);
  return parsed.data;
}

export function siteUrl() {
  return serverEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

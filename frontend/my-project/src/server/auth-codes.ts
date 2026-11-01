import "server-only";
import type { AuthError } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { z } from "zod";
import { ApiFailure, fail } from "./errors";
import { adminClient } from "./supabase";

// Email codes for sign-up confirmation and password reset (DECISIONS.md 2026-10-28).
// Supabase Auth issues and checks each code: it works once, and a newer code replaces the
// older one (TEST.md AUTH-06). On top of Supabase's per-IP limit, an address gets 5 wrong
// codes, then a 15-minute lock that sending a new code lifts (TEST.md AUTH-04).

export type CodePurpose = "signup" | "recovery";

// People paste codes with spaces or dashes; Supabase sends 6 to 10 digits.
export const code = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{6,10}$/));

const addressKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export const invalidCode = () => fail.validation("That code is wrong or has expired.", { reason: "invalid_code" });

// Supabase answers a wrong, used or expired code with otp_expired.
export const isWrongCode = (error: AuthError) => error.code === "otp_expired" || error.status === 403;

export async function assertCanTryCode(purpose: CodePurpose, email: string) {
  const { data, error } = await adminClient().rpc("auth_code_locked", { p_purpose: purpose, p_email_hash: addressKey(email) });
  // Without the check there is no lock, so a failure here stops the attempt (fail closed).
  if (error) {
    console.error("[auth] code lock check failed", error.code);
    throw new ApiFailure(500, "internal", "Something went wrong on our side.");
  }
  if (data === true) throw new ApiFailure(429, "rate_limited", "Too many wrong codes. Send a new code, then try again.", { reason: "code_locked" }, 60);
}

export async function noteWrongCode(purpose: CodePurpose, email: string) {
  const { error } = await adminClient().rpc("auth_code_failed", { p_purpose: purpose, p_email_hash: addressKey(email) });
  if (error) console.error("[auth] recording a wrong code failed", error.code);
}

export async function resetCodeTries(purpose: CodePurpose, email: string) {
  const { error } = await adminClient().rpc("auth_code_reset", { p_purpose: purpose, p_email_hash: addressKey(email) });
  if (error) console.error("[auth] resetting code tries failed", error.code);
}

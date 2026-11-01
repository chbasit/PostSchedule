import "server-only";
import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiFailure, fail } from "./errors";

// Supabase Auth errors in the API's words. Wrong email and wrong password get the same
// answer, so sign-in never reveals which addresses have accounts.
export function authFailure(error: AuthError): ApiFailure {
  switch (error.code) {
    case "invalid_credentials":
      return new ApiFailure(401, "unauthenticated", "That email and password do not match.");
    case "email_not_confirmed":
      return new ApiFailure(403, "forbidden", "Confirm your email before signing in.", { reason: "email_not_confirmed" });
    case "weak_password":
      return fail.validation("Choose a stronger password.", { reason: "weak_password" });
    case "same_password":
      return fail.validation("Choose a password you have not used here before.", { reason: "same_password" });
    // Emailed codes: wrong, already used, replaced by a newer one, or expired.
    case "otp_expired":
    case "bad_jwt":
      return fail.validation("That code is wrong or has expired.", { reason: "invalid_code" });
    case "signup_disabled":
    case "email_provider_disabled":
      return fail.forbidden("Sign-ups are closed at the moment.");
    // Supabase's built-in email only reaches members of the Supabase organization; real
    // users need custom SMTP (Resend) set up in the dashboard.
    case "email_address_not_authorized":
      console.warn("[auth] email blocked by Supabase's default SMTP; set up custom SMTP");
      return new ApiFailure(503, "not_configured", "Email isn't set up for this address yet.", { feature: "Email", reason: "email_not_allowed" });
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return fail.rateLimited(60);
    default:
      if (error.status === 429) return fail.rateLimited(60);
      if (error.status === 403 || error.status === 401) return fail.validation("That code is wrong or has expired.", { reason: "invalid_code" });
      console.error("[auth]", error.code, error.status, error.message);
      return new ApiFailure(500, "internal", "Something went wrong on our side.");
  }
}

// The signup form's rules, checked again on the server (frontend schema.ts).
export const PASSWORD_MIN = 10;
export const password = z
  .string()
  .min(PASSWORD_MIN)
  .max(200)
  .regex(/\p{L}/u)
  .regex(/\d/);

export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

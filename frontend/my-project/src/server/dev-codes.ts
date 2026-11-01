import "server-only";
import type { AuthError } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { DevDelivery } from "@/lib/api/types";
import { authFailure } from "./auth";
import { adminClient } from "./supabase";

// Development mode only (DEV_MODE in src/config/site.ts). Supabase makes the same code it would
// email, but sends nothing; the code is printed in the terminal and handed back so the page can
// show it. Everything else is the real flow: the same users, database, code checks and limits.
// A production build never calls these (DEV_MODE is false there).

type Dev = NonNullable<DevDelivery["dev"]>;

function show(label: string, email: string, code: string): Dev {
  console.info(`\n[dev mode] ${label} code for ${email}: ${code}\n`);
  return { code };
}

function failure(error: AuthError): never {
  throw authFailure(error);
}

// Creates the account (unconfirmed) and its sign-up code. An address that is already confirmed
// gets no code, as in production, where Supabase sends nothing to it either.
export async function devSignUp(input: { email: string; password: string; data: Record<string, string> }): Promise<Dev> {
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: { data: input.data },
  });
  if (error) return error.code === "email_exists" ? { note: "account_exists" } : failure(error);
  return show("Sign-up", input.email, data.properties.email_otp);
}

// A new sign-up code that replaces the older one, as production's resend does. Only for an
// account that exists and is not confirmed yet (found through its profile, which every account
// has): Supabase then keeps the account's password and ignores the one passed here.
export async function devResendCode(email: string): Promise<Dev> {
  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle<{ id: string }>();
  if (!profile) return { note: "no_account" };
  const { data: account } = await admin.auth.admin.getUserById(profile.id);
  if (account.user?.email_confirmed_at) return { note: "already_confirmed" };
  const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email, password: `${randomBytes(24).toString("base64url")}9a` });
  if (error) return failure(error);
  return show("Sign-up", email, data.properties.email_otp);
}

// A password-reset code; a newer one replaces the older, as in production.
export async function devRecoveryCode(email: string): Promise<Dev> {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: "recovery", email });
  if (error) return error.code === "user_not_found" ? { note: "no_account" } : failure(error);
  return show("Password reset", email, data.properties.email_otp);
}

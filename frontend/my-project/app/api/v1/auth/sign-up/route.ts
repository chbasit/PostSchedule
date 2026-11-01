import { z } from "zod";
import { routing } from "@/i18n/routing";
import { DEV_MODE } from "@/config/site";
import type { DevDelivery, Session } from "@/lib/api/types";
import { authFailure, email, password } from "@/server/auth";
import { resetCodeTries } from "@/server/auth-codes";
import { devSignUp } from "@/server/dev-codes";
import { siteUrl } from "@/server/env";
import { readBody, route } from "@/server/route";
import { loadSession, markSignedIn } from "@/server/session";
import { userClient } from "@/server/supabase";

const body = z.object({
  displayName: z.string().trim().min(1).max(80),
  email,
  password,
  locale: z.enum(routing.locales).optional(),
  timezone: z.string().max(64).optional(),
});

function validZone(zone: string | undefined) {
  if (!zone) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

// With email confirmation on (production), there is no session until the emailed code is
// entered, and an address that already has an account gets the same answer (no enumeration).
export const POST = route(async (req) => {
  const input = await readBody(req, body);
  const locale = input.locale ?? "en";
  const timezone = validZone(input.timezone);
  // Until the code is entered there is only the address; the same shape whether or not it is new.
  const pending = (userId: string | undefined): Session => ({
    user: {
      id: userId ?? "",
      email: input.email,
      displayName: input.displayName,
      emailVerified: false,
      locale,
      timezone,
      use24h: false,
      persona: null,
      onboardedAt: null,
    },
    workspaces: [],
  });

  if (DEV_MODE) {
    const dev = await devSignUp({ email: input.email, password: input.password, data: { display_name: input.displayName, locale, timezone } });
    await resetCodeTries("signup", input.email);
    return { ...pending(undefined), dev } satisfies Session & DevDelivery;
  }

  const db = await userClient();
  const { data, error } = await db.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { display_name: input.displayName, locale, timezone },
      // Only used if the email template still carries Supabase's default link instead of the
      // code: the callback signs the person in (same browser only).
      emailRedirectTo: `${siteUrl()}/api/v1/auth/callback`,
    },
  });
  if (error) throw authFailure(error);
  if (data.session && data.user) {
    await markSignedIn();
    return loadSession(db, data.user);
  }
  return pending(data.user?.id);
});

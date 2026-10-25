import { z } from "zod";
import { routing } from "@/i18n/routing";
import type { Session } from "@/lib/api/types";
import { authFailure, email, password } from "@/server/auth";
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

// With email confirmation on (production), there is no session until the link is opened,
// and an address that already has an account gets the same answer (no enumeration).
export const POST = route(async (req) => {
  const input = await readBody(req, body);
  const locale = input.locale ?? "en";
  const timezone = validZone(input.timezone);
  const db = await userClient();
  const { data, error } = await db.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { display_name: input.displayName, locale, timezone },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });
  if (error) throw authFailure(error);
  if (data.session && data.user) {
    await markSignedIn();
    return loadSession(db, data.user);
  }
  const pending: Session = {
    user: {
      id: data.user?.id ?? "",
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
  };
  return pending;
});

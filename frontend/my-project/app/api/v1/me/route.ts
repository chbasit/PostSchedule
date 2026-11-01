import { z } from "zod";
import { routing } from "@/i18n/routing";
import { requireUser } from "@/server/guards";
import { toUser, type ProfileRow } from "@/server/mappers";
import { must, readBody, route } from "@/server/route";

const zone = z
  .string()
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone");

const body = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    locale: z.enum(routing.locales),
    timezone: zone,
    use24h: z.boolean(),
    persona: z.enum(["creator", "startup", "agency", "other"]).nullable(),
    onboardedAt: z.iso.datetime().nullable(),
  })
  .partial();

export const PATCH = route(async (req) => {
  const { db, user } = await requireUser();
  const patch = await readBody(req, body);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.locale !== undefined) row.locale = patch.locale;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;
  if (patch.use24h !== undefined) row.use_24h = patch.use24h;
  if (patch.persona !== undefined) row.persona = patch.persona;
  if (patch.onboardedAt !== undefined) row.onboarded_at = patch.onboardedAt;
  const profile = must(
    await db
      .from("profiles")
      .update(row)
      .eq("id", user.id)
      .select("id, email, display_name, persona, timezone, locale, use_24h, onboarded_at")
      .single<ProfileRow>(),
  );
  return toUser(profile, user);
});

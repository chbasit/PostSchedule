import { defineRouting } from "next-intl/routing";

// English only (DECISIONS.md 2026-11-11). URLs keep the /en prefix, because links such as
// /en/privacy are registered with Meta, Google and Supabase.
export const locales = ["en"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

// Right-to-left support stays in place for when a language like Arabic comes back.
const rtlLocales: ReadonlySet<string> = new Set(["ar"]);

export function isRtl(locale: string): boolean {
  return rtlLocales.has(locale);
}

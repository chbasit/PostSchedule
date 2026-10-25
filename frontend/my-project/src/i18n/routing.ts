import { defineRouting } from "next-intl/routing";

// Wave 1 (FRONTEND.md §12) plus Arabic so right-to-left is exercised from day one.
export const locales = ["en", "es", "pt-BR", "fr", "de", "ar"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

// Each language is shown in its own name.
export const localeNames: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  fr: "Français",
  de: "Deutsch",
  ar: "العربية",
};

const rtlLocales: ReadonlySet<string> = new Set(["ar"]);

export function isRtl(locale: string): boolean {
  return rtlLocales.has(locale);
}

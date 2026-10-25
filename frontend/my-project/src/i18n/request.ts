import { hasLocale, type AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import en from "../../messages/en.json";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

// A missing key falls back to English instead of showing the raw key (TEST.md I18N-08).
function withFallback(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    out[key] =
      value && typeof value === "object" && baseValue && typeof baseValue === "object"
        ? withFallback(baseValue as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ locale: explicit }) => {
  const candidate = explicit ?? (await rootLocale());
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;

  const messages =
    locale === "en"
      ? en
      : withFallback(en, (await import(`../../messages/${locale}.json`)).default);

  return {
    locale,
    messages: messages as AbstractIntlMessages,
    // The server formats in UTC; screens that show times pass the user's zone explicitly.
    timeZone: "UTC",
  };
});

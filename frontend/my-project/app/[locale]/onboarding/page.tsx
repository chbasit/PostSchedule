import { hasLocale } from "next-intl";
import { locale as rootLocale } from "next/root-params";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function OnboardingIndex() {
  const locale = await rootLocale();
  redirect({ href: "/onboarding/start", locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
}

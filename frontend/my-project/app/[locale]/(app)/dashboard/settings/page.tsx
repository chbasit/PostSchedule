import { hasLocale } from "next-intl";
import { locale as rootLocale } from "next/root-params";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Settings open on your profile; the settings sidebar lists the rest.
export default async function SettingsIndex() {
  const locale = await rootLocale();
  redirect({ href: "/dashboard/settings/profile", locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
}

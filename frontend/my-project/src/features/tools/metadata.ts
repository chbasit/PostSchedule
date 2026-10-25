import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "@/i18n/routing";
import { getTool, toolHref, type ToolKey } from "./registry";

// Title, description, canonical and one alternate per language (SEO-AEO.md).
export async function pageMetadata(path: string, title: string, description: string): Promise<Metadata> {
  const locale = await rootLocale();
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
        "x-default": `/${routing.defaultLocale}${path}`,
      },
    },
  };
}

export async function toolMetadata(key: ToolKey): Promise<Metadata> {
  const t = await getTranslations("tools");
  return pageMetadata(toolHref(getTool(key)), t(`${key}.metaTitle`), t(`${key}.metaDescription`));
}

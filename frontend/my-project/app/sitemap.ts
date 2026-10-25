import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { TOOLS, toolHref } from "@/features/tools/registry";
import { routing } from "@/i18n/routing";

// Only indexable public pages, one entry per language with hreflang alternates.
const PUBLIC_PATHS = ["", "/pricing", "/tools", ...TOOLS.map(toolHref)];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: {
        languages: {
          ...Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
          "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
        },
      },
    })),
  );
}

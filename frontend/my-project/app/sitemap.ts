import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { routing } from "@/i18n/routing";

// Only indexable public pages, one entry per language with hreflang alternates.
const PUBLIC_PATHS = ["", "/pricing", "/tools/video-checker"];

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

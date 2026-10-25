import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { routing } from "@/i18n/routing";

// Marketing pages are open to all crawlers; the app and API are not (SEO-AEO.md workflow 2).
// robots.txt hides nothing sensitive: the app is protected by sign-in.
export default function robots(): MetadataRoute.Robots {
  const privatePaths = routing.locales.flatMap((l) => [`/${l}/dashboard`, `/${l}/onboarding`, `/${l}/auth`]);
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...privatePaths] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

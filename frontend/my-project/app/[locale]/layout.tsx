import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { DM_Sans, JetBrains_Mono, Noto_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { locale as rootLocale } from "next/root-params";
import { AppProviders } from "@/components/app-providers";
import { themeScript } from "@/components/theme";
import { PRODUCT_NAME, SITE_URL } from "@/config/site";
import { isRtl, routing } from "@/i18n/routing";
import "../globals.css";

// One face for the whole product, site and app, text and headings (DECISIONS.md 2026-11-03).
const sans = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-dm-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });
// The script font is only downloaded on pages that use it.
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", preload: false });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootLocale();
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title", { product: PRODUCT_NAME }), template: `%s · ${PRODUCT_NAME}` },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
        "x-default": `/${routing.defaultLocale}`,
      },
    },
    openGraph: { siteName: PRODUCT_NAME, type: "website", locale },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111315" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const dir = isRtl(locale) ? "rtl" : "ltr";
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${arabic.variable}`}
    >
      <head>
        {/* Sets the theme before the first paint. Through next/script so React does not warn
            about a script tag when the layout renders in the browser (2026-11-13). */}
        <Script id="theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* Browser extensions (ColorZilla's cz-shortcut-listen, for one) add attributes to <body>
          before React loads; they are not ours, so the mismatch is not reported. */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only z-[70] rounded bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <AppProviders dir={dir}>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

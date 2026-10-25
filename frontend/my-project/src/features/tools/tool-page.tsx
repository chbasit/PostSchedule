import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_NAME, SITE_URL } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getTool, relatedTools, toolHref, type ToolKey } from "./registry";
import { ToolCard, ToolGlyph } from "./tool-card";

const STEPS = ["1", "2", "3"] as const;

// The frame every free tool shares: answer-first header (SEO-AEO.md workflow 2), the tool
// itself, how it works, questions, related tools and one call to action. Public: no account.
export function ToolPage({ toolKey, values, children }: { toolKey: ToolKey; values?: Record<string, string | number>; children: ReactNode }) {
  const t = useTranslations("tools");
  const locale = useLocale();
  const tool = getTool(toolKey);
  const name = t(`${toolKey}.name`);
  const url = `${SITE_URL}/${locale}${toolHref(tool)}`;

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name,
            description: t(`${toolKey}.description`),
            url,
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            isAccessibleForFree: true,
            inLanguage: locale,
            offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
            publisher: { "@type": "Organization", name: PRODUCT_NAME, url: SITE_URL },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: t("common.breadcrumb"), item: `${SITE_URL}/${locale}/tools` },
              { "@type": "ListItem", position: 2, name, item: url },
            ],
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-6 md:pt-12 lg:px-8">
        <nav aria-label={t("common.breadcrumb")} className="mb-8 text-sm">
          <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <li>
              <Link href="/tools" className="rounded transition-colors hover:text-foreground">
                {t("common.breadcrumb")}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5 rtl:-scale-x-100" />
            </li>
            <li aria-current="page" className="font-medium text-foreground">
              {name}
            </li>
          </ol>
        </nav>

        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <ToolGlyph tool={tool} size="lg" />
          <div className="min-w-0 space-y-3">
            <p className="eyebrow">{t("common.eyebrow")}</p>
            <h1 className="display text-4xl md:text-5xl">{t(`${toolKey}.title`)}</h1>
            <p className="max-w-3xl text-lg text-muted-foreground">{t(`${toolKey}.intro`, values)}</p>
            <ToolBadges className="pt-1" />
          </div>
        </header>

        {children}

        <section aria-labelledby="tool-steps" className="mt-20">
          <h2 id="tool-steps" className="display text-3xl md:text-4xl">
            {t("common.stepsTitle")}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step} className="card-surface space-y-2 p-5">
                <span className="tabular inline-flex size-8 items-center justify-center rounded-full bg-ink font-mono text-sm text-lime">{step}</span>
                <h3 className="pt-2 font-semibold">{t(`${toolKey}.steps.${step}.title`, values)}</h3>
                <p className="text-sm text-muted-foreground">{t(`${toolKey}.steps.${step}.body`, values)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="tool-faq" className="mt-20 grid gap-8 lg:grid-cols-[1fr_2fr]">
          <h2 id="tool-faq" className="display text-3xl md:text-4xl">
            {t("common.faqTitle")}
          </h2>
          <div className="divide-y border-y">
            {STEPS.map((n) => (
              <details key={n} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-medium">
                  {t(`${toolKey}.faq.${n}.q`, values)}
                  <span aria-hidden className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground">{t(`${toolKey}.faq.${n}.a`, values)}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="tool-more" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="tool-more" className="display text-3xl md:text-4xl">
              {t("common.moreTitle")}
            </h2>
            <Link href="/tools" className="group inline-flex items-center gap-1.5 rounded text-sm font-semibold">
              {t("common.allTools")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools(toolKey).map((other) => (
              <li key={other.key}>
                <ToolCard tool={other} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ToolsCta />
    </>
  );
}

// Free, no sign-up, runs in the browser: true of every tool.
export function ToolBadges({ className }: { className?: string }) {
  const t = useTranslations("tools.common");
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {(["badgeFree", "badgeNoSignup", "badgePrivate"] as const).map((badge) => (
        <li key={badge} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm font-medium">
          <Check className="size-3.5 text-success" aria-hidden />
          {t(badge)}
        </li>
      ))}
    </ul>
  );
}

export function ToolsCta() {
  const t = useTranslations("tools.common");
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="display text-3xl md:text-4xl">{t("ctaTitle")}</h2>
          <p className="text-white/75">{t("ctaBody", { product: PRODUCT_NAME })}</p>
        </div>
        <Link href="/signup" className={buttonVariants({ variant: "accent", size: "lg" })}>
          {t("cta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

import {
  ArrowRight,
  CalendarDays,
  FileCheck,
  Gauge,
  Globe,
  Smartphone,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { JsonLd } from "@/components/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_NAME, SITE_URL } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { PLANS, TRIAL_DAYS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { PlanCard } from "@/features/billing/plan-card";
import { GoogleIcon } from "@/features/auth/google-icon";
import { ProductMock } from "@/features/marketing/product-mock";

const FEATURES: Array<{ key: "preflight" | "previews" | "original" | "calendar" | "approvals" | "languages"; icon: LucideIcon }> = [
  { key: "preflight", icon: Gauge },
  { key: "previews", icon: Smartphone },
  { key: "original", icon: FileCheck },
  { key: "calendar", icon: CalendarDays },
  { key: "approvals", icon: UserCheck },
  { key: "languages", icon: Globe },
];

const FAQ_KEYS = ["what", "quality", "platforms", "trial", "switch"] as const;

export default function HomePage() {
  const t = useTranslations("marketing.home");
  const locale = useLocale();

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#org`,
            name: PRODUCT_NAME,
            url: SITE_URL,
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": `${SITE_URL}/#app`,
            name: PRODUCT_NAME,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            publisher: { "@id": `${SITE_URL}/#org` },
            offers: PLANS.map((p) => ({
              "@type": "Offer",
              name: p.key,
              price: p.priceMonthly,
              priceCurrency: "USD",
              url: `${SITE_URL}/${locale}/pricing`,
            })),
          },
        ]}
      />

      {/* Hero */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pb-20 pt-14 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-20">
        <div className="space-y-7">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="display text-[clamp(2.75rem,6vw,4.5rem)]">
            <span className="block">{t("line1")}</span>
            <span className="block">{t("line2")}</span>
            <span className="block">
              {t.rich("line3", {
                mark: (chunks) => <mark className="bg-lime px-1 text-ink">{chunks}</mark>,
              })}
            </span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t("sub")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              {t("ctaPrimary")}
            </Link>
            <Link href="/signup?provider=google" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              <GoogleIcon /> {t("ctaGoogle")}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">{t("ctaNote", { days: TRIAL_DAYS })}</p>
        </div>
        <ProductMock />
      </section>

      {/* Proof band: a statement about the product, not invented customer logos. */}
      <section className="bg-coral text-ink">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <p className="max-w-2xl text-2xl font-light leading-snug md:text-3xl">{t("band")}</p>
          <Link href="/tools/video-checker" className={cn(buttonVariants({ size: "lg" }), "bg-ink text-white hover:bg-ink/90 dark:bg-ink dark:text-white")}>
            {t("bandCta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-20 md:px-6 lg:px-8">
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">{t("featuresEyebrow")}</p>
          <h2 className="display text-4xl md:text-5xl">{t("featuresTitle")}</h2>
          <p className="text-muted-foreground">{t("featuresSub")}</p>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className="space-y-3 bg-background p-6">
              <span className="inline-flex size-10 items-center justify-center rounded bg-muted">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold">{t(`features.${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`features.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/50">
        <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 lg:px-8">
          <p className="eyebrow">{t("stepsEyebrow")}</p>
          <h2 className="display mt-3 max-w-2xl text-4xl md:text-5xl">{t("stepsTitle")}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {(["connect", "check", "schedule"] as const).map((step, i) => (
              <li key={step} className="space-y-3">
                <span className="tabular inline-flex size-9 items-center justify-center rounded-full bg-ink font-mono text-sm text-lime">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{t(`steps.${step}.title`)}</h3>
                <p className="text-muted-foreground">{t(`steps.${step}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            <p className="eyebrow">{t("pricingEyebrow")}</p>
            <h2 className="display text-4xl md:text-5xl">{t("pricingTitle")}</h2>
          </div>
          <Link href="/pricing" className={buttonVariants({ variant: "secondary" })}>
            {t("pricingCta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              interval="month"
              compact
              action={
                <Link href="/signup" className={cn(buttonVariants({ variant: plan.highlighted ? "primary" : "secondary" }), "w-full")}>
                  {t("ctaPrimary")}
                </Link>
              }
            />
          ))}
        </div>
      </section>

      {/* FAQ: visible questions with direct answers (SEO-AEO.md workflow 2) */}
      <section className="border-t">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 md:px-6 lg:grid-cols-[1fr_2fr] lg:px-8">
          <div className="space-y-3">
            <p className="eyebrow">{t("faqEyebrow")}</p>
            <h2 className="display text-4xl">{t("faqTitle")}</h2>
          </div>
          <div className="divide-y border-y">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-medium">
                  {t(`faq.${key}.q`, { product: PRODUCT_NAME })}
                  <span aria-hidden className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground">{t(`faq.${key}.a`, { product: PRODUCT_NAME, days: TRIAL_DAYS })}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-4 py-20 md:px-6 lg:px-8">
          <h2 className="display max-w-3xl text-4xl md:text-6xl">{t("finalTitle")}</h2>
          <Link href="/signup" className={buttonVariants({ variant: "accent", size: "lg" })}>
            {t("ctaPrimary")}
          </Link>
        </div>
      </section>
    </>
  );
}

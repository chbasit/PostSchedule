import { ArrowRight, Check, FileCheck, Gauge, Globe, Plus, Send, type LucideIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { PlatformMark } from "@/components/platform-badge";
import { buttonVariants } from "@/components/ui/button";
import { AI_ENABLED, PRODUCT_NAME, SITE_URL } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { PLANS, TRIAL_DAYS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/providers/catalog";
import { GoogleIcon } from "@/features/auth/google-icon";
import { SoonBadge } from "@/features/ai-studio/coming-soon";
import { AgentsVisual } from "@/features/marketing/agents-visual";
import { BrandTreeVisual } from "@/features/marketing/brand-tree";
import { Comparison } from "@/features/marketing/comparison";
import { CustomerReviews } from "@/features/marketing/customer-reviews";
import { ManageVisual, ScheduleVisual } from "@/features/marketing/core-visuals";
import { FeatureTabs } from "@/features/marketing/feature-tabs";
import { LandingPricing } from "@/features/marketing/landing-pricing";
import { PreviewPhones } from "@/features/marketing/preview-phones";
import { PublishVisual } from "@/features/marketing/publish-visual";
import { reviewSchema } from "@/features/marketing/testimonials";

// The homepage follows the AI Assistant page (founder's call, 2026-11-13), except the hero,
// which stays centred on a grid of thin lines: four benefits, the feature tabs, sections that
// alternate words and pictures, the comparison, pricing and the FAQ.

// The three everyday jobs in the feature tabs, each picture straight on the page (founder's
// call, 2026-11-13: no coloured panels behind them).
const CORE = ["publish", "schedule", "manage"] as const;

const BENEFITS: Array<{ key: "everywhere" | "checks" | "zones" | "original"; icon: LucideIcon; tint: string }> = [
  { key: "everywhere", icon: Send, tint: "bg-card-lavender" },
  { key: "checks", icon: Gauge, tint: "bg-card-yellow" },
  { key: "zones", icon: Globe, tint: "bg-card-aqua" },
  { key: "original", icon: FileCheck, tint: "bg-card-salmon" },
];

const FAQ_KEYS = ["what", "quality", "ai", "platforms", "safety", "trial", "cancel", "switch"] as const;

// Words on one side, a picture on a coloured panel on the other; `flip` puts the picture first
// from lg up, so the sections alternate.
function Split({
  id,
  eyebrow,
  title,
  body,
  extra,
  cta,
  surface,
  flip,
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: string;
  body: string;
  extra?: ReactNode;
  cta: ReactNode;
  surface: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={cn(flip && "lg:order-2")}>
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
          <h2 id={id} className="display mt-3 text-4xl text-balance md:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-xl text-xl text-muted-foreground">{body}</p>
          {extra}
          {cta}
        </div>
        <div className={cn("grid place-items-center overflow-hidden rounded-2xl p-6 sm:p-10", surface)}>{children}</div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const t = useTranslations("marketing.home");
  const locale = useLocale();
  const format = useFormatter();
  const platformNames = format.list(
    PLATFORMS.map((p) => p.name),
    { type: "conjunction" },
  );
  const pill = cn(buttonVariants({ size: "lg" }), "w-full rounded-full px-7 sm:w-auto");
  const pillSecondary = cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full rounded-full border-border bg-card px-7 shadow-card sm:w-auto");
  const cta = (
    <Link href="/signup" className={cn(pill, "mt-8")}>
      {t("ctaPrimary")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
    </Link>
  );

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
            // Real customer reviews, once there are any.
            ...reviewSchema(),
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

      {/* Hero, centred as before (founder's call, 2026-11-13), over a grid of light grey lines
          on white that fades toward the next section. */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="hero-grid absolute inset-0 -z-10" />
        <div className="mx-auto max-w-[1440px] px-4 pt-20 pb-16 text-center md:px-6 md:pt-24 md:pb-24 lg:px-8 lg:pt-32">
          <h1 className="display mx-auto max-w-6xl text-[clamp(2.75rem,6vw,5rem)] text-balance">{t("headline")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-muted-foreground md:text-xl">{t(AI_ENABLED ? "sub" : "subSoon")}</p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
            <Link href="/signup" className={pill}>
              {t("ctaPrimary")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
            </Link>
            <Link href="/signup?provider=google" className={pillSecondary}>
              <GoogleIcon /> {t("ctaGoogle")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("ctaNote", { days: TRIAL_DAYS })}</p>
          <div className="mt-8">
            <p className="text-sm font-medium text-muted-foreground">{t("platformsLabel")}</p>
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {PLATFORMS.map((platform) => (
                <li key={platform.id} className="flex">
                  <PlatformMark id={platform.id} size="lg" className="rounded-xl sm:size-12" />
                  <span className="sr-only">{platform.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Four reasons, in cards. */}
      <section aria-labelledby="benefits-title" className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <h2 id="benefits-title" className="display text-center text-4xl text-balance md:text-5xl">
          {t("benefits.title", { product: PRODUCT_NAME })}
        </h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ key, icon: Icon, tint }) => (
            <li key={key} className="rounded-2xl bg-card p-6 ring-1 ring-border">
              <span className={cn("inline-flex size-11 items-center justify-center rounded-xl text-forest", tint)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight">{t(`benefits.items.${key}.title`)}</h3>
              <p className="mt-2 text-base text-muted-foreground">{t(`benefits.items.${key}.body`, { platforms: platformNames })}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Feature tabs (founder's call, 2026-11-13): the list on one side, a picture on the
          item's colour on the other; the open item's line fills, then the next opens. */}
      <section aria-labelledby="core-title" className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        {/* Section titles are capped at 768 px so they break onto two even lines (founder's
            call, 2026-11-13). */}
        <h2 id="core-title" className="display mx-auto max-w-3xl text-center text-4xl text-balance md:text-5xl">
          {t("core.title")}
        </h2>
        <div className="mt-12 md:mt-16">
          <FeatureTabs
            label={t("core.title")}
            items={CORE.map((key) => ({
              key,
              title: t(`core.items.${key}.title`),
              body: t(`core.items.${key}.body`, { platforms: platformNames, product: PRODUCT_NAME }),
              visual:
                key === "publish" ? (
                  <PublishVisual label={t("core.items.publish.visual", { platforms: platformNames })} />
                ) : key === "schedule" ? (
                  <ScheduleVisual label={t("core.items.schedule.visual")} />
                ) : (
                  <ManageVisual label={t("core.items.manage.visual")} />
                ),
            }))}
          />
        </div>
      </section>

      {/* Previews: the phones on salmon, picture first. */}
      <Split
        id="features-title"
        flip
        surface="bg-card-salmon"
        eyebrow={t("eyebrows.previews")}
        title={t("featuresTitle")}
        body={t("featuresSub")}
        extra={
          <ul className="mt-6 space-y-3">
            {(["captions", "frames", "fix"] as const).map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-lg font-medium">
                <span aria-hidden className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
                {t(`showcase.previews.points.${point}`)}
              </li>
            ))}
          </ul>
        }
        cta={cta}
      >
        <PreviewPhones label={t("showcase.previews.shot")} />
      </Split>

      {/* Agents (founder's call, 2026-11-13): coming soon, so it says so; the picture is an
          illustration. */}
      <Split
        id="agents-title"
        surface="bg-card-aqua"
        eyebrow={
          <>
            {t("agents.eyebrow")}
            <SoonBadge className="tracking-normal normal-case" />
          </>
        }
        title={t("agents.title")}
        body={t("agents.body", { product: PRODUCT_NAME })}
        cta={cta}
      >
        <AgentsVisual />
      </Split>

      {/* Workspaces: one account, a workspace per brand; the tree on lavender, picture first. */}
      <Split id="brands-title" flip surface="bg-card-lavender" eyebrow={t("eyebrows.brands")} title={t("brands.title")} body={t("brands.sub")} cta={cta}>
        <BrandTreeVisual />
      </Split>

      <Comparison />

      <CustomerReviews />

      {/* Pricing: the four paid plans side by side; Pricing compares all five. */}
      <section aria-labelledby="pricing-title" className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <h2 id="pricing-title" className="display mx-auto mb-8 max-w-3xl text-center text-4xl text-balance md:text-5xl">
          {t("pricingTitle")}
        </h2>
        <LandingPricing />
        <div className="mt-8 flex justify-center">
          <Link href="/pricing" className={cn(buttonVariants({ variant: "secondary" }), "rounded-full border-border bg-card shadow-card")}>
            {t("pricingCta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </section>

      {/* FAQ: visible questions with direct answers (SEO-AEO.md workflow 2), centred, no cards. */}
      <section aria-labelledby="faq-title" className="mx-auto max-w-7xl px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <h2 id="faq-title" className="display text-center text-4xl text-balance md:text-5xl">
          {t("faqTitle", { product: PRODUCT_NAME })}
        </h2>
        <div className="mt-10 divide-y border-y">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded text-lg font-normal [&::-webkit-details-marker]:hidden">
                {t(`faq.${key}.q`, { product: PRODUCT_NAME })}
                <Plus aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-4xl pe-10 text-lg text-muted-foreground">
                {key === "ai" && !AI_ENABLED ? t("faq.ai.aSoon", { product: PRODUCT_NAME }) : t(`faq.${key}.a`, { product: PRODUCT_NAME, days: TRIAL_DAYS })}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

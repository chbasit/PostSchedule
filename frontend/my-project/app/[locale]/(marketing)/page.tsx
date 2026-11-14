import { ArrowRight, Plus } from "lucide-react";
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
import { HowItWorks } from "@/features/marketing/how-it-works";
import { WhySwitch } from "@/features/marketing/why-switch";
import { CustomerReviews } from "@/features/marketing/customer-reviews";
import { ManageVisual, ScheduleVisual } from "@/features/marketing/core-visuals";
import { FeatureTabs } from "@/features/marketing/feature-tabs";
import { LandingPricing } from "@/features/marketing/landing-pricing";
import { PublishVisual } from "@/features/marketing/publish-visual";
import { reviewSchema } from "@/features/marketing/testimonials";

// The homepage follows the AI Assistant page (founder's call, 2026-11-13), except the hero,
// which stays centred on a grid of thin lines: how it works, the feature tabs, sections that
// alternate words and pictures, the comparison, pricing and the FAQ.

// The three everyday jobs in the feature tabs, each picture straight on the page (founder's
// call, 2026-11-13: no coloured panels behind them).
const CORE = ["publish", "schedule", "manage"] as const;

const FAQ_KEYS = ["what", "quality", "ai", "platforms", "safety", "trial", "cancel", "switch"] as const;

// Words on one side, a picture on a coloured panel on the other; `flip` puts the picture first
// from lg up, so the sections alternate.
function Split({
  id,
  eyebrow,
  title,
  body,
  cta,
  surface,
  flip,
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: string;
  body: string;
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
          <h2 id={id} className="display mt-3 text-3xl text-balance sm:text-4xl md:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl">{body}</p>
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
      {/* Pulled up under the transparent header (h-16) so the grid continues behind the navbar. */}
      <section className="relative isolate -mt-16 overflow-hidden">
        <div aria-hidden className="hero-grid absolute inset-0 -z-10" />
        <div className="mx-auto max-w-[1440px] px-4 pt-28 pb-14 text-center md:px-6 md:pt-32 md:pb-20 lg:px-8 lg:pt-36">
          <h1 className="display mx-auto max-w-5xl text-[clamp(2.1rem,5.4vw,4.5rem)] text-balance">{t("headline")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-balance text-muted-foreground sm:text-lg md:mt-6 md:text-xl">{t(AI_ENABLED ? "sub" : "subSoon")}</p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
            {/* Start free opens the sign-in page, like the header's (founder's call, 2026-11-14). */}
            <Link href="/login" className={pill}>
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

      {/* How it works: three numbered steps on the light grey band (founder's call, 2026-11-14). */}
      <HowItWorks />

      {/* Feature tabs (founder's call, 2026-11-13): the list on one side, a picture on the
          item's colour on the other; the open item's line fills, then the next opens. */}
      <section aria-labelledby="core-title" className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
        {/* Section titles are capped at 768 px so they break onto two even lines (founder's
            call, 2026-11-13). */}
        <h2 id="core-title" className="display mx-auto max-w-3xl text-center text-3xl text-balance sm:text-4xl md:text-5xl">
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

      {/* Why switch: big numbers on forest, every one a checkable fact (founder's call, 2026-11-14). */}
      <WhySwitch />

      <CustomerReviews />

      {/* Pricing: the four paid plans side by side; Pricing compares all five. */}
      <section aria-labelledby="pricing-title" className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <h2 id="pricing-title" className="display mx-auto mb-8 max-w-3xl text-center text-3xl text-balance sm:text-4xl md:text-5xl">
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
        <h2 id="faq-title" className="display text-center text-3xl text-balance sm:text-4xl md:text-5xl">
          {t("faqTitle", { product: PRODUCT_NAME })}
        </h2>
        <div className="mt-10 divide-y border-y">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded text-base font-normal md:text-lg [&::-webkit-details-marker]:hidden">
                {t(`faq.${key}.q`, { product: PRODUCT_NAME })}
                <Plus aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-4xl pe-10 text-base text-muted-foreground md:text-lg">
                {key === "ai" && !AI_ENABLED ? t("faq.ai.aSoon", { product: PRODUCT_NAME }) : t(`faq.${key}.a`, { product: PRODUCT_NAME, days: TRIAL_DAYS })}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

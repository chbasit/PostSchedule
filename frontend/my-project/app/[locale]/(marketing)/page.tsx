import {
  ArrowRight,
  Bot,
  CalendarClock,
  Check,
  FileCheck,
  Gauge,
  Globe,
  Layers,
  PenLine,
  Plus,
  ScanEye,
  ShieldCheck,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { PlatformMark } from "@/components/platform-badge";
import { buttonVariants } from "@/components/ui/button";
import { AI_ENABLED, PRODUCT_NAME, SITE_URL } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { PLANS, TRIAL_DAYS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/providers/catalog";
import { GoogleIcon } from "@/features/auth/google-icon";
import { AgentConsole } from "@/features/marketing/agent-console";
import { BrandTree } from "@/features/marketing/brand-tree";
import { Clip, type ClipName } from "@/features/marketing/clip";
import { Comparison } from "@/features/marketing/comparison";
import { CustomerReviews } from "@/features/marketing/customer-reviews";
import { HubVisual } from "@/features/marketing/hub-visual";
import { LandingPricing } from "@/features/marketing/landing-pricing";
import { PreviewPhones } from "@/features/marketing/preview-phones";
import { PublishVisual } from "@/features/marketing/publish-visual";
import { reviewSchema } from "@/features/marketing/testimonials";

// The three everyday jobs, right under the hero: publish, schedule, manage. Each row has its
// words on one side and a picture of it on the other: the fan-out drawing, then two clips.
const CORE: Array<{ key: "publish" | "schedule" | "manage"; clip?: ClipName }> = [
  { key: "publish" },
  { key: "schedule", clip: "calendar" },
  { key: "manage", clip: "home" },
];

// The pills around the centre picture: true numbers only, taken from the code where they live.
const PROMISE: Array<{ key: "platforms" | "click" | "checks" | "trial" | "original" | "cards"; value: number; percent?: boolean }> = [
  { key: "platforms", value: PLATFORMS.length },
  { key: "click", value: 1 },
  // Aspect ratio, resolution, bitrate, duration and size (features.preflight).
  { key: "checks", value: 5 },
  { key: "trial", value: TRIAL_DAYS },
  // The uploaded file is never changed (features.original).
  { key: "original", value: 1, percent: true },
  // The trial needs no card (pricing.ctaNote).
  { key: "cards", value: 0 },
];

// Under the hero: four things the product does today.
const HIGHLIGHTS: Array<{ key: "write" | "check" | "schedule" | "brands"; icon: LucideIcon }> = [
  { key: "write", icon: PenLine },
  { key: "check", icon: ScanEye },
  { key: "schedule", icon: CalendarClock },
  { key: "brands", icon: Layers },
];

const AI_POINTS: Array<{ key: "write" | "agents" | "control"; icon: LucideIcon; chip: string }> = [
  { key: "write", icon: Sparkles, chip: "bg-card-lavender" },
  { key: "agents", icon: Bot, chip: "bg-card-aqua" },
  { key: "control", icon: ShieldCheck, chip: "bg-card-yellow" },
];

// The features the clips do not show.
const EXTRAS: Array<{ key: "preflight" | "original" | "approvals" | "timezones"; icon: LucideIcon; chip: string }> = [
  { key: "preflight", icon: Gauge, chip: "bg-card-yellow" },
  { key: "original", icon: FileCheck, chip: "bg-card-aqua" },
  { key: "approvals", icon: UserCheck, chip: "bg-card-pink" },
  { key: "timezones", icon: Globe, chip: "bg-card-lavender" },
];

const STEP_CHIPS = ["bg-card-lavender", "bg-card-aqua", "bg-card-yellow"] as const;

const FAQ_KEYS = ["what", "quality", "ai", "platforms", "safety", "trial", "cancel", "switch"] as const;

// A coloured panel. The landing page is flat: no frames, borders or shadows on its cards.
function Panel({ surface, className, style, children }: { surface: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn("relative isolate overflow-hidden rounded-2xl", surface, className)} style={style}>
      {children}
    </div>
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
            // Real customer reviews from the wall, once there are any.
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

      {/* Hero: the promise, the platforms, then the product at work. */}
      <section>
        <div className="mx-auto max-w-[1440px] px-4 pt-20 text-center md:px-6 md:pt-24 lg:px-8 lg:pt-32">
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
        {/* Four things the product does, in place of the product video (founder's call,
            2026-11-11): columns with hairlines between them, two by two on phones. No numbers:
            there are no customer results to show yet. */}
        <div className="mx-auto max-w-[1440px] px-4 pt-14 pb-16 md:px-6 md:pb-24 lg:px-8">
          <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border rtl:lg:divide-x-reverse">
            {HIGHLIGHTS.map(({ key, icon: Icon }) => (
              <li key={key} className="px-2 lg:px-8">
                <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight md:text-2xl">{t(`highlights.${key}.title`)}</h2>
                <p className="mt-2 text-muted-foreground">{t(`highlights.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Core: what people come for, in the words they search with. */}
      <section aria-labelledby="core-title" className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        {/* One line on wide screens (founder's call, 2026-11-03); narrower ones wrap it at 48 px. */}
        <h2 id="core-title" className="display text-center text-4xl text-balance md:text-5xl xl:whitespace-nowrap">
          {t("core.title")}
        </h2>
        {/* Stacking cards (founder's call, 2026-11-11): from lg up, on screens at least 608 px
            tall (a laptop browser window), each card sticks under the header, a step lower than
            the one before, and the next slides over it. Phones and short screens scroll them
            normally. */}
        <div className="mt-12 space-y-5 lg:space-y-10">
          {CORE.map(({ key, clip }, i) => (
            <Panel
              key={key}
              surface="bg-card-periwinkle"
              className="lg:[@media(min-height:38rem)]:sticky lg:[@media(min-height:38rem)]:top-(--stack-top)"
              style={{ "--stack-top": `${5 + i}rem` } as CSSProperties}
            >
              <div className="grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:p-14">
                <div>
                  <h3 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-[2.75rem] md:leading-tight">{t(`core.items.${key}.title`)}</h3>
                  <p className="mt-4 max-w-xl text-lg text-foreground/75">{t(`core.items.${key}.body`, { platforms: platformNames, product: PRODUCT_NAME })}</p>
                  <Link href="/signup" className="mt-7 inline-flex items-center gap-1.5 rounded-md font-semibold underline-offset-4 hover:underline">
                    {t("ctaPrimary")} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                  </Link>
                </div>
                {clip ? (
                  <div className="overflow-hidden rounded-xl bg-card">
                    <Clip name={clip} />
                  </div>
                ) : (
                  <PublishVisual label={t("core.items.publish.visual", { platforms: platformNames })} />
                )}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* Promise: the core in one picture with true numbers around it (founder's call,
          2026-11-11): three pills each side from lg up, wrapped under the picture on phones.
          Clipped sideways: the turning ring's empty corners would widen the page on phones. */}
      <section aria-labelledby="promise-title" className="mx-auto max-w-[1440px] overflow-x-clip px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <h2 id="promise-title" className="display text-center text-4xl text-balance md:text-5xl">
          {t("promise.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-balance text-muted-foreground">{t("promise.sub")}</p>
        <div className="mx-auto mt-10 grid max-w-4xl items-center gap-x-10 gap-y-6 lg:mt-14 lg:grid-cols-[1fr_minmax(0,22rem)_1fr]">
          <HubVisual className="lg:col-start-2 lg:row-start-1" label={t("promise.visual", { product: PRODUCT_NAME, platforms: platformNames })} />
          {[PROMISE.slice(0, 3), PROMISE.slice(3)].map((side, s) => (
            <ul
              key={side[0].key}
              className={cn(
                "flex flex-wrap justify-center gap-3 lg:row-start-1 lg:flex-col lg:justify-between lg:self-stretch lg:py-8",
                s === 0 ? "lg:col-start-1 lg:items-start" : "lg:col-start-3 lg:items-end",
              )}
            >
              {side.map(({ key, value, percent }) => (
                <li key={key} className="inline-flex items-center gap-2 rounded-full bg-card p-1 pe-4 text-sm font-medium ring-1 ring-border">
                  <span className="tabular rounded-full bg-card-lavender px-2.5 py-1 font-semibold">
                    {format.number(value, percent ? { style: "percent" } : undefined)}
                  </span>
                  {t(`promise.stats.${key}`)}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <Comparison />

      {/* AI: the writing assistant today, agents through the API and MCP server soon. */}
      <section aria-labelledby="ai-title" className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <Panel surface="ai-mesh">
          <div aria-hidden className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_75%_75%_at_30%_40%,black,transparent)]" />
          <div className="grid items-center gap-12 px-6 py-12 sm:px-10 md:py-16 lg:grid-cols-[1fr_1.05fr] lg:px-14">
            <div>
              <h2 id="ai-title" className="display text-4xl text-balance md:text-5xl">
                {t("ai.title")}
              </h2>
              <p className="mt-5 max-w-xl text-lg text-foreground/80">{t(AI_ENABLED ? "ai.sub" : "ai.subSoon")}</p>
              <ul className="mt-8 space-y-5">
                {AI_POINTS.map(({ key, icon: Icon, chip }) => (
                  <li key={key} className="flex gap-4">
                    <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-foreground/10", chip)}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-semibold">
                        {t(`ai.points.${key}.title`)}
                        {/* While AI is switched off, the writing and image tools are announced, not offered. */}
                        {key === "write" && !AI_ENABLED ? (
                          <span className="ms-2 rounded-full bg-card px-2 py-0.5 align-middle font-sans text-xs font-semibold">{t("ai.console.soon")}</span>
                        ) : null}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/75">{t(`ai.points.${key}.body`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <AgentConsole />
          </div>
        </Panel>
      </section>

      {/* Features and how it works, in one full-width band with square edges, light grey in
          the light theme (founder's call, 2026-11-11): the previews (a drawing of three phones),
          the details, then the three steps. */}
      <section id="features" aria-labelledby="features-title" className="mb-16 scroll-mt-24 bg-band md:mb-24 dark:border-y dark:border-border">
        <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="features-title" className="display text-4xl text-balance md:text-5xl">
              {t("featuresTitle")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("featuresSub")}</p>
          </div>

          <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl md:leading-tight">{t("showcase.previews.title")}</h3>
              <p className="mt-3 max-w-md text-muted-foreground">{t("showcase.previews.body")}</p>
              <ul className="mt-6 space-y-3">
                {(["captions", "frames", "fix"] as const).map((point) => (
                  <li key={point} className="flex items-start gap-2.5 font-medium">
                    <span aria-hidden className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                      <Check className="size-3" />
                    </span>
                    {t(`showcase.previews.points.${point}`)}
                  </li>
                ))}
              </ul>
            </div>
            <PreviewPhones label={t("showcase.previews.shot")} />
          </div>

          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXTRAS.map(({ key, icon: Icon, chip }) => (
              <li key={key} className="rounded-2xl bg-card p-6">
                <span className={cn("inline-flex size-11 items-center justify-center rounded-2xl text-foreground", chip)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`features.${key}.body`)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-16 border-t border-border pt-14">
            <h3 className="display text-center text-3xl text-balance md:text-4xl">{t("stepsTitle")}</h3>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {(["connect", "check", "schedule"] as const).map((step, i) => (
                <li key={step} className="rounded-2xl bg-card p-7">
                  <span aria-hidden className={cn("tabular inline-flex size-11 items-center justify-center rounded-2xl font-heading text-lg font-semibold text-foreground", STEP_CHIPS[i])}>
                    {i + 1}
                  </span>
                  <h4 className="mt-5 font-heading text-2xl font-semibold tracking-tight">{t(`steps.${step}.title`)}</h4>
                  <p className="mt-2 text-muted-foreground">{t(`steps.${step}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* One account, a workspace per brand; real reviews once there are any (each section
          explains itself). */}
      <BrandTree />
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
              <p className="mt-3 max-w-4xl pe-10 text-muted-foreground">
                {key === "ai" && !AI_ENABLED ? t("faq.ai.aSoon", { product: PRODUCT_NAME }) : t(`faq.${key}.a`, { product: PRODUCT_NAME, days: TRIAL_DAYS })}
              </p>
            </details>
          ))}
        </div>
      </section>

    </>
  );
}

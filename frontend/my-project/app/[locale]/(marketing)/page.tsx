import {
  ArrowRight,
  Bot,
  Check,
  Crop,
  FileCheck,
  Gauge,
  Globe,
  Languages,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { PlatformMark } from "@/components/platform-badge";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_NAME, SITE_URL } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PLANS, TRIAL_DAYS, type PlanKey } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/providers/catalog";
import { PlanCard } from "@/features/billing/plan-card";
import { GoogleIcon } from "@/features/auth/google-icon";
import { AgentConsole } from "@/features/marketing/agent-console";
import { BrowserFrame } from "@/features/marketing/browser-frame";
import { Clip, type ClipName } from "@/features/marketing/clip";
import { Marquee } from "@/features/marketing/marquee";
import { ProductShot } from "@/features/marketing/product-shot";
import { tightStops } from "@/features/marketing/tight-stops";
import { TOOLS, toolHref } from "@/features/tools/registry";

// Product facts for the moving row: things that are true today, no customer claims. Each
// sits on one of the landing card colours.
const FACTS: Array<{ key: "platforms" | "checks" | "fix" | "languages" | "tools"; icon: LucideIcon; surface: string; values?: Record<string, number> }> = [
  { key: "platforms", icon: Smartphone, surface: "bg-card-aqua", values: { count: PLATFORMS.length } },
  { key: "checks", icon: Gauge, surface: "bg-card-yellow" },
  { key: "fix", icon: Crop, surface: "bg-card-pink" },
  { key: "languages", icon: Languages, surface: "bg-card-lavender", values: { count: routing.locales.length } },
  { key: "tools", icon: Wrench, surface: "bg-card-salmon", values: { count: TOOLS.length } },
];

const AI_POINTS: Array<{ key: "write" | "agents" | "control"; icon: LucideIcon; chip: string }> = [
  { key: "write", icon: Sparkles, chip: "bg-card-lavender" },
  { key: "agents", icon: Bot, chip: "bg-card-aqua" },
  { key: "control", icon: ShieldCheck, chip: "bg-card-yellow" },
];

// The features the clips do not show.
const EXTRAS: Array<{ key: "preflight" | "original" | "approvals" | "languages"; icon: LucideIcon; chip: string }> = [
  { key: "preflight", icon: Gauge, chip: "bg-card-yellow" },
  { key: "original", icon: FileCheck, chip: "bg-card-aqua" },
  { key: "approvals", icon: UserCheck, chip: "bg-card-pink" },
  { key: "languages", icon: Globe, chip: "bg-card-lavender" },
];

const STEP_CHIPS = ["bg-card-lavender", "bg-card-aqua", "bg-card-yellow"] as const;

const FAQ_KEYS = ["what", "quality", "ai", "platforms", "trial", "switch"] as const;

// The tools card links straight to the most used free tools.
const FEATURED_TOOLS = TOOLS.slice(0, 4);

// Three plans here; Pricing lists all of them with the full comparison.
const LANDING_PLANS: PlanKey[] = ["free", "pro", "agency"];

// A coloured panel in a white frame, after the founder's reference (Buffer).
function Framed({ surface, className, children }: { surface: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-[30px] border bg-card p-1.5 shadow-card", className)}>
      <div className={cn("relative isolate h-full overflow-hidden rounded-[24px]", surface)}>{children}</div>
    </div>
  );
}

// A feature card with its clip. "side" puts the clip beside the text on wide screens;
// "bottom" lets it sit flush in the panel's lower corner.
function ShowcaseCard({
  name,
  clip,
  surface,
  layout,
  mediaClassName,
  className,
  action,
}: {
  name: "previews" | "calendar" | "home" | "tools";
  clip: ClipName;
  surface: string;
  layout: "side" | "bottom";
  mediaClassName?: string;
  className?: string;
  action?: ReactNode;
}) {
  const t = useTranslations("marketing.home.showcase");
  const text = (
    <div className="space-y-3">
      <h3 className="font-heading text-2xl font-bold tracking-tight text-balance md:text-[1.75rem] md:leading-tight">{t(`${name}.title`)}</h3>
      <p className="max-w-md text-foreground/75">{t(`${name}.body`)}</p>
      {action}
    </div>
  );

  return (
    <Framed surface={surface} className={className}>
      {layout === "side" ? (
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14">
          {text}
          <div className={cn("w-full justify-self-center overflow-hidden rounded-2xl border bg-card shadow-dialog", mediaClassName)}>
            <Clip name={clip} />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="p-6 sm:p-8">{text}</div>
          <div className="mt-auto ps-6 sm:ps-8">
            <div className="overflow-hidden rounded-ss-2xl border-s border-t bg-card shadow-dialog">
              <Clip name={clip} />
            </div>
          </div>
        </div>
      )}
    </Framed>
  );
}

export default function HomePage() {
  const t = useTranslations("marketing.home");
  const tt = useTranslations("tools");
  const locale = useLocale();
  const pill = cn(buttonVariants({ size: "lg" }), "w-full rounded-full px-7 sm:w-auto");
  const pillSecondary = cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full rounded-full border-border bg-card px-7 shadow-card sm:w-auto");
  const plans = PLANS.filter((p) => LANDING_PLANS.includes(p.key));

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

      {/* Hero: the promise, the platforms, then the product at work. */}
      <section>
        <div className="mx-auto max-w-[1200px] px-4 pt-12 text-center md:px-6 lg:px-8 lg:pt-20">
          <h1 className="display mx-auto max-w-5xl text-[clamp(2.5rem,5.6vw,4.5rem)] text-balance">{tightStops(t("headline"))}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-muted-foreground md:text-xl">{t("sub")}</p>
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
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {PLATFORMS.map((platform) => (
                <li key={platform.id} className="rounded-2xl bg-card p-1 shadow-card ring-1 ring-border sm:p-1.5">
                  <PlatformMark id={platform.id} size="lg" className="size-9 rounded-xl sm:size-10" />
                  <span className="sr-only">{platform.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-[1200px] px-4 pb-16 md:px-6 md:pb-20 lg:mt-12 lg:px-8">
          <Framed surface="bg-card-lavender">
            <div className="p-2 sm:p-3 lg:p-4">
              {/* The clips are recorded in English; Arabic pages keep the right-to-left screenshot. */}
              {locale === "ar" ? (
                <ProductShot />
              ) : (
                <BrowserFrame>
                  <Clip name="compose" />
                </BrowserFrame>
              )}
            </div>
          </Framed>
        </div>
      </section>

      {/* Facts: what is true of the product today, in place of customer logos we do not have. */}
      <section aria-labelledby="facts-title" className="pb-16 md:pb-24">
        <div className="mx-auto max-w-[1200px] px-4 text-center md:px-6 lg:px-8">
          <h2 id="facts-title" className="display mx-auto max-w-3xl text-4xl text-balance md:text-5xl">
            {tightStops(t("facts.title"))}
          </h2>
        </div>
        <Marquee className="mt-10">
          {FACTS.map(({ key, icon: Icon, surface, values }) => (
            <li key={key} className="w-72 shrink-0 rounded-[26px] border bg-card p-1.5 shadow-card">
              <div className={cn("flex h-48 flex-col justify-between rounded-[20px] p-5", surface)}>
                <div className="flex items-start justify-between gap-3">
                  <p className="tabular font-heading text-[2.75rem] font-extrabold leading-none tracking-tight">{t(`facts.items.${key}.value`, values)}</p>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card/70">
                    <Icon className="size-5" aria-hidden />
                  </span>
                </div>
                <p className="text-[15px] leading-snug text-foreground/80">{t(`facts.items.${key}.label`)}</p>
              </div>
            </li>
          ))}
        </Marquee>
      </section>

      {/* AI: the writing assistant today, agents through the API and MCP server soon. */}
      <section aria-labelledby="ai-title" className="mx-auto max-w-[1200px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <Framed surface="ai-mesh">
          <div aria-hidden className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_75%_75%_at_30%_40%,black,transparent)]" />
          <div className="grid items-center gap-12 px-6 py-12 sm:px-10 md:py-16 lg:grid-cols-[1fr_1.05fr] lg:px-14">
            <div>
              <h2 id="ai-title" className="display text-4xl text-balance md:text-5xl">
                {tightStops(t("ai.title"))}
              </h2>
              <p className="mt-5 max-w-xl text-lg text-foreground/80">{t("ai.sub")}</p>
              <ul className="mt-8 space-y-5">
                {AI_POINTS.map(({ key, icon: Icon, chip }) => (
                  <li key={key} className="flex gap-4">
                    <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-foreground/10", chip)}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-heading font-bold">{t(`ai.points.${key}.title`)}</h3>
                      <p className="mt-1 text-sm text-foreground/75">{t(`ai.points.${key}.body`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <AgentConsole />
          </div>
        </Framed>
      </section>

      {/* Features: each with a clip of the real screen. */}
      <section id="features" aria-labelledby="features-title" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-title" className="display text-4xl text-balance md:text-5xl">
            {tightStops(t("featuresTitle"))}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("featuresSub")}</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <ShowcaseCard
            name="previews"
            clip="previews"
            surface="bg-card-lavender"
            layout="side"
            mediaClassName="max-w-[320px]"
            className="lg:col-span-2"
            action={
              <ul className="space-y-2.5 pt-2">
                {(["captions", "frames", "fix"] as const).map((point) => (
                  <li key={point} className="flex items-start gap-2.5 font-medium">
                    <span aria-hidden className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-card shadow-card">
                      <Check className="size-3" />
                    </span>
                    {t(`showcase.previews.points.${point}`)}
                  </li>
                ))}
              </ul>
            }
          />
          <ShowcaseCard name="calendar" clip="calendar" surface="bg-card-aqua" layout="bottom" />
          <ShowcaseCard name="home" clip="home" surface="bg-card-salmon" layout="bottom" />
          <ShowcaseCard
            name="tools"
            clip="tools"
            surface="bg-card-yellow"
            layout="side"
            mediaClassName="lg:w-[560px]"
            className="lg:col-span-2"
            action={
              <div className="space-y-5 pt-2">
                <ul className="flex flex-wrap gap-2">
                  {FEATURED_TOOLS.map((tool) => (
                    <li key={tool.key}>
                      <Link
                        href={toolHref(tool)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-card transition-colors hover:bg-muted"
                      >
                        <tool.icon className="size-4" aria-hidden />
                        {tt(`${tool.key}.name`)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/tools" className={cn(buttonVariants(), "rounded-full px-5")}>
                  {t("showcase.tools.cta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
                </Link>
              </div>
            }
          />
        </div>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EXTRAS.map(({ key, icon: Icon, chip }) => (
            <li key={key} className="card-surface rounded-3xl p-6">
              <span className={cn("inline-flex size-11 items-center justify-center rounded-2xl", chip)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-lg font-bold tracking-tight">{t(`features.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`features.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="border-y bg-shell">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="display text-4xl text-balance md:text-5xl">{tightStops(t("stepsTitle"))}</h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {(["connect", "check", "schedule"] as const).map((step, i) => (
              <li key={step} className="card-surface rounded-3xl p-7">
                <span aria-hidden className={cn("tabular inline-flex size-11 items-center justify-center rounded-2xl font-heading text-lg font-bold", STEP_CHIPS[i])}>
                  {i + 1}
                </span>
                <h3 className="mt-5 font-heading text-xl font-bold tracking-tight">{t(`steps.${step}.title`)}</h3>
                <p className="mt-2 text-muted-foreground">{t(`steps.${step}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing: three plans; Pricing compares all of them. */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <h2 className="display mx-auto max-w-2xl text-center text-4xl text-balance md:text-5xl">{tightStops(t("pricingTitle"))}</h2>
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              interval="month"
              previous={plans[i - 1]}
              className={plan.highlighted ? "bg-card-lavender" : undefined}
              action={
                <Link href="/signup" className={cn(buttonVariants({ variant: plan.highlighted ? "primary" : "secondary" }), "w-full rounded-full")}>
                  {t("ctaPrimary")}
                </Link>
              }
            />
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/pricing" className={cn(buttonVariants({ variant: "secondary" }), "rounded-full border-border bg-card shadow-card")}>
            {t("pricingCta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </section>

      {/* FAQ: visible questions with direct answers (SEO-AEO.md workflow 2) */}
      <section className="border-t">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_1.6fr] lg:px-8">
          <h2 className="display text-4xl md:text-5xl">{tightStops(t("faqTitle"))}</h2>
          <div className="space-y-3">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="group card-surface rounded-2xl px-5 py-4 transition-colors open:bg-highlight/50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold [&::-webkit-details-marker]:hidden">
                  {t(`faq.${key}.q`, { product: PRODUCT_NAME })}
                  <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted transition-transform group-open:rotate-45">
                    <Plus className="size-4" />
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground">{t(`faq.${key}.a`, { product: PRODUCT_NAME, days: TRIAL_DAYS })}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="mx-auto max-w-[1200px] px-4 pb-20 md:px-6 lg:px-8">
        <Framed surface="bg-highlight text-highlight-foreground">
          <div className="px-6 py-16 text-center md:py-24">
            <div aria-hidden className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_65%_75%_at_50%_50%,black,transparent)]" />
            <ul aria-hidden className="flex flex-wrap justify-center gap-2">
              {PLATFORMS.map((platform) => (
                <li key={platform.id}>
                  <PlatformMark id={platform.id} className="rounded-lg shadow-card" />
                </li>
              ))}
            </ul>
            <h2 className="display mx-auto mt-6 max-w-3xl text-4xl text-balance md:text-6xl">{tightStops(t("finalTitle"))}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-highlight-foreground/80">{t("ctaNote", { days: TRIAL_DAYS })}</p>
            <div className="mx-auto mt-8 flex max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
              <Link href="/signup" className={pill}>
                {t("ctaPrimary")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
              </Link>
              <Link href="/pricing" className={pillSecondary}>
                {t("pricingCta")}
              </Link>
            </div>
          </div>
        </Framed>
      </section>
    </>
  );
}

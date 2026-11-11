"use client";

import { Check, CreditCard, Globe, Minus, ShieldCheck, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AI_ENABLED } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { SoonBadge } from "@/features/ai-studio/coming-soon";
import { IntervalToggle } from "@/features/billing/interval-toggle";
import {
  TRIAL_DAYS,
  formatPrice,
  getPlan,
  yearlyPrice,
  yearlySaving,
  type BillingInterval,
  type Feature,
  type Plan,
  type PlanKey,
} from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

// The four paid plans; Free is offered under the cards.
const OFFERED: PlanKey[] = ["solo", "pro", "agency", "scale"];

// Each card lists the same rows so plans compare line by line: what every plan publishes
// with, then the team features that grow with the plan (a dash where a plan lacks one).
const GROUPS: Array<{ key: "publishing" | "teams"; features: Feature[] }> = [
  { key: "publishing", features: ["preflight", "previews", "fixes", "calendar", "timing"] },
  { key: "teams", features: ["reports", "approvals", "clientLinks", "api"] },
];

const TRUST: Array<{ key: "trial" | "cancel" | "usd"; icon: LucideIcon }> = [
  { key: "trial", icon: CreditCard },
  { key: "cancel", icon: ShieldCheck },
  { key: "usd", icon: Globe },
];

// Yearly billing costs less (the saving differs by plan), shown as the monthly price struck
// through and the yearly price per month. Both prices are real: monthly billing costs the
// struck price.
function OfferCard({ plan, interval }: { plan: Plan; interval: BillingInterval }) {
  const t = useTranslations("marketing.home.offer");
  const tp = useTranslations("plans");
  const tr = useTranslations("pricing");
  const locale = useLocale();
  const dark = plan.highlighted;
  const yearly = interval === "year";
  const perMonth = yearly ? yearlyPrice(plan) / 12 : plan.priceMonthly;
  const soft = dark ? "text-white/70" : "text-muted-foreground";

  return (
    <article
      aria-labelledby={`offer-${plan.key}`}
      className={cn("relative flex flex-col rounded-[28px] p-6", dark ? "bg-ink text-white dark:ring-1 dark:ring-white/20" : "bg-card ring-1 ring-border")}
    >
      <div className="flex min-h-6 items-start justify-between gap-2">
        <h3 id={`offer-${plan.key}`} className="font-heading text-xl font-semibold tracking-tight">
          {tp(`names.${plan.key}`)}
        </h3>
        {dark ? (
          <span className="rounded-full bg-card-lavender px-2.5 py-0.5 text-xs font-semibold text-foreground">{tp("popular")}</span>
        ) : yearly ? (
          <span className="rounded-full bg-highlight px-2.5 py-0.5 text-xs font-semibold text-highlight-foreground">{tp("save", { percent: yearlySaving(plan) })}</span>
        ) : null}
      </div>
      <p className={cn("mt-1 min-h-10 text-sm", soft)}>{tp(`blurbs.${plan.key}`)}</p>

      <div className="mt-5 min-h-[4.75rem]">
        {yearly ? (
          <p className={cn("tabular text-sm line-through", soft)}>
            <span className="sr-only">{t("was")} </span>
            {formatPrice(plan.priceMonthly, locale)}
          </p>
        ) : null}
        <p className="flex items-baseline gap-1">
          <span className="tabular font-heading text-4xl font-semibold tracking-tight">{formatPrice(perMonth, locale)}</span>
          <span className={cn("text-sm", soft)}>{tp("perMonth")}</span>
        </p>
      </div>

      <Link
        href={`/signup?plan=${plan.key}&interval=${interval}`}
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "mt-4 w-full rounded-full",
          dark ? "border-transparent bg-card-lavender text-foreground hover:bg-card-lavender/85" : "border-2 border-foreground bg-transparent",
        )}
      >
        {tr("ctaTrial")}
      </Link>
      <p className={cn("mt-3 min-h-10 text-xs leading-relaxed", soft)}>
        {yearly ? t("payYearly", { total: formatPrice(yearlyPrice(plan), locale) }) : t("payMonthly")}
      </p>

      <ul className={cn("mt-5 space-y-2.5 border-t pt-5 text-sm", dark && "border-white/15")}>
        <li className="font-semibold">{tp("accounts", { count: plan.accounts })}</li>
        <li className="font-semibold">{tp("seats", { count: plan.seats })}</li>
        <li className="font-semibold">
          {tp("aiCredits", { count: plan.aiCredits })}
          {AI_ENABLED ? null : <SoonBadge className="ms-1.5 align-middle" />}
        </li>
      </ul>

      {GROUPS.map((group) => (
        <div key={group.key} className="mt-5">
          <p className="text-sm font-semibold">{t(`groups.${group.key}`)}</p>
          <ul className="mt-2.5 space-y-2 text-sm">
            {group.features.map((feature) => {
              const has = plan.features.includes(feature);
              return (
                <li key={feature} className={cn("flex gap-2.5", !has && (dark ? "text-white/45" : "text-muted-foreground/80"))}>
                  {has ? <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} aria-hidden /> : <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />}
                  <span>
                    {tp(`features.${feature}`)}
                    <span className="sr-only"> ({has ? tr("included") : tr("notIncluded")})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </article>
  );
}

export function LandingPricing() {
  const t = useTranslations("marketing.home.offer");
  const tp = useTranslations("plans");
  const [interval, setInterval] = useState<BillingInterval>("year");
  const free = getPlan("free");

  return (
    <div>
      <div className="flex justify-center">
        <IntervalToggle value={interval} onChange={setInterval} />
      </div>
      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {TRUST.map(({ key, icon: Icon }) => (
          <li key={key} className="inline-flex items-center gap-1.5">
            <Icon className="size-4" aria-hidden />
            {t(`trust.${key}`, { days: TRIAL_DAYS })}
          </li>
        ))}
      </ul>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {OFFERED.map((key) => (
          <OfferCard key={key} plan={getPlan(key)} interval={interval} />
        ))}
      </div>
      <p className="mt-8 text-center text-muted-foreground">
        {t("free", { count: free.accounts, plan: tp("names.free") })}{" "}
        <Link href="/signup" className="font-semibold text-foreground underline underline-offset-4">
          {t("freeCta")}
        </Link>
      </p>
    </div>
  );
}

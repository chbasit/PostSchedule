import { Check, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AI_ENABLED } from "@/config/site";
import { SoonBadge } from "@/features/ai-studio/coming-soon";
import { formatPrice, planFeatures, priceFor, type BillingInterval, type Feature, type Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

// How many of its features the first card in a row lists.
const HIGHLIGHTS = 5;

type Props = {
  plan: Plan;
  interval: BillingInterval;
  action: ReactNode;
  // The plan shown before this one: the card then lists only what this plan adds.
  previous?: Plan;
  current?: boolean;
  // No ring or shadow: the card stands on its own fill (the landing page passes one).
  flat?: boolean;
  className?: string;
};

// Name, who it is for, price, the account and seat limits, then a short list from plans.ts
// (FRONTEND.md §5): the main features on the first card, "Everything in <previous>, plus"
// and the additions on the others. The full list is the comparison table on Pricing.
export function PlanCard({ plan, interval, action, previous, current, flat, className }: Props) {
  const t = useTranslations("plans");
  const locale = useLocale();
  const price = priceFor(plan, interval);
  const features: Feature[] = previous
    ? planFeatures(plan).filter((f) => !previous.features.includes(f))
    : planFeatures(plan).slice(0, HIGHLIGHTS);

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl bg-card p-6",
        !flat && "shadow-card",
        !flat && (plan.highlighted ? "ring-2 ring-foreground" : "ring-1 ring-border"),
        className,
      )}
      aria-labelledby={`plan-${plan.key}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id={`plan-${plan.key}`} className="font-heading text-lg font-semibold tracking-tight">
          {t(`names.${plan.key}`)}
        </h3>
        {current ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t("current")}</span>
        ) : plan.highlighted ? (
          <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">{t("popular")}</span>
        ) : null}
      </div>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{t(`blurbs.${plan.key}`)}</p>
      <p className="mt-5 flex items-baseline gap-1">
        <span className="tabular font-heading text-4xl font-semibold tracking-tight">{formatPrice(price, locale)}</span>
        <span className="text-sm text-muted-foreground">{interval === "year" ? t("perYear") : t("perMonth")}</span>
      </p>
      <ul className="mt-5 space-y-2.5 border-t pt-5 text-sm">
        <li className="flex gap-2.5 font-semibold">
          <UsersRound className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("accounts", { count: plan.accounts })}
        </li>
        <li className="flex gap-2.5 font-semibold">
          <UserRound className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("seats", { count: plan.seats })}
        </li>
        <li className="flex gap-2.5 font-semibold">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {t("aiCredits", { count: plan.aiCredits })}
            {AI_ENABLED ? null : <SoonBadge className="ms-1.5 align-middle" />}
          </span>
        </li>
        {previous ? <li className="pt-1 text-muted-foreground">{t("everythingIn", { plan: t(`names.${previous.key}`) })}</li> : null}
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} aria-hidden />
            {t(`features.${feature}`)}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">{action}</div>
    </article>
  );
}

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { formatPrice, priceFor, type BillingInterval, type Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type Props = {
  plan: Plan;
  interval: BillingInterval;
  action: ReactNode;
  current?: boolean;
  compact?: boolean;
};

// Name, price, accounts and seats, features from plans.ts, current-plan badge (FRONTEND.md §5).
export function PlanCard({ plan, interval, action, current, compact }: Props) {
  const t = useTranslations("plans");
  const locale = useLocale();
  const price = priceFor(plan, interval);

  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 rounded-lg border-2 bg-card p-5",
        plan.highlighted ? "border-foreground" : "border-border",
      )}
      aria-labelledby={`plan-${plan.key}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id={`plan-${plan.key}`} className="text-lg font-semibold">
          {t(`names.${plan.key}`)}
        </h3>
        {current ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{t("current")}</span>
        ) : plan.highlighted ? (
          <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-semibold text-ink">{t("popular")}</span>
        ) : null}
      </div>
      <div>
        <p className="flex items-baseline gap-1">
          <span className="tabular text-4xl font-light tracking-tight">{formatPrice(price, locale)}</span>
          <span className="text-sm text-muted-foreground">{interval === "year" ? t("perYear") : t("perMonth")}</span>
        </p>
        {!compact ? <p className="mt-1 text-sm text-muted-foreground">{t(`blurbs.${plan.key}`)}</p> : null}
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("accounts", { count: plan.accounts })}
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("seats", { count: plan.seats })}
        </li>
        {!compact
          ? plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t(`features.${f}`)}
              </li>
            ))
          : null}
      </ul>
      <div className="mt-auto">{action}</div>
    </article>
  );
}

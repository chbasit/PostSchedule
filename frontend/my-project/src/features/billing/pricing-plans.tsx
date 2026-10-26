"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PLANS, type BillingInterval } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { IntervalToggle } from "./interval-toggle";
import { PlanCard } from "./plan-card";

export function PricingPlans() {
  const t = useTranslations("pricing");
  const [interval, setInterval] = useState<BillingInterval>("month");

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <IntervalToggle value={interval} onChange={setInterval} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PLANS.map((plan, i) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            interval={interval}
            previous={PLANS[i - 1]}
            action={
              <Link
                href={plan.key === "free" ? "/signup" : `/signup?plan=${plan.key}&interval=${interval}`}
                className={cn(buttonVariants({ variant: plan.highlighted ? "primary" : "secondary" }), "w-full rounded-full")}
              >
                {plan.key === "free" ? t("ctaFree") : t("ctaTrial")}
              </Link>
            }
          />
        ))}
      </div>
    </div>
  );
}

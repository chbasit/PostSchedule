"use client";

import { useTranslations } from "next-intl";
import { Segmented } from "@/components/ui/segmented";
import type { BillingInterval } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export function IntervalToggle({ value, onChange }: { value: BillingInterval; onChange: (v: BillingInterval) => void }) {
  const t = useTranslations("plans");
  return (
    <Segmented
      value={value}
      onChange={onChange}
      label={t("interval")}
      options={[
        { value: "month", label: t("monthly") },
        {
          value: "year",
          label: (
            <>
              {t("yearly")}
              <span className={cn("rounded-full px-1.5 text-xs", value === "year" ? "bg-mint text-ink" : "bg-muted")}>{t("twoMonthsFree")}</span>
            </>
          ),
        },
      ]}
    />
  );
}

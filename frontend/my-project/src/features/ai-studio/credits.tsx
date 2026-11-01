"use client";

import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Meter } from "@/components/ui/meter";
import { Card, Skeleton } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import type { AiCredits } from "@/lib/api/client";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAiCredits } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";

// Below this share left, the credits read as running low.
const LOW = 0.15;

export function isLow(c: AiCredits) {
  const total = c.limit + c.bonus;
  return total > 0 && c.remaining / total <= LOW;
}

// "120 credits left" as a small pill: the sidebar, the composer's picker and AI Studio's header.
export function CreditsPill({ className }: { className?: string }) {
  const t = useTranslations("aiStudio.credits");
  const credits = useAiCredits();
  if (!credits.isSuccess) return null;
  const low = isLow(credits.data);
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        low ? "bg-tint-amber text-tint-amber-fg" : "bg-tint-violet text-tint-violet-fg",
        className,
      )}
      title={t("left", { count: credits.data.remaining })}
    >
      <Sparkles className="size-3" aria-hidden />
      {credits.data.remaining}
      <span className="sr-only"> {t("left", { count: credits.data.remaining })}</span>
    </span>
  );
}

// The month's credits with a meter, when they reset, and a way to get more.
export function CreditsCard() {
  const t = useTranslations("aiStudio.credits");
  const locale = useLocale();
  const { user } = useWorkspace();
  const credits = useAiCredits();

  if (credits.isPending) return <Skeleton className="h-28 rounded-xl" />;
  // Blank is not zero (CLAUDE.md rule 10): an unknown balance is said to be unknown.
  if (credits.isError) {
    return (
      <Card className="p-4 text-sm text-muted-foreground" role="status">
        {t("unavailable")}
      </Card>
    );
  }
  const c = credits.data;
  const total = c.limit + c.bonus;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="tabular text-sm">
          <span className="text-lg font-semibold">{c.remaining}</span>
          <span className="text-muted-foreground"> / {total}</span>
        </p>
      </div>
      <Meter value={total ? c.remaining / total : 0} label={t("meter")} valueText={t("left", { count: c.remaining })} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("resets", { date: formatDateTime(c.resetsAt, locale, user.timezone, { dateStyle: "medium" }) })}</span>
        <Link href="/dashboard/settings/billing" className={cn("font-semibold transition-opacity hover:opacity-75", isLow(c) ? "text-tint-amber-fg" : "text-foreground")}>
          {t("getMore")}
        </Link>
      </div>
    </Card>
  );
}

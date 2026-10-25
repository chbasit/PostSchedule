"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CountUp } from "@/components/count-up";
import { Meter } from "@/components/ui/meter";
import { Link } from "@/i18n/navigation";
import type { Post } from "@/lib/api/client";
import { addDays, dayKey, startOfWeek } from "@/lib/time";

const DONE = new Set<Post["status"]>(["published", "partial"]);

// This week's posts: how many, the change from last week, and how many have gone out.
// The number counts up, the meter grows, then the summary slides in.
export function WeekCard({ posts, today, timeZone }: { posts: Post[]; today: string; timeZone: string }) {
  const t = useTranslations("home.week");
  const locale = useLocale();
  const start = startOfWeek(today, locale);
  const end = addDays(start, 7);
  const prevStart = addDays(start, -7);

  const keyOf = (p: Post) => (p.scheduledAt && p.status !== "draft" ? dayKey(p.scheduledAt, timeZone) : null);
  const week = posts.filter((p) => {
    const k = keyOf(p);
    return k !== null && k >= start && k < end;
  });
  const lastWeek = posts.filter((p) => {
    const k = keyOf(p);
    return k !== null && k >= prevStart && k < start;
  }).length;
  const total = week.length;
  const done = week.filter((p) => DONE.has(p.status)).length;
  const left = total - done;
  const diff = total - lastWeek;
  const share = total === 0 ? 0 : done / total;
  const range = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).formatRange(
    new Date(`${start}T12:00:00Z`),
    new Date(`${addDays(end, -1)}T12:00:00Z`),
  );

  return (
    <section aria-labelledby="week-title" className="card-surface p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="week-title" className="font-semibold">
          {t("title")}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">{range}</span>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <p className="text-4xl font-semibold leading-none tracking-tight">
          <CountUp value={total} />
        </p>
        <p className="animate-fade-up pb-0.5 text-xs font-semibold [animation-delay:500ms]">
          {diff === 0 ? (
            <span className="text-muted-foreground">{t("same")}</span>
          ) : (
            <span className={diff > 0 ? "text-success" : "text-muted-foreground"}>
              {t("delta", { change: `${diff > 0 ? "+" : "−"}${Math.abs(diff)}` })}
            </span>
          )}
        </p>
      </div>

      <Meter className="mt-4" value={share} label={t("meter")} valueText={t("percent", { pct: Math.round(share * 100) })} endLabel="100%" />

      <Link
        href={total === 0 ? "/dashboard/create" : "/dashboard/posts/calendar"}
        className="group mt-4 flex animate-fade-up items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm transition-colors [animation-delay:700ms] hover:bg-highlight hover:text-highlight-foreground"
      >
        <span className="min-w-0 truncate">{total === 0 ? t("empty") : t("summary", { done, left })}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </Link>
    </section>
  );
}

import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus, RotateCw } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import { PostStatusChip } from "@/components/status-chip";
import type { PostStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/providers/catalog";

// The feature tabs' Schedule and Manage pictures (founder's call, 2026-11-13: the screenshots
// were too small to read). Drawn in code from the product's own parts, a week of the calendar
// and the posts list with its real status chips, so the text stays sharp at any size. Each is
// one labelled image. Dates are a fixed example week, shown in UTC so every visitor sees the same.

type PostKey = "menu" | "tips" | "team" | "hiring" | "offer" | "recap";

// Monday 16 November 2026.
const WEEK_START = Date.UTC(2026, 10, 16);
const DAY_MS = 86_400_000;
const at = (day: number, hour: number, minute = 0) => new Date(WEEK_START + day * DAY_MS + (hour * 60 + minute) * 60_000);

function Frame({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("w-full rounded-2xl bg-card p-4 text-foreground shadow-card ring-1 ring-black/5 sm:p-5", className)}>{children}</div>;
}

const SLOTS: Array<{ day: number; hour: number; minute?: number; key: PostKey; platforms: PlatformId[]; tint: string; fresh?: boolean }> = [
  { day: 0, hour: 9, key: "menu", platforms: ["instagram", "facebook"], tint: "bg-card-lavender" },
  { day: 0, hour: 17, minute: 30, key: "tips", platforms: ["tiktok"], tint: "bg-card-aqua" },
  { day: 1, hour: 9, key: "team", platforms: ["linkedin"], tint: "bg-card-yellow", fresh: true },
  { day: 2, hour: 12, key: "hiring", platforms: ["linkedin", "bluesky"], tint: "bg-card-salmon" },
  { day: 3, hour: 10, key: "offer", platforms: ["instagram", "tiktok", "youtube"], tint: "bg-card-lavender" },
  { day: 4, hour: 9, minute: 30, key: "recap", platforms: ["facebook", "instagram"], tint: "bg-card-aqua" },
];

export function ScheduleVisual({ label }: { label: string }) {
  const t = useTranslations("marketing.home.visuals");
  const format = useFormatter();
  const locale = useLocale();
  const time = (d: Date) => format.dateTime(d, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const range = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).formatRange(at(0, 0), at(4, 0));
  const fresh = SLOTS.find((s) => s.fresh)!;

  return (
    <div role="img" aria-label={label} className="relative w-full pb-6">
      <Frame>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-card-lavender text-forest">
            <CalendarDays className="size-4" />
          </span>
          <span className="font-heading text-lg font-semibold">{t("calendar")}</span>
          <span className="ms-auto hidden rounded-full bg-muted p-0.5 text-xs font-medium sm:inline-flex">
            <span className="rounded-full px-2.5 py-1 text-muted-foreground">{t("month")}</span>
            <span className="rounded-full bg-forest px-2.5 py-1 text-white">{t("week")}</span>
          </span>
          <span className="ms-auto inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground sm:ms-0">
            <Plus className="size-3.5" /> {t("newPost")}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <ChevronLeft className="size-4 rtl:-scale-x-100" />
          <ChevronRight className="size-4 rtl:-scale-x-100" />
          <span className="ms-1">{range}</span>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((day) => {
            const date = at(day, 0);
            return (
              <li key={day} className={cn("min-h-44 rounded-xl bg-muted/60 p-1.5", day > 2 && "hidden sm:block")}>
                <p className="flex items-baseline justify-between px-1 pt-0.5 pb-2 text-xs text-muted-foreground">
                  {format.dateTime(date, { weekday: "short", timeZone: "UTC" })}
                  <span className={cn("tabular font-heading text-sm font-semibold text-foreground", day === 0 && "inline-flex size-6 items-center justify-center rounded-full bg-forest text-white")}>
                    {format.dateTime(date, { day: "numeric", timeZone: "UTC" })}
                  </span>
                </p>
                <ul className="space-y-1.5">
                  {SLOTS.filter((s) => s.day === day).map((s) => (
                    <li key={s.key} className={cn("rounded-lg p-2 text-forest", s.tint, s.fresh && "ring-2 ring-forest")}>
                      <span className="tabular block text-[11px] font-semibold">{time(at(s.day, s.hour, s.minute))}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs font-medium">{t(`items.${s.key}`)}</span>
                      <span className="mt-1.5 flex -space-x-1">
                        {s.platforms.map((p) => (
                          <PlatformMark key={p} id={p} size="sm" className="rounded-full ring-2 ring-white/70" />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </Frame>
      {/* The confirmation the composer shows after scheduling. */}
      <p className="absolute end-3 bottom-0 inline-flex items-center gap-2 rounded-xl bg-forest px-3.5 py-2.5 text-sm font-medium text-white shadow-card sm:end-8">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-leaf text-forest">
          <Check className="size-3" strokeWidth={3} />
        </span>
        {t("scheduledFor", { when: format.dateTime(at(fresh.day, fresh.hour, fresh.minute), { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) })}
      </p>
    </div>
  );
}

const ROWS: Array<{ key: PostKey; status: PostStatus; day: number; hour: number; minute?: number; platforms: PlatformId[]; thumb: string; tag: { key: "launch" | "team" | "offer" | "photos"; tint: string } }> = [
  { key: "menu", status: "published", day: 0, hour: 9, platforms: ["instagram", "facebook"], thumb: "from-card-lavender to-card-pink", tag: { key: "launch", tint: "bg-card-lavender" } },
  { key: "team", status: "scheduled", day: 1, hour: 9, platforms: ["linkedin"], thumb: "from-card-yellow to-card-salmon", tag: { key: "team", tint: "bg-card-yellow" } },
  { key: "offer", status: "failed", day: 3, hour: 10, platforms: ["instagram", "tiktok", "youtube"], thumb: "from-card-salmon to-card-lavender", tag: { key: "offer", tint: "bg-card-salmon" } },
  { key: "recap", status: "draft", day: 4, hour: 9, minute: 30, platforms: ["facebook", "instagram"], thumb: "from-card-aqua to-card-lavender", tag: { key: "photos", tint: "bg-card-aqua" } },
];

const FILTERS = ["all", "scheduled", "published", "drafts"] as const;

export function ManageVisual({ label }: { label: string }) {
  const t = useTranslations("marketing.home.visuals");
  const format = useFormatter();
  return (
    <div role="img" aria-label={label} className="w-full">
      <Frame>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-heading text-lg font-semibold">{t("posts")}</span>
          <span className="ms-auto flex gap-1 text-xs font-medium">
            {FILTERS.map((f, i) => (
              <span key={f} className={cn("rounded-full px-2.5 py-1", i === 0 ? "bg-forest text-white" : "text-muted-foreground", i > 2 && "hidden sm:inline")}>
                {t(`filters.${f}`)}
              </span>
            ))}
          </span>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {ROWS.map((row) => (
            <li key={row.key} className="flex items-center gap-3 py-3">
              <span className={cn("size-11 shrink-0 rounded-lg bg-linear-to-br", row.thumb)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t(`items.${row.key}`)}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular">{format.dateTime(at(row.day, row.hour, row.minute), { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "UTC" })}</span>
                  <span className={cn("hidden rounded-md px-1.5 py-0.5 font-medium text-forest sm:inline", row.tag.tint)}>{t(`tags.${row.tag.key}`)}</span>
                </span>
              </span>
              <span className="hidden -space-x-1 sm:flex">
                {row.platforms.map((p) => (
                  <PlatformMark key={p} id={p} size="sm" className="rounded-full ring-2 ring-card" />
                ))}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <PostStatusChip status={row.status} />
                {row.status === "failed" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                    <RotateCw className="size-3" /> {t("retry")}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </Frame>
    </div>
  );
}

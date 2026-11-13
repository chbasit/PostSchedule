"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { PlatformMark } from "@/components/platform-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { PostStatusChip } from "@/components/status-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Link } from "@/i18n/navigation";
import type { Post, PostStatus } from "@/lib/api/client";
import { addDays, dayKey, formatTime, utcToZoned, weekdayOf, weekStartDay, zonedToUtc } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/providers/catalog";
import { MediaThumb } from "@/features/posts/media-thumb";
import { PlatformFilter } from "@/features/posts/platform-filter";
import { PostSheet } from "@/features/posts/post-sheet";
import { usePostActions } from "@/features/posts/use-post-actions";
import { useAccounts, usePosts } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { TagList } from "@/features/tags/tag-chip";
import { TagPicker } from "@/features/tags/tag-picker";

type View = "month" | "week" | "list";

function firstOfMonth(key: string) {
  return `${key.slice(0, 7)}-01`;
}
function shiftMonth(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return dt.toISOString().slice(0, 10);
}

// Each status gets a tinted pill; the status itself is also in the accessible name and
// the legend below, so colour never carries the meaning alone.
const PILL: Record<PostStatus, string> = {
  draft: "bg-muted border-s-muted-foreground",
  pending_approval: "bg-tint-violet border-s-tint-violet-fg",
  scheduled: "bg-tint-blue border-s-tint-blue-fg",
  publishing: "bg-tint-blue border-s-tint-blue-fg",
  published: "bg-tint-green border-s-tint-green-fg",
  partial: "bg-tint-amber border-s-tint-amber-fg",
  lapsed: "bg-tint-amber border-s-tint-amber-fg",
  failed: "bg-tint-rose border-s-tint-rose-fg",
  paused: "bg-muted border-s-muted-foreground",
};

// A small card per post (founder's call, 2026-11-13): the platforms and the time, then the
// start of the caption beside the first photo or video, so each post is easy to recognise.
function PostPill({ post, onOpen, draggable }: { post: Post; onOpen: () => void; draggable: boolean }) {
  const locale = useLocale();
  const { user } = useWorkspace();
  const t = useTranslations("status");
  const live = post.targets.filter((tg) => tg.status !== "skipped");
  const thumb = post.media[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/post-id", post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "block w-full rounded-md border-s-[3px] p-1.5 text-start text-xs text-foreground transition-[filter] hover:brightness-95 dark:hover:brightness-125",
        PILL[post.status],
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span className="flex items-center gap-1">
        <span className="flex shrink-0 items-center -space-x-1">
          {live.slice(0, 2).map((tg) => (
            <PlatformMark key={tg.id} id={tg.provider} size="sm" className="rounded-full ring-1 ring-card" />
          ))}
        </span>
        {live.length > 2 ? <span className="font-semibold">+{live.length - 2}</span> : null}
        <span className="tabular ms-auto truncate font-semibold">
          {post.scheduledAt ? formatTime(post.scheduledAt, locale, user.timezone, !user.use24h) : "—"}
        </span>
      </span>
      <span className="mt-1 flex items-start gap-1.5">
        <span className="line-clamp-2 min-w-0 flex-1 leading-snug" dir="auto">
          {post.mainCaption}
        </span>
        {thumb ? <MediaThumb media={thumb} className="pointer-events-none size-9 shrink-0" /> : null}
      </span>
      <span className="sr-only">{t(post.status)}</span>
    </button>
  );
}

export function CalendarView() {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const { user } = useWorkspace();
  const tz = user.timezone;
  const [today] = useState(() => dayKey(new Date(), tz));
  // Phones default to the agenda list (FRONTEND.md §14).
  const [view, setView] = useState<View>(() => (window.matchMedia("(max-width: 767px)").matches ? "list" : "month"));
  const [anchor, setAnchor] = useState(today);
  const [platform, setPlatform] = useState<PlatformId | "">("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const { reschedule } = usePostActions();
  const accounts = useAccounts();
  const first = weekStartDay(locale);

  const days = useMemo(() => {
    if (view === "week") {
      const offset = (weekdayOf(anchor) - first + 7) % 7;
      const start = addDays(anchor, -offset);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = firstOfMonth(anchor);
    const lead = (weekdayOf(start) - first + 7) % 7;
    const gridStart = addDays(start, -lead);
    const nextMonth = shiftMonth(anchor, 1);
    const cells: string[] = [];
    for (let d = gridStart; cells.length < 42; d = addDays(d, 1)) {
      cells.push(d);
      if (cells.length % 7 === 0 && d >= addDays(nextMonth, -1)) break;
    }
    return cells;
  }, [view, anchor, first]);

  const range = useMemo(() => {
    const from = zonedToUtc(days[0], "00:00", tz);
    const to = zonedToUtc(addDays(days[days.length - 1], 1), "00:00", tz);
    return { from: from.ok ? from.utc.toISOString() : undefined, to: to.ok ? to.utc.toISOString() : undefined };
  }, [days, tz]);

  const posts = usePosts({ ...range, tagIds: tagIds.length > 0 ? tagIds : undefined });
  const filtered = (posts.data ?? []).filter(
    (p) => p.scheduledAt && (!platform || p.targets.some((tg) => tg.provider === platform && tg.status !== "skipped")),
  );
  const byDay = new Map<string, Post[]>();
  for (const p of [...filtered].sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))) {
    const k = dayKey(p.scheduledAt!, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }
  const open = posts.data?.find((p) => p.id === openId);

  const weekdayNames = Array.from({ length: 7 }, (_, i) => {
    const key = addDays("2024-01-01", ((first - 1 + i) % 7)); // 2024-01-01 is a Monday
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
  });

  const title =
    view === "week"
      ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).formatRange(
          new Date(`${days[0]}T12:00:00Z`),
          new Date(`${days[6]}T12:00:00Z`),
        )
      : new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor.slice(0, 7)}-15T12:00:00Z`));

  const move = (dir: -1 | 1) => setAnchor((a) => (view === "week" ? addDays(a, 7 * dir) : shiftMonth(a, dir)));

  // Drag keeps the time of day and changes the date; the sheet's Reschedule is the keyboard path.
  function onDrop(day: string, postId: string) {
    const post = posts.data?.find((p) => p.id === postId);
    if (!post?.scheduledAt || reschedule.isPending) return;
    const zone = post.timezone ?? tz;
    const { time } = utcToZoned(new Date(post.scheduledAt), zone);
    const target = zonedToUtc(day, time, zone);
    if (!target.ok || dayKey(post.scheduledAt, tz) === day) return;
    if (day < today) {
      toast.error(t("pastDrop"));
      return;
    }
    // The server rejects a time that has already passed today.
    reschedule.mutate({ post, scheduledAt: target.utc.toISOString() }, { onError: () => toast.error(t("pastDrop")) });
  }

  const movable = (p: Post) => ["scheduled", "pending_approval", "draft"].includes(p.status);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        icon={CalendarDays}
        tint="violet"
        title={t("title")}
        actions={
          <Link href="/dashboard/create" className={buttonVariants()}>
            <Plus aria-hidden /> {t("newPost")}
          </Link>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => move(-1)} aria-label={view === "week" ? t("prevWeek") : t("prevMonth")}>
            <ChevronLeft className="rtl:-scale-x-100" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => move(1)} aria-label={view === "week" ? t("nextWeek") : t("nextMonth")}>
            <ChevronRight className="rtl:-scale-x-100" aria-hidden />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setAnchor(today)}>
            {t("today")}
          </Button>
          <h2 className="ms-2 text-lg font-semibold" aria-live="polite">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            label={t("viewLabel")}
            options={(["month", "week", "list"] as const).map((v) => ({ value: v, label: t(`views.${v}`) }))}
          />
          <PlatformFilter value={platform} onChange={setPlatform} label={t("filterPlatform")} allLabel={t("allPlatforms")} />
          <TagPicker mode="filter" value={tagIds} onChange={setTagIds} />
        </div>
      </div>

      {posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : view === "list" ? (
        posts.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : byDay.size === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={
              <Link href="/dashboard/create" className={buttonVariants()}>
                {t("newPost")}
              </Link>
            }
          />
        ) : (
          <ol className="space-y-6">
            {[...byDay.entries()].map(([day, list]) => (
              <li key={day} className="space-y-2">
                <h3 className={cn("text-sm font-semibold", day === today && "text-coral-strong")}>
                  {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}
                  {day === today ? ` · ${t("today")}` : ""}
                </h3>
                <ul className="divide-y rounded-lg border">
                  {list.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setOpenId(p.id)} className="flex w-full items-center gap-3 p-3 text-start hover:bg-muted/50">
                        <span className="tabular w-20 shrink-0 whitespace-nowrap text-sm font-medium">{formatTime(p.scheduledAt!, locale, tz, !user.use24h)}</span>
                        {p.media[0] ? <MediaThumb media={p.media[0]} className="pointer-events-none size-10 shrink-0 rounded-lg" /> : null}
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="line-clamp-1 text-sm" dir="auto">
                            {p.mainCaption}
                          </span>
                          <TagList tagIds={p.tagIds} max={2} />
                        </span>
                        <span className="hidden items-center gap-1 sm:flex">
                          {p.targets.filter((tg) => tg.status !== "skipped").map((tg) => (
                            <PlatformMark key={tg.id} id={tg.provider} size="sm" />
                          ))}
                        </span>
                        <PostStatusChip status={p.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px] overflow-hidden rounded-lg border">
            <div className="grid grid-cols-7 border-b bg-muted">
              {weekdayNames.map((name) => (
                <div key={name} className="px-2 py-2 text-xs font-medium text-muted-foreground">
                  {name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = view === "week" || day.slice(0, 7) === anchor.slice(0, 7);
                const list = byDay.get(day) ?? [];
                return (
                  <div
                    key={day}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes("text/post-id")) {
                        e.preventDefault();
                        setDropTarget(day);
                      }
                    }}
                    onDragLeave={() => setDropTarget((d) => (d === day ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropTarget(null);
                      onDrop(day, e.dataTransfer.getData("text/post-id"));
                    }}
                    className={cn(
                      "group relative space-y-1 border-b border-e p-1.5 [&:nth-child(7n)]:border-e-0",
                      view === "week" ? "min-h-80" : "min-h-28",
                      !inMonth && "bg-muted/40",
                      dropTarget === day && "bg-highlight",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "tabular inline-flex size-6 items-center justify-center rounded-full text-xs",
                          day === today ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "" : "text-muted-foreground",
                        )}
                        aria-current={day === today ? "date" : undefined}
                      >
                        {Number(day.slice(8))}
                      </span>
                      {day >= today ? (
                        <Link
                          href={{ pathname: "/dashboard/create", query: { date: day } }}
                          className="inline-flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={t("createOn", {
                            date: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)),
                          })}
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </Link>
                      ) : null}
                    </div>
                    {posts.isPending ? (
                      day.endsWith("5") || day.endsWith("2") ? <Skeleton className="h-6 w-full" /> : null
                    ) : (
                      list.slice(0, view === "week" ? 20 : 3).map((p) => (
                        <PostPill key={p.id} post={p} onOpen={() => setOpenId(p.id)} draggable={movable(p)} />
                      ))
                    )}
                    {view === "month" && list.length > 3 ? (
                      <button
                        type="button"
                        className="rounded px-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setAnchor(day);
                          setView("week");
                        }}
                      >
                        {t("more", { count: list.length - 3 })}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{t("legend")}</span>
        {(["draft", "pending_approval", "scheduled", "published", "partial", "failed"] as const).map((s) => (
          <PostStatusChip key={s} status={s} className="h-5" />
        ))}
      </p>
      <p className="text-xs text-muted-foreground">{t("dragHint")}</p>

      {open ? <PostSheet post={open} accounts={accounts.data ?? []} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

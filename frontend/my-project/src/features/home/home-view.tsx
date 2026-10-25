"use client";

import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  CircleAlert,
  Plus,
  RefreshCw,
  Send,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Banner } from "@/components/banner";
import { CountUp } from "@/components/count-up";
import { BarList } from "@/components/charts/bar-list";
import { ChartCard, ChartTable, Legend } from "@/components/charts/chart-card";
import { ColumnChart, type Column } from "@/components/charts/column-chart";
import { PlatformMark } from "@/components/platform-badge";
import { PostStatusChip } from "@/components/status-chip";
import { EmptyState, ErrorState } from "@/components/states";
import { tints, type Tint } from "@/components/tint";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import type { Post, PostStatus } from "@/lib/api/client";
import { addDays, dayKey, formatDayKey, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getPlatform, PLATFORMS, type PlatformId } from "@/providers/catalog";
import { PostSheet } from "@/features/posts/post-sheet";
import { CaptionExcerpt, PlatformStack } from "@/features/posts/post-summary";
import { TagList } from "@/features/tags/tag-chip";
import { usePostActions } from "@/features/posts/use-post-actions";
import { useAccounts, usePosts } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { WeekCard } from "./week-card";

const DAY = 86_400_000;
const UPCOMING: PostStatus[] = ["scheduled", "pending_approval", "publishing"];

function greetingKey(timeZone: string, now: number): "morning" | "afternoon" | "evening" {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date(now)));
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

// Stat tile: label, value in proportional figures, and the period it covers (dataviz figure contract).
function StatTile({
  label,
  hint,
  value,
  href,
  icon: Icon,
  tint,
  index,
}: {
  label: string;
  hint: string;
  value: number | undefined;
  href: string;
  icon: LucideIcon;
  tint: Tint;
  // Position in the row, for the staggered entrance.
  index: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(
        "group flex animate-fade-up flex-col gap-2.5 rounded-xl border p-4 transition-[filter,translate] duration-200 hover:-translate-y-0.5 hover:brightness-[0.97] dark:hover:brightness-110",
        tints[tint].surface,
        tints[tint].line,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span aria-hidden className={cn("inline-flex size-9 items-center justify-center rounded-lg bg-card transition-transform duration-200 group-hover:scale-105", tints[tint].fg)}>
          <Icon className="size-5" />
        </span>
      </div>
      {value === undefined ? (
        <Skeleton className="h-9 w-12 bg-card/70" />
      ) : (
        <p className="text-4xl font-semibold leading-none text-foreground">
          <CountUp value={value} />
        </p>
      )}
      <p className="text-sm text-muted-foreground">{hint}</p>
    </Link>
  );
}

function Checklist({ accounts, posts }: { accounts: number; posts: Post[] }) {
  const t = useTranslations("home.checklist");
  const steps = [
    { key: "connect" as const, done: accounts > 0, href: "/dashboard/settings/accounts" },
    { key: "upload" as const, done: posts.some((p) => p.media.length > 0), href: "/dashboard/create" },
    { key: "schedule" as const, done: posts.some((p) => ["scheduled", "published", "partial", "publishing"].includes(p.status)), href: "/dashboard/create" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section aria-labelledby="checklist-title" className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="checklist-title" className="font-semibold">
          {t("title")}
        </h2>
        <span className="text-sm font-medium text-muted-foreground">{t("progress", { done, total: steps.length })}</span>
      </div>
      {/* Meter: fill and track are two steps of the same hue. */}
      <div
        role="progressbar"
        aria-label={t("meter")}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        className="mt-3 h-2 overflow-hidden rounded-full bg-progress-track"
      >
        <div
          className="h-full animate-grow-x rounded-full bg-linear-to-r from-progress-from to-progress-to transition-[width] duration-500 rtl:bg-linear-to-l"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.key}>
            <Link href={s.href} className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-muted">
              {s.done ? (
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-tint-green text-tint-green-fg">
                  <Check className="size-4" aria-hidden />
                </span>
              ) : (
                <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-input" aria-hidden />
              )}
              <span className={cn("flex-1", s.done ? "text-muted-foreground line-through" : "font-medium")}>{t(s.key)}</span>
              <span className="sr-only">{s.done ? t("done") : t("todo")}</span>
              {!s.done ? <ArrowRight className="size-4 text-muted-foreground rtl:-scale-x-100" aria-hidden /> : null}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

const PIPELINE: Array<{ status: PostStatus; href: string }> = [
  { status: "draft", href: "/dashboard/posts?tab=draft" },
  { status: "pending_approval", href: "/dashboard/posts?tab=scheduled" },
  { status: "scheduled", href: "/dashboard/posts?tab=scheduled" },
  { status: "published", href: "/dashboard/posts?tab=posted" },
  { status: "partial", href: "/dashboard/posts" },
  { status: "failed", href: "/dashboard/posts" },
  { status: "lapsed", href: "/dashboard/posts" },
];

function Pipeline({ posts }: { posts: Post[] }) {
  const t = useTranslations("home.pipeline");
  const counts = new Map<PostStatus, number>();
  for (const p of posts) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
  // The first four always show; problem states only when there are some.
  const items = PIPELINE.filter((p, i) => i < 4 || (counts.get(p.status) ?? 0) > 0);
  return (
    <section aria-labelledby="pipeline-title" className="rounded-xl border bg-card p-5">
      <h2 id="pipeline-title" className="font-semibold">
        {t("title")}
      </h2>
      <ul className="mt-4 space-y-2">
        {items.map(({ status, href }) => (
          <li key={status}>
            <Link href={href} className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
              <PostStatusChip status={status} />
              <span className="text-lg font-semibold">{counts.get(status) ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeView() {
  const t = useTranslations("home");
  const locale = useLocale();
  const { user, workspace } = useWorkspace();
  const posts = usePosts();
  const accounts = useAccounts();
  const { retry } = usePostActions();
  const [openId, setOpenId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const tz = user.timezone;
  const today = dayKey(new Date(now), tz);

  const all = useMemo(() => posts.data ?? [], [posts.data]);
  const loaded = posts.isSuccess;

  const upcoming = useMemo(
    () =>
      all
        .filter((p) => UPCOMING.includes(p.status) && p.scheduledAt && Date.parse(p.scheduledAt) > now)
        .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!)),
    [all, now],
  );
  const attention = all.filter((p) => p.status === "failed" || p.status === "partial" || p.status === "lapsed");
  const thisWeek = upcoming.filter((p) => Date.parse(p.scheduledAt!) < now + 7 * DAY).length;
  const review = all.filter((p) => p.status === "pending_approval").length;
  const publishedWeek = all.filter(
    (p) => (p.status === "published" || p.status === "partial") && p.scheduledAt && now - Date.parse(p.scheduledAt) < 7 * DAY,
  ).length;
  const open = all.find((p) => p.id === openId);

  // Posting plan: one column per day, the last 7 days as context and today onwards as the accent.
  const columns = useMemo<Column[]>(() => {
    const perDay = new Map<string, number>();
    for (const p of all) {
      if (p.status === "draft" || !p.scheduledAt) continue;
      const key = dayKey(p.scheduledAt, tz);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 7));
    const peak = Math.max(0, ...days.map((d) => perDay.get(d) ?? 0));
    let peakLabelled = false;
    return days.map((key) => {
      const value = perDay.get(key) ?? 0;
      const isPeak = value === peak && value > 0 && !peakLabelled;
      if (isPeak) peakLabelled = true;
      return {
        key,
        value,
        tone: key < today ? "context" : "accent",
        current: key === today,
        showValue: isPeak || (key === today && value > 0),
        label: formatDayKey(key, locale, { weekday: "short", day: "numeric", month: "short" }),
        valueText: t("activity.count", { count: value }),
        tick: (
          <>
            <span className="block">{formatDayKey(key, locale, { weekday: "narrow" })}</span>
            <span className="block">{formatDayKey(key, locale, { day: "numeric" })}</span>
          </>
        ),
      };
    });
  }, [all, tz, today, locale, t]);

  // Upcoming targets per platform, biggest first.
  const platformRows = useMemo(() => {
    const perPlatform = new Map<PlatformId, number>();
    for (const p of upcoming) {
      for (const tg of p.targets) {
        if (tg.status === "skipped") continue;
        perPlatform.set(tg.provider, (perPlatform.get(tg.provider) ?? 0) + 1);
      }
    }
    return PLATFORMS.filter((p) => perPlatform.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, value: perPlatform.get(p.id)! }))
      .sort((a, b) => b.value - a.value);
  }, [upcoming]);

  const firstName = user.displayName.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-2xl bg-ink p-5 text-white sm:p-6">
        <svg aria-hidden viewBox="0 0 200 200" className="absolute -inset-e-12 -top-14 -z-10 size-32 animate-fade-in sm:-inset-e-14 sm:-top-20 sm:size-72">
          <circle cx="100" cy="100" r="100" fill="var(--brand-sky)" />
        </svg>
        <svg aria-hidden viewBox="0 0 200 200" className="absolute -bottom-24 inset-e-36 -z-10 hidden size-52 animate-fade-in md:block">
          <circle cx="100" cy="100" r="88" fill="none" stroke="var(--brand-mint)" strokeWidth="18" />
        </svg>
        <div className="max-w-xl space-y-2.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(`greeting.${greetingKey(tz, now)}`, { name: firstName })}</h1>
          <p className="text-base text-white/90">
            {loaded ? t("hero.summary", { count: thisWeek, workspace: workspace.name }) : t("workspaceLine", { workspace: workspace.name })}
          </p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <Link href="/dashboard/create" className={buttonVariants({ variant: "sky" })}>
              <Plus aria-hidden /> {t("newPost")}
            </Link>
            <Link href="/dashboard/posts/calendar" className={cn(buttonVariants({ variant: "secondary" }), "border-white/70 text-white hover:bg-white/10")}>
              <CalendarDays aria-hidden /> {t("openCalendar")}
            </Link>
          </div>
        </div>
      </section>

      {!user.emailVerified ? (
        <Banner
          tone="info"
          action={
            <Link href="/verify-email" className="shrink-0 rounded-md px-2.5 py-1 font-semibold transition-colors hover:bg-current/10">
              {t("verifyAction")}
            </Link>
          }
        >
          {t("verifyBanner")}
        </Banner>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label={t("stats.thisWeek")} hint={t("stats.thisWeekHint")} value={loaded ? thisWeek : undefined} href="/dashboard/posts/calendar" icon={CalendarClock} tint="blue" />
        <StatTile index={1} label={t("stats.review")} hint={t("stats.reviewHint")} value={loaded ? review : undefined} href="/dashboard/posts?tab=scheduled" icon={UserCheck} tint="violet" />
        <StatTile index={2} label={t("stats.published")} hint={t("stats.publishedHint")} value={loaded ? publishedWeek : undefined} href="/dashboard/posts?tab=posted" icon={Send} tint="green" />
        <StatTile
          index={3}
          label={t("stats.attention")}
          hint={t("stats.attentionHint")}
          value={loaded ? attention.length : undefined}
          href="/dashboard/posts"
          icon={CircleAlert}
          tint={attention.length > 0 ? "rose" : "peach"}
        />
      </div>

      {posts.isError ? <ErrorState error={posts.error} onRetry={() => posts.refetch()} /> : null}

      {/* Needs attention */}
      {attention.length > 0 ? (
        <section aria-labelledby="attention-title" className="rounded-xl border border-tint-amber-line bg-tint-amber p-4 sm:p-5">
          <h2 id="attention-title" className="flex items-center gap-2 font-semibold">
            <CircleAlert className="size-5 text-tint-amber-fg" aria-hidden />
            {t("attentionTitle")}
          </h2>
          <ul className="mt-3 space-y-2">
            {attention.map((post) => (
              <li key={post.id} className="flex flex-col gap-3 rounded-lg bg-card p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PostStatusChip status={post.status} />
                    <PlatformStack post={post} />
                    {post.scheduledAt ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDayKey(dayKey(post.scheduledAt, tz), locale, { day: "numeric", month: "short" })} ·{" "}
                        {formatTime(post.scheduledAt, locale, tz, !user.use24h)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm">
                    {post.status === "lapsed" ? t("lapsedReason") : (post.targets.find((tg) => tg.status === "failed")?.errorMessage ?? t("failedReason"))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" loading={retry.isPending && retry.variables?.id === post.id} onClick={() => !retry.isPending && retry.mutate(post)}>
                    {post.status === "lapsed" ? <Send aria-hidden /> : <RefreshCw aria-hidden />}
                    {post.status === "lapsed" ? t("publishNow") : t("retry")}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setOpenId(post.id)}>
                    {t("details")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <ChartCard
            title={t("activity.title")}
            subtitle={t("activity.subtitle")}
            legend={
              <Legend
                items={[
                  { label: t("activity.legendPast"), swatch: "bg-chart-context" },
                  { label: t("activity.legendUpcoming"), swatch: "bg-chart-1" },
                ]}
              />
            }
            table={<ChartTable headers={[t("activity.tableDate"), t("activity.tablePosts")]} rows={columns.map((c) => [c.label, c.value])} />}
          >
            {loaded ? <ColumnChart columns={columns} /> : <Skeleton className="h-52 w-full" />}
          </ChartCard>

          {/* Coming up */}
          <section aria-labelledby="upcoming-title" className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="upcoming-title" className="font-semibold">
                {t("upcomingTitle")}
              </h2>
              <Link
                href="/dashboard/posts/calendar"
                className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold transition-colors hover:bg-muted"
              >
                {t("openCalendar")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
              </Link>
            </div>
            {posts.isPending ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={CalendarClock}
                title={t("upcomingEmptyTitle")}
                description={t("upcomingEmptyBody")}
                action={
                  <Link href="/dashboard/create" className={buttonVariants()}>
                    {t("newPost")}
                  </Link>
                }
              />
            ) : (
              <ul className="mt-4 space-y-2">
                {upcoming.slice(0, 6).map((post) => {
                  const key = dayKey(post.scheduledAt!, tz);
                  return (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(post.id)}
                        className="flex w-full items-center gap-4 rounded-lg border p-3 text-start transition-colors hover:bg-muted"
                      >
                        <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-tint-blue py-1.5 text-tint-blue-fg">
                          <span className="text-xs font-semibold uppercase">{formatDayKey(key, locale, { weekday: "short" })}</span>
                          <span className="text-xl font-bold leading-tight">{formatDayKey(key, locale, { day: "numeric" })}</span>
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block text-sm">
                            <CaptionExcerpt post={post} />
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-medium text-muted-foreground">{formatTime(post.scheduledAt!, locale, tz, !user.use24h)}</span>
                            <TagList tagIds={post.tagIds} max={2} />
                          </span>
                        </span>
                        <span className="hidden flex-col items-end gap-2 sm:flex">
                          <PostStatusChip status={post.status} />
                          <PlatformStack post={post} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          {loaded ? <WeekCard posts={all} today={today} timeZone={tz} /> : <Skeleton className="h-56 w-full rounded-xl" />}
          {loaded && accounts.isSuccess ? <Checklist accounts={accounts.data.length} posts={all} /> : null}

          <ChartCard
            title={t("platforms.title")}
            subtitle={t("platforms.subtitle")}
            table={
              <ChartTable
                headers={[t("platforms.tablePlatform"), t("platforms.tablePosts")]}
                rows={platformRows.map((r) => [r.name, r.value])}
              />
            }
          >
            {!loaded ? (
              <Skeleton className="h-40 w-full" />
            ) : platformRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("platforms.empty")}</p>
            ) : (
              <BarList
                rows={platformRows.map((r) => ({
                  key: r.id,
                  value: r.value,
                  srLabel: `${r.name}: ${t("activity.count", { count: r.value })}`,
                  label: (
                    <>
                      <PlatformMark id={r.id} size="sm" />
                      <span className="truncate font-medium">{getPlatform(r.id).name}</span>
                    </>
                  ),
                }))}
              />
            )}
          </ChartCard>

          {loaded ? <Pipeline posts={all} /> : <Skeleton className="h-64 w-full rounded-xl" />}
        </div>
      </div>

      {open ? <PostSheet post={open} accounts={accounts.data ?? []} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

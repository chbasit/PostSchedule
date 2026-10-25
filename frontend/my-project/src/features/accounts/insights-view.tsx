"use client";

import { ArrowDown, ArrowUp, ChevronDown, Download, ExternalLink, FileSpreadsheet, FileText, Minus, Plus, Printer, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChartCard, ChartTable } from "@/components/charts/chart-card";
import { ColumnChart, type Column } from "@/components/charts/column-chart";
import { CountUp } from "@/components/count-up";
import { ErrorState } from "@/components/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { PRODUCT_NAME } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { isRtl } from "@/i18n/routing";
import type { AccountInsights, InsightPost, InsightsRange, SocialAccount } from "@/lib/api/client";
import { formatDateTime, formatDayKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getPlatform, type InsightMetric } from "@/providers/catalog";
import { PostSheet } from "@/features/posts/post-sheet";
import { PostsView } from "@/features/posts/posts-list";
import { TYPE_ICON } from "@/features/posts/post-summary";
import { useAccountInsights, useAccounts, usePosts } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { AccountHeader, AccountPage } from "./account-page";
import { download, printReport, reportFileBase, toCsv, toMarkdown, type Report } from "./export";
import { postColumns, rateBase, useFormatMetric, useMetricLabel } from "./metrics";

const RANGES = ["7", "30", "90"] as const;

function NewPostLink({ account }: { account: SocialAccount }) {
  const t = useTranslations("insights");
  return (
    <Link href={`/dashboard/create?account=${account.id}`} className={buttonVariants()}>
      <Plus aria-hidden /> {t("newPost")}
    </Link>
  );
}

// /dashboard/accounts/[id]
export function AccountInsightsScreen() {
  return <AccountPage>{(account) => <AccountInsightsView account={account} />}</AccountPage>;
}

// /dashboard/accounts/[id]/posts
export function AccountPostsScreen() {
  return (
    <AccountPage>
      {(account) => <PostsView accountId={account.id} header={<AccountHeader account={account} actions={<NewPostLink account={account} />} />} />}
    </AccountPage>
  );
}

function AccountInsightsView({ account }: { account: SocialAccount }) {
  const t = useTranslations("insights");
  const [days, setDays] = useState<InsightsRange>(30);
  const insights = useAccountInsights(account.id, days);
  const data = insights.data;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <AccountHeader
        account={account}
        actions={
          <>
            <ExportMenu account={account} data={data} days={days} />
            <NewPostLink account={account} />
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          size="sm"
          label={t("range.label")}
          value={String(days) as (typeof RANGES)[number]}
          onChange={(v) => setDays(Number(v) as InsightsRange)}
          options={RANGES.map((r) => ({ value: r, label: t(`range.${r}`) }))}
        />
        {data ? <Updated iso={data.syncedAt} /> : null}
      </div>

      {insights.isError && !data ? (
        <ErrorState error={insights.error} onRetry={() => insights.refetch()} />
      ) : !data ? (
        <InsightsSkeleton />
      ) : (
        <div className={cn("space-y-6 transition-opacity duration-200", insights.isPlaceholderData && "opacity-60")} aria-busy={insights.isFetching}>
          <Summary account={account} data={data} days={days} />
          <Trend account={account} data={data} days={days} />
          <PostsTable account={account} data={data} days={days} />
        </div>
      )}
    </div>
  );
}

function Updated({ iso }: { iso: string }) {
  const t = useTranslations("insights");
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  const hours = Math.round(minutes / 60);
  const when =
    Math.abs(minutes) < 60 ? rtf.format(minutes, "minute") : Math.abs(hours) < 24 ? rtf.format(hours, "hour") : rtf.format(Math.round(hours / 24), "day");
  return <p className="text-sm text-muted-foreground">{t("updated", { time: when })}</p>;
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function usePeriodText(data: AccountInsights) {
  const locale = useLocale();
  const day = (key: string) => formatDayKey(key, locale, { day: "numeric", month: "short", year: "numeric" });
  return { from: day(data.from), to: day(data.to), previousFrom: day(data.previousFrom), previousTo: day(data.previousTo) };
}

// --- Summary --------------------------------------------------------------------------

function Change({ metric, value, previous, days }: { metric: InsightMetric; value: number; previous: number; days: number }) {
  const t = useTranslations("insights");
  const locale = useLocale();
  const delta = value - previous;
  const dir = delta > 0 ? "up" : delta < 0 ? "down" : "same";
  let text: string;
  if (delta === 0) text = t("change.none");
  else if (metric === "followers") text = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" }).format(delta);
  else if (metric === "engagementRate")
    text = t("points", { value: new Intl.NumberFormat(locale, { signDisplay: "exceptZero", maximumFractionDigits: 2 }).format(delta) });
  else if (previous === 0) text = value > 0 ? t("change.new") : t("change.none");
  else text = new Intl.NumberFormat(locale, { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 1 }).format(delta / previous);
  const Icon = previous === 0 && value > 0 && metric !== "followers" && metric !== "engagementRate" ? Sparkles : dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", dir === "up" ? "text-success" : dir === "down" ? "text-danger" : "text-muted-foreground")}>
        <Icon className="size-3.5" aria-hidden />
        {text}
      </span>
      <span className="text-muted-foreground">{t("vsPrevious", { days })}</span>
    </p>
  );
}

function Summary({ account, data, days }: { account: SocialAccount; data: AccountInsights; days: number }) {
  const t = useTranslations("insights");
  const label = useMetricLabel(account.provider);
  const format = useFormatMetric();
  const period = usePeriodText(data);
  const metrics = getPlatform(account.provider).insights.metrics;

  return (
    <section aria-labelledby="insights-summary" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="insights-summary" className="text-lg font-semibold">
          {t("summary")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("period", period)}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const total = data.totals[metric];
          if (!total) return null;
          return (
            <li key={metric} className="rounded-xl border bg-card p-4">
              <p className="truncate text-sm font-medium">{label(metric)}</p>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight">
                {metric === "engagementRate" ? format(metric, total.value) : <CountUp value={total.value} />}
              </p>
              <Change metric={metric} value={total.value} previous={total.previous} days={days} />
            </li>
          );
        })}
      </ul>
      {metrics.includes("engagementRate") ? (
        <p className="text-xs text-muted-foreground">{t("rateNote", { base: t(`rateBase.${rateBase(account.provider)}`) })}</p>
      ) : null}
    </section>
  );
}

// --- Trend ----------------------------------------------------------------------------

type TrendKey = "newFollowers" | "posts" | "engagements";
type Bucket = { date: string; newFollowers: number; posts: number; engagements: number };

// 90 days read better as weekly columns.
function weekly(daily: AccountInsights["daily"]): Bucket[] {
  const out: Bucket[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const week = daily.slice(i, i + 7);
    out.push({
      date: week[0].date,
      newFollowers: week.reduce((s, d) => s + d.newFollowers, 0),
      posts: week.reduce((s, d) => s + d.posts, 0),
      engagements: week.reduce((s, d) => s + d.engagements, 0),
    });
  }
  return out;
}

function Trend({ account, data, days }: { account: SocialAccount; data: AccountInsights; days: number }) {
  const t = useTranslations("insights.chart");
  const label = useMetricLabel(account.provider);
  const locale = useLocale();
  const [metric, setMetric] = useState<TrendKey>("newFollowers");
  const number = new Intl.NumberFormat(locale);
  const subscribers = getPlatform(account.provider).insights.terms?.followers === "subscribers";
  const options: Array<{ value: TrendKey; label: string }> = [
    { value: "newFollowers", label: subscribers ? t("newSubscribers") : t("newFollowers") },
    { value: "posts", label: label("posts") },
    { value: "engagements", label: t("engagements") },
  ];
  const byWeek = days === 90;
  const buckets: Bucket[] = byWeek ? weekly(data.daily) : data.daily;
  // Label every column for a week, every fifth day for a month, every other week for 90 days,
  // counting back from today so the latest column is always labelled.
  const every = days === 7 ? 1 : byWeek ? 2 : 5;
  const short = (key: string) => formatDayKey(key, locale, { day: "numeric", month: "short" });
  const columns: Column[] = buckets.map((b, i) => ({
    key: b.date,
    value: b[metric],
    tone: "accent",
    // Centred on its column and kept on one line, overflowing evenly into its neighbours.
    tick:
      (buckets.length - 1 - i) % every === 0 ? (
        <span className="flex justify-center">
          <span className="whitespace-nowrap">{short(b.date)}</span>
        </span>
      ) : (
        ""
      ),
    label: byWeek ? t("week", { date: short(b.date) }) : formatDayKey(b.date, locale, { weekday: "short", day: "numeric", month: "short" }),
    valueText: number.format(b[metric]),
    current: i === buckets.length - 1,
  }));
  const selected = options.find((o) => o.value === metric)!.label;

  return (
    <ChartCard
      title={selected}
      subtitle={byWeek ? t("perWeek", { days }) : t("perDay", { days })}
      controls={<Segmented size="sm" label={t("label")} value={metric} onChange={setMetric} options={options} />}
      table={<ChartTable headers={[t("tableDate"), selected]} rows={columns.map((c) => [c.label, c.valueText])} />}
    >
      <ColumnChart columns={columns} height="h-52" />
    </ChartCard>
  );
}

// --- Per-post table -------------------------------------------------------------------

type SortKey = "publishedAt" | InsightMetric;

function SortHeader({
  label,
  sortLabel,
  active,
  desc,
  align,
  onSort,
}: {
  label: string;
  sortLabel: string;
  active: boolean;
  desc: boolean;
  align: "start" | "end";
  onSort: () => void;
}) {
  return (
    <th scope="col" aria-sort={active ? (desc ? "descending" : "ascending") : "none"} className={cn("px-4 py-2.5 font-medium", align === "end" ? "text-end" : "text-start")}>
      <button type="button" onClick={onSort} title={sortLabel} className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground">
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", active ? "opacity-100" : "opacity-30", active && !desc && "rotate-180")} aria-hidden />
      </button>
    </th>
  );
}

function PostCell({ post, onOpen }: { post: InsightPost; onOpen?: () => void }) {
  const t = useTranslations("insights");
  const tp = useTranslations("posts");
  const locale = useLocale();
  const { user } = useWorkspace();
  const Icon = TYPE_ICON[post.type];
  const body: ReactNode = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={tp(`types.${post.type}`)} />
      <span className="min-w-0 space-y-1">
        <span className="line-clamp-2 break-words" dir="auto">
          {post.caption}
        </span>
        <span className="block text-xs text-muted-foreground">
          {formatDateTime(post.publishedAt, locale, user.timezone, { dateStyle: "medium", timeStyle: "short", hour12: !user.use24h })}
          {post.postId ? null : ` · ${t("outside", { product: PRODUCT_NAME })}`}
        </span>
      </span>
    </>
  );
  const box = "flex items-start gap-3 rounded text-start";
  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={box}>
        {body}
      </button>
    );
  }
  if (post.url) {
    return (
      <a href={post.url} target="_blank" rel="noopener noreferrer" className={box}>
        {body}
        <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label={t("openExternal")} />
      </a>
    );
  }
  return <span className={box}>{body}</span>;
}

function PostsTable({ account, data, days }: { account: SocialAccount; data: AccountInsights; days: number }) {
  const t = useTranslations("insights");
  const label = useMetricLabel(account.provider);
  const format = useFormatMetric();
  const columns = postColumns(account.provider);
  const posts = usePosts();
  const accounts = useAccounts();
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "publishedAt", desc: true });
  const [openId, setOpenId] = useState<string | null>(null);
  const open = posts.data?.find((p) => p.id === openId);

  const rows = useMemo(() => {
    const value = (p: InsightPost) => (sort.key === "publishedAt" ? Date.parse(p.publishedAt) : (p.metrics[sort.key] ?? -1));
    return [...data.posts].sort((a, b) => (sort.desc ? value(b) - value(a) : value(a) - value(b)));
  }, [data.posts, sort]);

  // A new column sorts highest first; the same column flips.
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));

  return (
    <section aria-labelledby="insights-posts" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="insights-posts" className="text-lg font-semibold">
          {t("postsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("postsCount", { count: rows.length })}</p>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">{t("noPosts", { days })}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("noPostsBody")}</p>
          <NewPostLink account={account} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-160 text-sm">
            <caption className="sr-only">{t("postsTitle")}</caption>
            <thead className="bg-muted">
              <tr>
                <SortHeader
                  label={t("post")}
                  sortLabel={t("sortByDate")}
                  active={sort.key === "publishedAt"}
                  desc={sort.desc}
                  align="start"
                  onSort={() => sortBy("publishedAt")}
                />
                {columns.map((m) => (
                  <SortHeader
                    key={m}
                    label={label(m)}
                    sortLabel={t("sortBy", { metric: label(m) })}
                    active={sort.key === m}
                    desc={sort.desc}
                    align="end"
                    onSort={() => sortBy(m)}
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={`${p.postId ?? "outside"}-${p.publishedAt}`} className="hover:bg-muted/50">
                  <td className="max-w-sm px-4 py-3">
                    <PostCell post={p} onOpen={p.postId && posts.data?.some((x) => x.id === p.postId) ? () => setOpenId(p.postId) : undefined} />
                  </td>
                  {columns.map((m) => (
                    <td key={m} className={cn("tabular whitespace-nowrap px-4 py-3 text-end", sort.key === m && "font-semibold")}>
                      {p.metrics[m] === undefined ? "–" : format(m, p.metrics[m])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? <PostSheet post={open} accounts={accounts.data ?? []} onClose={() => setOpenId(null)} /> : null}
    </section>
  );
}

// --- Export ---------------------------------------------------------------------------

function ExportMenu({ account, data, days }: { account: SocialAccount; data: AccountInsights | undefined; days: number }) {
  const t = useTranslations("insights.export");
  const ti = useTranslations("insights");
  const locale = useLocale();
  const { user } = useWorkspace();
  const label = useMetricLabel(account.provider);
  const format = useFormatMetric();
  const platform = getPlatform(account.provider);

  function build(d: AccountInsights): Report {
    const day = (key: string) => formatDayKey(key, locale, { day: "numeric", month: "short", year: "numeric" });
    const columns = postColumns(account.provider);
    const when = (iso: string) => formatDateTime(iso, locale, user.timezone, { dateStyle: "medium", timeStyle: "short", hour12: !user.use24h });
    return {
      fileBase: reportFileBase(account.displayName, platform.name, d.from, d.to),
      locale,
      dir: isRtl(locale) ? "rtl" : "ltr",
      title: t("title", { account: account.displayName, platform: platform.name }),
      periodLine: t("periodLine", { from: day(d.from), to: day(d.to), previousFrom: day(d.previousFrom), previousTo: day(d.previousTo) }),
      exportedLine: t("exported", { date: when(new Date().toISOString()), product: PRODUCT_NAME }),
      summaryTitle: ti("summary"),
      postsTitle: ti("postsTitle"),
      emptyPosts: ti("noPosts", { days }),
      headers: {
        metric: t("metric"),
        thisPeriod: t("thisPeriod"),
        previousPeriod: t("previousPeriod"),
        post: ti("post"),
        published: t("published"),
        link: t("link"),
      },
      summary: platform.insights.metrics.flatMap((m) => {
        const total = d.totals[m];
        return total ? [{ label: label(m), value: format(m, total.value), previous: format(m, total.previous) }] : [];
      }),
      columns: columns.map(label),
      rawColumns: columns.map((m) => (m === "engagementRate" ? `${label(m)} (%)` : label(m))),
      posts: d.posts.map((p) => ({
        caption: p.caption,
        published: when(p.publishedAt),
        publishedIso: p.publishedAt,
        link: p.url,
        values: columns.map((m) => (p.metrics[m] === undefined ? "–" : format(m, p.metrics[m]))),
        raw: columns.map((m) => p.metrics[m] ?? null),
      })),
    };
  }

  function save(kind: "csv" | "md") {
    if (!data) return;
    const report = build(data);
    const file = `${report.fileBase}.${kind}`;
    if (kind === "csv") download(file, toCsv(report), "text/csv;charset=utf-8");
    else download(file, toMarkdown(report), "text/markdown;charset=utf-8");
    toast.success(t("done", { file }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" disabled={!data} className="group">
          <Download aria-hidden /> {t("label")}
          <ChevronDown className="transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={() => save("csv")}>
          <FileSpreadsheet aria-hidden /> {t("csv")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => save("md")}>
          <FileText aria-hidden /> {t("markdown")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => data && printReport(build(data))} className="items-start">
          <Printer className="mt-0.5" aria-hidden />
          <span className="flex flex-col">
            {t("pdf")}
            <span className="text-xs text-muted-foreground">{t("pdfHint")}</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

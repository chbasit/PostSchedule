"use client";

import { FilePen, Layers, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { PostStatusChip } from "@/components/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import type { PostStatus } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/providers/catalog";
import { useAccounts, usePosts } from "@/features/session/queries";
import { TagList } from "@/features/tags/tag-chip";
import { TagPicker } from "@/features/tags/tag-picker";
import { PlatformFilter } from "./platform-filter";
import { PostSheet } from "./post-sheet";
import { CaptionExcerpt, PlatformStack, PostWhen, TYPE_ICON } from "./post-summary";

export type PostsTab = "all" | "scheduled" | "posted" | "draft";

const TAB_STATUS: Record<PostsTab, PostStatus[] | undefined> = {
  all: undefined,
  scheduled: ["scheduled", "pending_approval", "publishing"],
  posted: ["published", "partial"],
  draft: ["draft"],
};

const TABS = Object.keys(TAB_STATUS) as PostsTab[];

function isTab(value: string | null): value is PostsTab {
  return (TABS as Array<string | null>).includes(value);
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

type ListProps = {
  tab: PostsTab;
  initialQuery: string;
  // One account's posts (its Posts page): no platform filter, and its own header.
  accountId?: string;
  header?: ReactNode;
};

function PostsList({ tab, initialQuery, accountId, header }: ListProps) {
  const t = useTranslations("posts");
  const tn = useTranslations("nav.items");
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState<PlatformId | "">("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const q = useDebounced(query.trim(), 300);
  const posts = usePosts({ status: TAB_STATUS[tab], q: q || undefined, tagIds: tagIds.length > 0 ? tagIds : undefined });
  const filtering = !!q || !!platform || tagIds.length > 0;
  const accounts = useAccounts();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useDeferredValue(
    (posts.data ?? []).filter((p) =>
      accountId
        ? p.targets.some((tg) => tg.socialAccountId === accountId && tg.status !== "skipped")
        : !platform || p.targets.some((tg) => tg.provider === platform && tg.status !== "skipped"),
    ),
  );
  const newPostHref = accountId ? `/dashboard/create?account=${accountId}` : "/dashboard/create";
  const open = posts.data?.find((p) => p.id === openId);

  const tabLabel: Record<PostsTab, string> = {
    all: tn("allPosts"),
    scheduled: tn("scheduled"),
    posted: tn("posted"),
    draft: tn("drafts"),
  };

  // The tabs are ?tab= on the one Posts route. Switching goes through the History API, so
  // the list, search and filters stay mounted instead of loading another page.
  const pathname = usePathname();
  const params = useSearchParams();
  function tabHref(key: PostsTab) {
    const next = new URLSearchParams(params.toString());
    if (key === "all") next.delete("tab");
    else next.set("tab", key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }
  function switchTab(e: MouseEvent<HTMLAnchorElement>, key: PostsTab) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (key !== tab) window.history.pushState(null, "", tabHref(key));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {header ?? (
        <PageHeader
          icon={Layers}
          tint="blue"
          title={t("title")}
          actions={
            <Link href={newPostHref} className={buttonVariants()}>
              <Plus aria-hidden /> {tn("newPost")}
            </Link>
          }
        />
      )}

      {/* Tabs on the left, search and filters on the right (one row from xl). The baseline is an
          inset shadow: a border overlapped with -mb-px made the row scroll vertically. */}
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-4 ">
        <nav aria-label={t("tabsLabel")} className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto  xl:shadow-none">
          {TABS.map((key) => (
            <a
              key={key}
              href={tabHref(key)}
              onClick={(e) => switchTab(e, key)}
              aria-current={key === tab ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors -outline-offset-2",
                key === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tabLabel[key]}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-1 sm:justify-end">
          <div className="relative min-w-36 flex-1 sm:w-56 sm:flex-initial">
            <Search className="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="h-8 rounded-lg ps-8"
            />
          </div>
          {accountId ? null : <PlatformFilter value={platform} onChange={setPlatform} label={t("filterPlatform")} allLabel={t("allPlatforms")} />}
          <TagPicker mode="filter" value={tagIds} onChange={setTagIds} />
        </div>
      </div>

      {posts.isPending ? (
        <div className="space-y-2" aria-busy>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FilePen}
          title={filtering ? t("noMatchTitle") : t(`empty.${tab}.title`)}
          description={filtering ? t("noMatchBody") : t(`empty.${tab}.body`)}
          action={
            filtering ? null : (
              <Link href={newPostHref} className={buttonVariants()}>
                {tn("newPost")}
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* Table from md up; cards on phones (FRONTEND.md §5 Table). */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{tabLabel[tab]}</caption>
              <thead className="bg-muted text-start">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("columns.post")}</th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("columns.accounts")}</th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("columns.when")}</th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("columns.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((post) => {
                  const Icon = TYPE_ICON[post.type];
                  return (
                    <tr key={post.id} className="hover:bg-muted/50">
                      <td className="max-w-md px-4 py-3">
                        <button type="button" onClick={() => setOpenId(post.id)} className="flex items-start gap-3 rounded text-start">
                          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={t(`types.${post.type}`)} />
                          <span className="min-w-0 space-y-1.5">
                            <CaptionExcerpt post={post} />
                            <TagList tagIds={post.tagIds} />
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <PlatformStack post={post} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PostWhen post={post} />
                      </td>
                      <td className="px-4 py-3">
                        <PostStatusChip status={post.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((post) => (
              <li key={post.id}>
                <button type="button" onClick={() => setOpenId(post.id)} className="w-full space-y-2 rounded-lg border p-4 text-start hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <PostStatusChip status={post.status} />
                    <PlatformStack post={post} />
                  </div>
                  <p className="text-sm">
                    <CaptionExcerpt post={post} />
                  </p>
                  <TagList tagIds={post.tagIds} />
                  <p className="text-xs text-muted-foreground">
                    <PostWhen post={post} />
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {open ? <PostSheet post={open} accounts={accounts.data ?? []} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

// The header search links here with ?q=; a new query remounts the list with it. ?tab= only
// changes the list shown, so search and filters carry across tabs.
export function PostsView({ accountId, header }: Pick<ListProps, "accountId" | "header">) {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const tab = params.get("tab");
  return <PostsList key={q} tab={isTab(tab) ? tab : "all"} initialQuery={q} accountId={accountId} header={header} />;
}

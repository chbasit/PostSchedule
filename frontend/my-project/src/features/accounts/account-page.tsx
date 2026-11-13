"use client";

import { ChartColumn, List, Plug, RefreshCw, Settings2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { AccountStatusChip } from "@/components/status-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Link, usePathname } from "@/i18n/navigation";
import type { SocialAccount } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { useConnectAccount } from "@/features/connections/use-connect";
import { useAccounts } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { accountHref, isActive } from "@/features/shell/nav";
import { useConnectReturn } from "@/features/connections/use-connect-return";

// Resolves /dashboard/accounts/[id] to a connected account, or explains why it can't.
export function AccountPage({ children }: { children: (account: SocialAccount) => ReactNode }) {
  const t = useTranslations("insights");
  const { id } = useParams<{ id: string }>();
  const accounts = useAccounts();
  // A new TikTok account lands here after its sign-in.
  useConnectReturn();

  if (accounts.isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-5" aria-busy>
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (accounts.isError) return <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />;
  const account = accounts.data.find((a) => a.id === id);
  if (!account) {
    return (
      <EmptyState
        icon={Plug}
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
        action={
          <Link href="/dashboard/settings/accounts" className={buttonVariants()}>
            {t("toAccounts")}
          </Link>
        }
      />
    );
  }
  // Keyed so switching accounts starts each page fresh (range, sort, open sheet).
  return <div key={account.id}>{children(account)}</div>;
}

export function AccountHeader({ account, actions }: { account: SocialAccount; actions?: ReactNode }) {
  const t = useTranslations("insights");
  const tn = useTranslations("nav.accounts");
  const pathname = usePathname();
  const platform = getPlatform(account.provider);
  const base = accountHref(account.id);
  const tabs = [
    { href: base, label: tn("insights"), icon: ChartColumn, active: pathname === base },
    { href: `${base}/posts`, label: tn("posts"), icon: List, active: isActive(pathname, { href: `${base}/posts` }) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <PlatformMark id={account.provider} size="lg" className="rounded-xl" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight">{account.displayName}</h1>
              <Link
                href="/dashboard/settings/accounts"
                aria-label={t("settings")}
                title={t("settings")}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings2 className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {platform.name} · <span dir="ltr">{account.handle}</span>
            </p>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      <nav aria-label={t("tabsLabel")} className="no-scrollbar flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors -outline-offset-2 [&_svg]:size-4",
              tab.active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon aria-hidden />
            {tab.label}
          </Link>
        ))}
      </nav>

      {account.status === "needs_reconnect" ? <ReconnectNotice account={account} /> : null}
    </div>
  );
}

// A disconnected account keeps its last numbers, but nothing publishes or refreshes.
function ReconnectNotice({ account }: { account: SocialAccount }) {
  const t = useTranslations("insights");
  const { workspace } = useWorkspace();
  const { reconnect } = useConnectAccount();
  const manage = can(workspace.role, "account.connect");
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <AccountStatusChip status={account.status} />
        <p>{t("reconnectBody", { name: account.displayName })}</p>
      </div>
      {manage ? (
        <Button size="sm" className="shrink-0" loading={reconnect.isPending} onClick={() => !reconnect.isPending && reconnect.mutate(account.id)}>
          <RefreshCw aria-hidden /> {t("reconnect")}
        </Button>
      ) : null}
    </div>
  );
}

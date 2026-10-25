"use client";

import { ArrowLeft, ChartColumn, ChevronsUpDown, List, Plus, Settings2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { PlatformMark } from "@/components/platform-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/misc";
import { Link, usePathname } from "@/i18n/navigation";
import type { SocialAccount } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { getPlatform, PLATFORMS } from "@/providers/catalog";
import { ConnectDialog } from "@/features/connections/connect-dialog";
import { useAccounts, usePosts } from "@/features/session/queries";
import { useWorkspace, useWorkspaceState } from "@/features/session/workspace-context";
import { accountHref, inSettings, isActive, NAV, SETTINGS_HOME, SETTINGS_NAV } from "./nav";
import { UserMenuItems } from "./user-menu";

const itemBase = "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-200";
// Ink on sky (12.8:1) in both themes marks where you are.
const itemState = (active: boolean) => (active ? "bg-sky font-semibold text-ink" : "font-medium text-foreground hover:bg-shell-hover");
const iconButton =
  "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-shell-hover hover:text-foreground [&_svg]:size-4";

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  aside,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  aside?: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(itemBase, itemState(active))}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
      {aside}
    </Link>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <span className="tabular ms-auto text-xs font-medium text-muted-foreground" title={label}>
      {value}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

type Nav = { pathname: string; onNavigate?: () => void };

function AccountItem({ account, queued, pathname, onNavigate }: Nav & { account: SocialAccount; queued: number }) {
  const t = useTranslations("nav.accounts");
  const ts = useTranslations("status");
  const base = accountHref(account.id);
  const open = isActive(pathname, { href: base });
  const platform = getPlatform(account.provider);
  const broken = account.status === "needs_reconnect";

  return (
    <li>
      <Link
        href={base}
        onClick={onNavigate}
        title={`${platform.name} · ${account.handle}`}
        className={cn(itemBase, open ? "font-semibold text-foreground" : "font-medium text-foreground hover:bg-shell-hover")}
      >
        <span className="relative shrink-0">
          <PlatformMark id={account.provider} size="sm" className="rounded-md" />
          {broken ? <span aria-hidden className="absolute -end-1 -top-1 size-2.5 rounded-full bg-warning ring-2 ring-shell" /> : null}
        </span>
        <span className="truncate">{account.displayName}</span>
        <span className="sr-only">
          ({platform.name}
          {broken ? `, ${ts("needs_reconnect")}` : ""})
        </span>
        <Count value={queued} label={t("queued", { count: queued })} />
      </Link>
      {open ? (
        <ul className="ms-[1.15rem] mt-0.5 space-y-0.5 border-s ps-2">
          <li>
            <NavLink href={base} active={pathname === base} icon={ChartColumn} label={t("insights")} onNavigate={onNavigate} />
          </li>
          <li>
            <NavLink href={`${base}/posts`} active={isActive(pathname, { href: `${base}/posts` })} icon={List} label={t("posts")} onNavigate={onNavigate} />
          </li>
        </ul>
      ) : null}
    </li>
  );
}

// Every connected account, with its own Insights and Posts pages (Buffer's channel list).
function AccountsSection({ pathname, onNavigate }: Nav) {
  const t = useTranslations("nav.accounts");
  const { workspace } = useWorkspace();
  const accounts = useAccounts();
  const posts = usePosts();
  const manage = can(workspace.role, "account.connect");
  const list = accounts.data ?? [];
  const missing = PLATFORMS.filter((p) => !list.some((a) => a.provider === p.id));
  const atLimit = list.length >= workspace.accountLimit;

  const queued = (accountId: string) =>
    (posts.data ?? []).filter(
      (p) => (p.status === "scheduled" || p.status === "pending_approval") && p.targets.some((tg) => tg.socialAccountId === accountId && tg.status === "pending"),
    ).length;

  return (
    <section aria-labelledby="sidebar-accounts" className="space-y-1">
      <div className="flex h-7 items-center justify-between ps-2.5">
        <h2 id="sidebar-accounts" className="text-xs font-medium text-muted-foreground">
          {t("title")}
        </h2>
        <div className="flex items-center">
          <Link href="/dashboard/settings/accounts" onClick={onNavigate} aria-label={t("manage")} title={t("manage")} className={iconButton}>
            <Settings2 aria-hidden />
          </Link>
          {manage && !atLimit ? (
            <ConnectDialog
              trigger={
                <button type="button" aria-label={t("connect")} title={t("connect")} className={iconButton}>
                  <Plus aria-hidden />
                </button>
              }
            />
          ) : null}
        </div>
      </div>
      {accounts.isPending ? (
        <div className="space-y-1.5 px-2.5 py-1" aria-hidden>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-32" />
        </div>
      ) : (
        <ul className="space-y-0.5">
          {list.map((account) => (
            <AccountItem key={account.id} account={account} queued={queued(account.id)} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
      {manage && !atLimit && accounts.isSuccess && missing.length > 0 ? (
        <div className="space-y-1.5 px-2.5 pt-2">
          <p className="text-xs text-muted-foreground">{list.length ? t("connectMore") : t("connectFirst")}</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((p) => (
              <ConnectDialog
                key={p.id}
                initial={p.id}
                trigger={
                  <button
                    type="button"
                    aria-label={t("connectPlatform", { platform: p.name })}
                    title={t("connectPlatform", { platform: p.name })}
                    className="rounded-md transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <PlatformMark id={p.id} size="sm" className="size-6 rounded-md" />
                  </button>
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MainNav({ pathname, onNavigate }: Nav) {
  const t = useTranslations("nav");
  const state = useWorkspaceState();
  return (
    <nav aria-label={t("label")} className="flex flex-col gap-5">
      <ul className="space-y-0.5">
        {NAV.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} active={isActive(pathname, item)} icon={item.icon} label={t(`items.${item.key}`)} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      {state.status === "ready" ? <AccountsSection key={state.workspace.id} pathname={pathname} onNavigate={onNavigate} /> : null}
    </nav>
  );
}

function SettingsNav({ pathname, onNavigate }: Nav) {
  const t = useTranslations("nav.settings");
  const ready = useWorkspaceState().status === "ready";
  return (
    <nav aria-label={t("label")} className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <Link href="/dashboard" onClick={onNavigate} aria-label={t("back")} title={t("back")} className={cn(iconButton, "size-8")}>
          <ArrowLeft className="rtl:-scale-x-100" aria-hidden />
        </Link>
        <p className="font-semibold">{t("title")}</p>
      </div>
      {SETTINGS_NAV.map((group, i) => (
        <ul key={i} className="space-y-0.5">
          {group.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                active={isActive(pathname, item) || (item.key === "profile" && pathname === SETTINGS_HOME)}
                icon={item.icon}
                label={t(item.key)}
                onNavigate={onNavigate}
                aside={item.key === "accounts" && ready ? <AccountCount /> : undefined}
              />
            </li>
          ))}
        </ul>
      ))}
    </nav>
  );
}

function AccountCount() {
  const t = useTranslations("nav.settings");
  const accounts = useAccounts();
  return accounts.isSuccess ? <Count value={accounts.data.length} label={t("accountCount", { count: accounts.data.length })} /> : null;
}

// Settings swap in their own list while you are in them, with a way back.
function NavFor({ pathname, onNavigate }: Nav) {
  return inSettings(pathname) ? <SettingsNav pathname={pathname} onNavigate={onNavigate} /> : <MainNav pathname={pathname} onNavigate={onNavigate} />;
}

function CurrentNav({ onNavigate }: { onNavigate?: () => void }) {
  return <NavFor pathname={usePathname()} onNavigate={onNavigate} />;
}

// The URL is runtime data on routes with params (an account's id), so the nav streams in
// there; the fallback is the same list without the current-page highlight.
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavFor pathname="" onNavigate={onNavigate} />}>
      <CurrentNav onNavigate={onNavigate} />
    </Suspense>
  );
}

// You, the workspace and its plan; opens the account menu.
function ProfileButton() {
  const t = useTranslations("shell");
  const tp = useTranslations("plans.names");
  const state = useWorkspaceState();
  if (state.status !== "ready") return <Skeleton className="h-11 w-full rounded-lg" />;
  const { user, workspace } = state;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("userMenu", { name: user.displayName })}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-shell-hover data-[state=open]:bg-shell-hover"
        >
          <Avatar id={user.id} name={user.displayName} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {workspace.name} · {tp(workspace.planKey)}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <UserMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar() {
  return (
    <aside className="no-scrollbar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-5 overflow-y-auto px-3 py-3.5 lg:flex">
      <Link href="/dashboard" className="w-fit rounded px-2">
        <Logo />
      </Link>
      <SidebarNav />
      <div className="mt-auto">
        <ProfileButton />
      </div>
    </aside>
  );
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ChevronDown, CircleCheck, CircleX, Search, Unplug, UserCheck, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type Notification } from "@/lib/api/client";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/features/session/queries";
import { useWorkspace, useWorkspaceState } from "@/features/session/workspace-context";
import { MobileNav } from "./mobile-nav";
import { UserMenuItems } from "./user-menu";

function WorkspaceSwitcher() {
  const t = useTranslations("shell");
  const tp = useTranslations("plans.names");
  const { workspace, workspaces, switchWorkspace } = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="max-w-[60vw] gap-2 px-2 sm:max-w-xs" aria-label={t("switchWorkspace", { name: workspace.name })}>
          <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky text-xs font-bold text-ink">
            {workspace.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate font-semibold">{workspace.name}</span>
          <span className="hidden rounded-full bg-highlight px-2 py-0.5 text-xs font-semibold text-highlight-foreground sm:inline">{tp(workspace.planKey)}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("workspaces")}</DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem key={ws.id} onSelect={() => switchWorkspace(ws.id)}>
            <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-md bg-sky text-xs font-bold text-ink">
              {ws.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{ws.name}</span>
            <span className="text-xs text-muted-foreground">{tp(ws.planKey)}</span>
            {ws.id === workspace.id ? <Check aria-label={t("current")} /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const NOTIFICATION_ICON = {
  published: { icon: CircleCheck, className: "bg-tint-green text-tint-green-fg" },
  failed: { icon: CircleX, className: "bg-tint-rose text-tint-rose-fg" },
  needs_reconnect: { icon: Unplug, className: "bg-tint-amber text-tint-amber-fg" },
  approval_requested: { icon: UserCheck, className: "bg-tint-violet text-tint-violet-fg" },
  invite: { icon: UserPlus, className: "bg-tint-blue text-tint-blue-fg" },
} as const;

function NotificationBell() {
  const t = useTranslations("shell.notifications");
  const locale = useLocale();
  const { workspace, user, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useNotifications();
  const unread = data?.filter((n) => !n.read).length ?? 0;

  const markAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(workspace.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...scope, "notifications"] }),
  });

  const href = (n: Notification) => (n.kind === "needs_reconnect" ? "/dashboard/settings/accounts" : n.kind === "invite" ? "/dashboard/settings/team" : "/dashboard/posts");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? t("labelUnread", { count: unread }) : t("label")}>
          <Bell aria-hidden />
          {unread ? (
            <span aria-hidden className="absolute inset-e-0.5 top-0.5 inline-flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-coral px-1 text-xs font-bold text-ink">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold">{t("title")}</p>
          <Button variant="link" size="sm" className="text-xs" disabled={!unread} loading={markAll.isPending} onClick={() => markAll.mutate()}>
            {t("markAll")}
          </Button>
        </div>
        <DropdownMenuSeparator />
        {isPending ? (
          <p className="flex items-center justify-center gap-2 px-2 py-6 text-sm text-muted-foreground">
            <Spinner /> {t("loading")}
          </p>
        ) : isError ? (
          <p className="px-2 py-6 text-center text-sm text-danger">{t("error")}</p>
        ) : data.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          data.map((n) => {
            const { icon: Icon, className } = NOTIFICATION_ICON[n.kind];
            return (
              <DropdownMenuItem key={n.id} asChild>
                <Link href={href(n)} className="items-start">
                  <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full", className)}>
                    <Icon aria-hidden />
                  </span>
                  <span className="flex-1 space-y-0.5">
                    <span className={cn("block", !n.read && "font-semibold")}>{t(`kinds.${n.kind}`)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt, locale, user.timezone, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </span>
                  {!n.read ? <span className="mt-2 size-2 rounded-full bg-coral" aria-label={t("unread")} /> : null}
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Phones and tablets; from lg up the account menu lives in the sidebar.
function UserMenu() {
  const t = useTranslations("shell");
  const { user } = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex rounded-full lg:hidden" aria-label={t("userMenu", { name: user.displayName })}>
          <Avatar id={user.id} name={user.displayName} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <UserMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobalSearch() {
  const t = useTranslations("shell");
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-xs md:block"
      onSubmit={(e) => {
        e.preventDefault();
        router.push({ pathname: "/dashboard/posts", query: q.trim() ? { q: q.trim() } : {} });
      }}
    >
      <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-9 ps-9" type="search" />
    </form>
  );
}

function ReadyTools() {
  const { user } = useWorkspace();
  return (
    <>
      <GlobalSearch />
      <ThemeToggle />
      <NotificationBell />
      <UserMenu key={user.id} />
    </>
  );
}

// Renders straight away; the account-specific parts fill in once the session is ready.
export function AppHeader() {
  const state = useWorkspaceState();
  const ready = state.status === "ready";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur sm:px-4">
      <MobileNav />
      {ready ? <WorkspaceSwitcher key={state.workspace.id} /> : <Skeleton className="h-8 w-48 max-w-[50vw]" />}
      <div className="ms-auto flex items-center gap-1">
        {ready ? (
          <ReadyTools />
        ) : (
          <>
            <Skeleton className="hidden h-9 w-64 md:block" />
            <Skeleton className="size-9 rounded-full lg:hidden" />
          </>
        )}
      </div>
    </header>
  );
}

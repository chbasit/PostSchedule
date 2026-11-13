"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChartColumn, Plug, RefreshCw, Trash } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { PlatformMark } from "@/components/platform-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { AccountStatusChip } from "@/components/status-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { api, type SocialAccount } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/time";
import { getPlatform } from "@/providers/catalog";
import { useAccounts, usePosts } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { accountHref } from "@/features/shell/nav";
import { ConnectDialog } from "./connect-dialog";
import { useConnectAccount } from "./use-connect";
import { useConnectReturn } from "./use-connect-return";

function RemoveDialog({ account, onClose }: { account: SocialAccount; onClose: () => void }) {
  const t = useTranslations("connections");
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const scheduled = usePosts({ status: ["scheduled", "pending_approval"] });
  const affected = scheduled.data?.filter((p) => p.targets.some((tg) => tg.socialAccountId === account.id)).length;

  const remove = useMutation({
    mutationFn: () => api.accounts.remove(workspace.id, account.id),
    onSuccess: () => {
      toast.success(t("removed", { name: account.displayName }));
      queryClient.invalidateQueries({ queryKey: scope });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader
          title={t("removeTitle", { name: account.displayName })}
          description={
            affected === undefined
              ? t("removeCounting")
              : t("removeBody", { count: affected, platform: getPlatform(account.provider).name })
          }
        />
        {remove.isError ? <p role="alert" className="text-sm text-danger">{t("removeFailed")}</p> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("keep")}</Button>
          </DialogClose>
          <Button variant="destructive" loading={remove.isPending} onClick={() => !remove.isPending && remove.mutate()}>
            {t("remove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsView() {
  const t = useTranslations("connections");
  // Back from a platform's sign-in: say how it went.
  useConnectReturn();
  const tn = useTranslations("nav.settings");
  const locale = useLocale();
  const { workspace, user } = useWorkspace();
  const accounts = useAccounts();
  const { reconnect } = useConnectAccount();
  const [removing, setRemoving] = useState<SocialAccount | null>(null);
  const manage = can(workspace.role, "account.connect");
  const count = accounts.data?.length ?? 0;
  const atLimit = count >= workspace.accountLimit;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        icon={Plug}
        tint="green"
        title={tn("accounts")}
        description={t("usage", { count, limit: workspace.accountLimit })}
        actions={manage && !atLimit ? <ConnectDialog /> : null}
      />

      {manage && atLimit ? (
        <p className="rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">{t("limitReached")}</p>
      ) : null}
      {!manage ? <p className="text-sm text-muted-foreground">{t("noPermission")}</p> : null}

      {accounts.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : accounts.isError ? (
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      ) : accounts.data.length === 0 ? (
        <EmptyState icon={Plug} title={t("emptyTitle")} description={t("emptyBody")} action={manage ? <ConnectDialog /> : null} />
      ) : (
        <ul className="divide-y rounded-lg border">
          {accounts.data.map((account) => (
            <li key={account.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <PlatformMark id={account.provider} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {getPlatform(account.provider).name} · <span dir="ltr">{account.handle}</span> ·{" "}
                    {t("since", { date: formatDateTime(account.createdAt, locale, user.timezone, { dateStyle: "medium" }) })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AccountStatusChip status={account.status} />
                <Link href={accountHref(account.id)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  <ChartColumn aria-hidden /> {t("insights")}
                </Link>
                {manage && account.status === "needs_reconnect" ? (
                  <Button
                    size="sm"
                    loading={reconnect.isPending && reconnect.variables === account.id}
                    onClick={() => !reconnect.isPending && reconnect.mutate(account.id)}
                  >
                    <RefreshCw aria-hidden /> {t("reconnect")}
                  </Button>
                ) : null}
                {manage ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("removeLabel", { name: account.displayName })}
                    onClick={() => setRemoving(account)}
                  >
                    <Trash aria-hidden />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {removing ? <RemoveDialog account={removing} onClose={() => setRemoving(null)} /> : null}
    </div>
  );
}

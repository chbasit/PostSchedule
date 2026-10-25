"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, isApiError, type ConnectResult } from "@/lib/api/client";
import { useIntentKey } from "@/lib/use-intent-key";
import type { PlatformId } from "@/providers/catalog";
import { useWorkspace } from "@/features/session/workspace-context";

// One intent, one key: double clicks open one OAuth flow and create one account (TEST.md DBL-19).
export function useConnectAccount(onConnected?: () => void) {
  const t = useTranslations("connections");
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const intent = useIntentKey();

  const handle = (result: ConnectResult) => {
    if (result.kind === "redirect") {
      window.location.assign(result.url);
      return;
    }
    intent.renew();
    toast.success(t("connected", { name: result.account.displayName }));
    queryClient.invalidateQueries({ queryKey: [...scope, "accounts"] });
    onConnected?.();
  };

  const connect = useMutation({
    mutationFn: (provider: PlatformId) => api.accounts.connect(workspace.id, provider, { idempotencyKey: intent.get() }),
    onSuccess: handle,
  });

  const reconnect = useMutation({
    mutationFn: (accountId: string) => api.accounts.reconnect(workspace.id, accountId),
    onSuccess: handle,
  });

  return { connect, reconnect, isPlanLimit: (e: unknown) => isApiError(e) && e.code === "plan_limit_reached" };
}

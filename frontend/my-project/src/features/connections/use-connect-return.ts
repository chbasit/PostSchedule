"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getPlatform, PLATFORMS, type PlatformId } from "@/providers/catalog";
import { useWorkspace } from "@/features/session/workspace-context";

const ERRORS = ["denied", "refused", "expired", "session", "scopes", "limit", "unavailable"] as const;

// After a platform's sign-in (OAuth) the server sends people back with ?connected=<platform>
// or ?connect_error=<reason>&platform=<platform> (app/api/v1/oauth/*/callback). This says how
// it went once, refreshes the accounts, and removes the marker from the address.
export function useConnectReturn() {
  const t = useTranslations("connections.returned");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { scope } = useWorkspace();
  const shown = useRef(false);

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("connect_error");
    if (shown.current || (!connected && !error)) return;
    shown.current = true;
    const id = (connected ?? params.get("platform") ?? "") as PlatformId;
    const platform = PLATFORMS.some((p) => p.id === id) ? getPlatform(id).name : "";
    if (connected) {
      toast.success(t("connected", { platform }));
      void queryClient.invalidateQueries({ queryKey: [...scope, "accounts"] });
    } else {
      const reason = (ERRORS as readonly string[]).includes(error!) ? (error as (typeof ERRORS)[number]) : "refused";
      toast.error(t(`errors.${reason}`, { platform }));
    }
    router.replace(pathname);
  }, [params, router, pathname, queryClient, scope, t]);
}

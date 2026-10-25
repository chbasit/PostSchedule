"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Direction } from "radix-ui";
import { useSyncExternalStore, type ReactNode } from "react";
import { Toaster } from "sonner";
import { isApiError } from "@/lib/api/errors";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // GETs retry a few times with backoff; auth and not-found errors do not (TEST.md NET-11).
        retry: (failureCount, error) => {
          if (isApiError(error) && ["unauthenticated", "forbidden", "not_found", "validation_failed"].includes(error.code)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      // Mutations are never retried automatically.
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function OfflineBanner() {
  const t = useTranslations("common");
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 bg-ink px-4 py-2.5 text-sm text-white pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <WifiOff className="size-4" aria-hidden />
      {t("offline")}
    </div>
  );
}

export function AppProviders({ dir, children }: { dir: "ltr" | "rtl"; children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Direction.Provider dir={dir}>
        {children}
        <OfflineBanner />
        {/* Top centre keeps toasts off the composer's action bar and the phone navigation. */}
        <Toaster
          position="top-center"
          dir={dir}
          toastOptions={{ className: "rounded-xl! border-0! bg-popover! text-popover-foreground! shadow-menu! dark:ring-1! dark:ring-white/10!" }}
        />
      </Direction.Provider>
    </QueryClientProvider>
  );
}

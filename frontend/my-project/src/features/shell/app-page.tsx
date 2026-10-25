"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/states";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { useWorkspaceState } from "@/features/session/workspace-context";

export type SkeletonKind = "home" | "list" | "calendar" | "composer" | "form" | "cards";

// Matches each screen's final layout so nothing jumps when data arrives (FRONTEND.md §5).
export function PageSkeleton({ kind }: { kind: SkeletonKind }) {
  const t = useTranslations("common");
  return (
    <div className={cn("mx-auto w-full space-y-6", kind === "composer" ? "max-w-350" : "max-w-6xl")} aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <Skeleton className="h-8 w-48 max-w-full" />
      </div>
      {kind === "home" ? (
        <>
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </>
      ) : null}
      {kind === "list" ? (
        <>
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </>
      ) : null}
      {kind === "calendar" ? (
        <>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[34rem] w-full rounded-xl" />
        </>
      ) : null}
      {kind === "composer" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="space-y-5">
              <Skeleton className="h-10 w-72 max-w-full rounded-full" />
              <Skeleton className="h-96 rounded-xl" />
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      ) : null}
      {kind === "form" ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : null}
      {kind === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Wraps every signed-in page. The page itself always renders (so Next.js can validate
 * instant navigation); until the session is ready it shows the page's own skeleton.
 */
export function AppPage({ skeleton, children }: { skeleton: SkeletonKind; children: ReactNode }) {
  const state = useWorkspaceState();
  if (state.status === "ready") return <div className="animate-fade-up">{children}</div>;
  if (state.status === "error") {
    return <ErrorState error={state.error} onRetry={state.retry} className="mx-auto max-w-md" />;
  }
  return <PageSkeleton kind={skeleton} />;
}

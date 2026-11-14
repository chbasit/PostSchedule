import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/misc";
import { DEV_MODE } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { AuthShowcase } from "@/features/auth/auth-showcase";

export const metadata: Metadata = { robots: { index: false } };

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

// A split screen (founder's call, 2026-11-14): the logo and the form on white on the left, the
// product's picture on forest on the right (AuthShowcase), which phones do not show.
export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = useTranslations("auth.dev");
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded">
            <Logo />
          </Link>
          {/* So nobody mistakes on-screen codes for the real thing (src/config/site.ts). */}
          {DEV_MODE ? (
            <span className="rounded-full border border-dashed border-info/50 bg-info-bg px-2.5 py-0.5 text-xs font-semibold text-info" title={t("badgeHint")}>
              {t("badge")}
            </span>
          ) : null}
          {/* No theme button here: only the site and the dashboard have one (founder's call, 2026-11-11). */}
        </div>
        <main id="main" className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[400px]">
            <Suspense fallback={<FormSkeleton />}>{children}</Suspense>
          </div>
        </main>
      </div>
      <AuthShowcase />
    </div>
  );
}

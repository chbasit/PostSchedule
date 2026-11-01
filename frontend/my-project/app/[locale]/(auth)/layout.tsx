import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ThemeMenu } from "@/components/theme";
import { Skeleton } from "@/components/ui/misc";
import { DEV_MODE } from "@/config/site";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false } };

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="mx-auto h-8 w-2/3" />
      <Skeleton className="mx-auto h-4 w-1/2" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

// One centred card on the shell colour: logo above, language and theme in the corner.
export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = useTranslations("auth.dev");
  return (
    <div className="flex min-h-dvh flex-col bg-shell">
      <div className="flex h-14 shrink-0 items-center justify-end gap-1 px-4 sm:px-6">
        {/* So nobody mistakes on-screen codes for the real thing (src/config/site.ts). */}
        {DEV_MODE ? (
          <span className="me-auto rounded-full border border-dashed border-info/50 bg-info-bg px-2.5 py-0.5 text-xs font-semibold text-info" title={t("badgeHint")}>
            {t("badge")}
          </span>
        ) : null}
        <LanguageSwitcher />
        <ThemeMenu />
      </div>
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 pb-14">
        <Link href="/" className="mb-6 rounded">
          <Logo />
        </Link>
        <div className="w-full max-w-[400px] rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgb(0_0_0/0.06),0_8px_24px_rgb(0_0_0/0.05)] sm:p-8 dark:shadow-none dark:ring-1 dark:ring-white/10">
          <Suspense fallback={<FormSkeleton />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}

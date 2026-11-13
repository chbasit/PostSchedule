import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SoonBadge } from "@/features/ai-studio/coming-soon";
import { FEATURES } from "@/features/marketing/feature-catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.features");
  const locale = await rootLocale();
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: `/${locale}/features` } };
}

// Every feature on one page, each card the target of its link in the header's Features menu.
// What is not built yet says "Soon" (feature-catalog.ts).
export default function FeaturesPage() {
  const t = useTranslations("marketing.features");
  const th = useTranslations("marketing.home");
  return (
    <>
      <section className="mx-auto max-w-[1440px] px-4 pt-20 pb-12 text-center md:px-6 md:pt-28 md:pb-16 lg:px-8">
        <h1 className="display mx-auto max-w-4xl text-[clamp(2.5rem,5vw,4.25rem)] text-balance">{t("title")}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-balance text-muted-foreground">{t("sub")}</p>
      </section>
      <section aria-label={t("menu")} className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
        <ul className="grid gap-4 md:grid-cols-2">
          {FEATURES.map(({ key, icon: Icon, tint, soon }) => (
            <li key={key} id={key} className="scroll-mt-28 rounded-2xl bg-card p-6 ring-1 ring-border sm:p-8">
              <span className={cn("inline-flex size-12 items-center justify-center rounded-xl text-forest", tint)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-5 flex flex-wrap items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
                {t(`items.${key}.title`)}
                {soon ? <SoonBadge /> : null}
              </h2>
              <p className="mt-2 text-lg text-muted-foreground">{t(`items.${key}.long`)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-7")}>
            {th("ctaPrimary")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}

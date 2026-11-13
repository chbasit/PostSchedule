import { ArrowRight, Lightbulb, MonitorSmartphone, Repeat, WandSparkles, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { ComponentType } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AI_ENABLED } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SoonBadge } from "@/features/ai-studio/coming-soon";
import { GenerateVisual, IdeasVisual, RewriteVisual, TailorVisual } from "@/features/marketing/ai-visuals";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.aiPage");
  const locale = await rootLocale();
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: `/${locale}/features/ai-assistant` } };
}

const BENEFITS: Array<{ key: "ideas" | "repurpose" | "tailor" | "edit"; icon: LucideIcon; tint: string }> = [
  { key: "ideas", icon: Lightbulb, tint: "bg-card-yellow" },
  { key: "repurpose", icon: Repeat, tint: "bg-card-salmon" },
  { key: "tailor", icon: MonitorSmartphone, tint: "bg-card-aqua" },
  { key: "edit", icon: WandSparkles, tint: "bg-card-lavender" },
];

const SECTIONS: Array<{ key: "generate" | "repurpose" | "tailor" | "edit"; surface: string; Visual: ComponentType<{ className?: string }> }> = [
  { key: "generate", surface: "bg-card-pink", Visual: GenerateVisual },
  { key: "repurpose", surface: "bg-card-salmon", Visual: IdeasVisual },
  { key: "tailor", surface: "bg-card-aqua", Visual: TailorVisual },
  { key: "edit", surface: "bg-card-lavender", Visual: RewriteVisual },
];

// The AI Assistant's own page (founder's call, 2026-11-13): a forest hero, four benefits, then
// writing, repurposing, tailoring and editing, each beside a picture drawn from the product.
// While AI is switched off (NEXT_PUBLIC_AI_ENABLED) the page says "Soon".
export default function AiAssistantPage() {
  const t = useTranslations("marketing.aiPage");
  const th = useTranslations("marketing.home");
  const pill = cn(buttonVariants({ size: "lg" }), "rounded-full px-7");
  const cta = (
    <Link href="/signup" className={cn(pill, "mt-8")}>
      {th("ctaPrimary")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
    </Link>
  );

  return (
    <>
      <section className="bg-forest text-white">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-leaf uppercase">
              {t("eyebrow")}
              {AI_ENABLED ? null : <SoonBadge className="tracking-normal normal-case" />}
            </p>
            <h1 className="display mt-4 text-[clamp(2.75rem,6vw,5rem)] text-balance text-white">{t("title")}</h1>
            <p className="mt-6 max-w-xl text-xl text-white/80">{t("sub")}</p>
            {cta}
          </div>
          <div className="rounded-2xl bg-card-lavender p-6 sm:p-10">
            <RewriteVisual />
          </div>
        </div>
      </section>

      <section aria-labelledby="ai-benefits" className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <h2 id="ai-benefits" className="display text-center text-4xl text-balance md:text-5xl">
          {t("benefitsTitle")}
        </h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ key, icon: Icon, tint }) => (
            <li key={key} className="rounded-2xl bg-card p-6 ring-1 ring-border">
              <span className={cn("inline-flex size-11 items-center justify-center rounded-xl text-forest", tint)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight">{t(`benefits.${key}.title`)}</h3>
              <p className="mt-2 text-base text-muted-foreground">{t(`benefits.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {SECTIONS.map(({ key, surface, Visual }, i) => (
        <section key={key} aria-labelledby={`ai-${key}`} className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className={cn(i % 2 === 1 && "lg:order-2")}>
              <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t(`sections.${key}.eyebrow`)}</p>
              <h2 id={`ai-${key}`} className="display mt-3 text-4xl text-balance md:text-5xl">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="mt-5 max-w-xl text-xl text-muted-foreground">{t(`sections.${key}.body`)}</p>
              {cta}
            </div>
            <div className={cn("rounded-2xl p-6 sm:p-10", surface)}>
              <Visual />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

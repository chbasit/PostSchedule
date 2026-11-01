"use client";

import { Coins, Images, Ruler, Sparkles, SquarePen, WandSparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// What AI surfaces show while AI_ENABLED is off (src/config/site.ts): the feature is named
// and described, nothing can be started, and nothing is charged.

export function SoonBadge({ className }: { className?: string }) {
  const t = useTranslations("aiStudio");
  return <span className={cn("rounded-full bg-tint-violet px-2 py-0.5 text-xs font-semibold text-tint-violet-fg", className)}>{t("soon")}</span>;
}

const POINTS: Array<{ key: "sizes" | "library" | "credits"; icon: LucideIcon }> = [
  { key: "sizes", icon: Ruler },
  { key: "library", icon: Images },
  { key: "credits", icon: Coins },
];

export function AiStudioComingSoon() {
  const t = useTranslations("aiStudio");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={WandSparkles} tint="violet" title={t("title")} actions={<SoonBadge className="px-3 py-1 text-sm" />} />
      <section aria-labelledby="ai-soon-title" className="space-y-6 rounded-2xl border border-tint-violet-line bg-tint-violet p-6 sm:p-8">
        <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-full bg-card text-tint-violet-fg">
          <Sparkles className="size-6" />
        </span>
        <div className="space-y-2">
          <h2 id="ai-soon-title" className="text-xl font-semibold">
            {t("comingSoon.title")}
          </h2>
          <p className="max-w-xl text-muted-foreground">{t("comingSoon.body")}</p>
        </div>
        <ul className="space-y-3">
          {POINTS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-3 text-sm">
              <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-tint-violet-fg">
                <Icon className="size-4" />
              </span>
              {t(`comingSoon.points.${key}`)}
            </li>
          ))}
        </ul>
        <Link href="/dashboard/create" className={buttonVariants()}>
          <SquarePen aria-hidden /> {t("comingSoon.action")}
        </Link>
      </section>
    </div>
  );
}

// The composer's AI tab.
export function AiWriterComingSoon() {
  const t = useTranslations("aiStudio.writerSoon");
  return (
    <div className="space-y-3 rounded-xl border border-tint-violet-line bg-tint-violet p-5">
      <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-full bg-card text-tint-violet-fg">
        <Sparkles className="size-5" />
      </span>
      <p className="text-lg font-semibold">{t("title")}</p>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
    </div>
  );
}

// Takes the place of the composer's "AI image" button.
export function AiImageSoon() {
  const t = useTranslations("aiStudio");
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground" title={t("comingSoon.title")}>
      <WandSparkles className="size-4" aria-hidden /> {t("picker.open")} <SoonBadge />
    </span>
  );
}

import { LoaderCircle, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import type { PlatformId } from "@/providers/catalog";
import mark from "@/assets/images/brand/logo-mark.png";

// The agents section's picture (founder's call, 2026-11-13): your accounts and AgentiqSocial
// joined by a dotted line to an AI assistant that reads your post history and answers a
// question, over a row of top posts. Drawn in code: the feature is coming soon, so this is an
// illustration, labelled as one.
const TOP: Array<{ platform: PlatformId; key: "one" | "two" | "three" }> = [
  { platform: "instagram", key: "one" },
  { platform: "tiktok", key: "two" },
  { platform: "linkedin", key: "three" },
];

export function AgentsVisual() {
  const t = useTranslations("marketing.home.agents.visual");
  return (
    <div role="img" aria-label={t("label")} className="relative overflow-hidden rounded-2xl bg-card-aqua p-5 sm:p-8">
      <div aria-hidden className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3 sm:flex-col sm:pt-6">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-card shadow-card">
            <Image src={mark} alt="" className="h-7 w-auto" />
          </span>
          <span className="h-px w-8 border-t-2 border-dotted border-forest/40 sm:h-8 sm:w-px sm:border-t-0 sm:border-s-2" />
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-forest text-leaf shadow-card">
            <Sparkles className="size-5" />
          </span>
          <span className="h-px w-8 border-t-2 border-dotted border-forest/40 sm:h-8 sm:w-px sm:border-t-0 sm:border-s-2" />
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-card shadow-card">
            <PlatformMark id="instagram" className="rounded-lg" />
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="flex items-center gap-2 text-sm text-muted-foreground italic">
              <LoaderCircle className="size-4 animate-spin text-success motion-reduce:animate-none" />
              {t("status")}
            </p>
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm font-medium">{t("prompt")}</p>
            <p className="mt-3 text-sm leading-relaxed">{t("answer")}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="text-sm font-semibold">{t("top")}</p>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {TOP.map(({ platform, key }, i) => (
                <li key={key} className="rounded-lg border border-border p-2">
                  <span className="flex items-center justify-between text-[11px] text-muted-foreground">
                    #{i + 1}
                    <PlatformMark id={platform} size="sm" className="rounded" />
                  </span>
                  <span className="mt-1.5 block truncate text-xs">{t(`posts.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

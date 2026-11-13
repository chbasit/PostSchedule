import { CircleAlert, ImageIcon, Minus, Plus, RotateCw, Shirt, Sparkles, Briefcase, PenLine, Hash, Smile } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/providers/catalog";

// The AI Assistant page's pictures (founder's call, 2026-11-13), drawn in code from the
// product's own parts: the assistant's rewrite card, the "what should we write about" box, an
// ideas board and the composer adapting one post for each platform. Each is one labelled image.

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl bg-card p-5 text-foreground shadow-card ring-1 ring-black/5", className)}>{children}</div>;
}

function Title() {
  const t = useTranslations("marketing.aiPage.visuals");
  return (
    <p className="flex items-center gap-2 font-heading text-lg font-semibold text-violet-700 dark:text-violet-300">
      <Sparkles className="size-5" aria-hidden /> {t("assistant")}
    </p>
  );
}

const ACTIONS = [
  { key: "rephrase", icon: PenLine },
  { key: "shorten", icon: Minus },
  { key: "expand", icon: Plus },
  { key: "casual", icon: Shirt },
  { key: "formal", icon: Briefcase },
] as const;

export function RewriteVisual({ className }: { className?: string }) {
  const t = useTranslations("marketing.aiPage.visuals");
  return (
    <div role="img" aria-label={t("rewriteLabel")} className={className}>
      <Card className="mx-auto max-w-md">
        <Title />
        <p className="mt-4 text-sm font-semibold">{t("rephraseLabel")}</p>
        <p className="mt-2 truncate rounded-xl bg-muted px-3 py-2.5 text-sm">{t("original")}</p>
        <div className="mt-3 rounded-xl bg-linear-to-br from-violet-50 to-card-lavender/40 p-4 ring-1 ring-violet-200 dark:from-violet-950/40 dark:ring-violet-800">
          <p className="text-[15px] leading-relaxed">{t("rewritten")}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <RotateCw className="size-4" aria-hidden /> {t("retry")}
            </span>
            <span className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("replace")}</span>
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {ACTIONS.map(({ key, icon: Icon }) => (
            <li key={key} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm">
              <Icon className="size-4 text-violet-600 dark:text-violet-300" aria-hidden /> {t(`actions.${key}`)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function GenerateVisual({ className }: { className?: string }) {
  const t = useTranslations("marketing.aiPage.visuals");
  return (
    <div role="img" aria-label={t("generateLabel")} className={className}>
      <Card className="mx-auto max-w-md">
        <Title />
        <p className="mt-4 text-sm font-semibold">{t("askLabel")}</p>
        <p className="mt-2 min-h-24 rounded-xl border-2 border-violet-400 p-3 text-[15px] leading-relaxed">{t("prompt")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("tip")}</p>
        <div className="mt-4 flex justify-end">
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Sparkles className="size-4" aria-hidden /> {t("generate")}
          </span>
        </div>
        <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden /> {t("review")}
        </p>
      </Card>
    </div>
  );
}

type TagKey = "video" | "behind" | "photos" | "tips" | "poll" | "community";

const IDEAS: Array<{ key: "one" | "two" | "three"; tags: Array<{ key: TagKey; tint: string }>; tint: string }> = [
  { key: "one", tint: "from-card-aqua to-card-lavender", tags: [{ key: "video", tint: "bg-card-aqua" }, { key: "behind", tint: "bg-card-yellow" }] },
  { key: "two", tint: "from-card-salmon to-card-yellow", tags: [{ key: "photos", tint: "bg-card-salmon" }, { key: "tips", tint: "bg-primary" }] },
  { key: "three", tint: "from-card-lavender to-card-pink", tags: [{ key: "poll", tint: "bg-card-lavender" }, { key: "community", tint: "bg-card-aqua" }] },
];

export function IdeasVisual({ className }: { className?: string }) {
  const t = useTranslations("marketing.aiPage.visuals");
  return (
    <div role="img" aria-label={t("ideasLabel")} className={cn("grid gap-3 sm:grid-cols-[0.9fr_1.1fr]", className)}>
      <Card>
        <Title />
        <p className="mt-4 rounded-xl bg-muted p-3 text-[15px] leading-relaxed">{t("ideasPrompt")}</p>
        <span className="mt-4 block rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">{t("generateIdeas")}</span>
      </Card>
      <ul className="grid gap-3">
        {IDEAS.map(({ key, tags, tint }) => (
          <li key={key} className="flex gap-3 rounded-xl bg-card p-3 shadow-card ring-1 ring-black/5">
            <span aria-hidden className={cn("size-14 shrink-0 rounded-lg bg-linear-to-br", tint)} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{t(`ideas.${key}`)}</span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag.key} className={cn("rounded-md px-2 py-0.5 text-xs font-medium text-forest", tag.tint)}>
                    {t(`tags.${tag.key}`)}
                  </span>
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ACCOUNTS: PlatformId[] = ["linkedin", "bluesky", "instagram", "facebook"];

export function TailorVisual({ className }: { className?: string }) {
  const t = useTranslations("marketing.aiPage.visuals");
  return (
    <div role="img" aria-label={t("tailorLabel")} className={className}>
      <Card className="mx-auto max-w-lg">
        <ul className="flex gap-3">
          {ACCOUNTS.map((id, i) => (
            <li key={id} className={cn("relative size-11 rounded-full bg-linear-to-br from-card-yellow to-card-salmon", i === 0 ? "ring-2 ring-forest ring-offset-2" : "opacity-50 grayscale")}>
              <PlatformMark id={id} size="sm" className="absolute -end-1 -bottom-1 rounded-full ring-2 ring-card" />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-3">
          <PlatformMark id="linkedin" className="mt-1 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 rounded-xl border border-border">
            <p className="m-2 rounded-md bg-card-pink/60 p-2 text-sm leading-relaxed">{t("tailored")}</p>
            <div className="flex gap-2 px-2 pb-2">
              <span aria-hidden className="h-16 w-20 rounded-lg bg-linear-to-br from-card-yellow to-card-salmon" />
              <span aria-hidden className="h-16 w-20 rounded-lg bg-linear-to-br from-card-aqua to-card-lavender" />
            </div>
            <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-muted-foreground">
              <ImageIcon className="size-4" aria-hidden />
              <Smile className="size-4" aria-hidden />
              <Hash className="size-4" aria-hidden />
              <span className="ms-auto inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <Sparkles className="size-3.5" aria-hidden /> {t("assistant")}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <span className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("adapt")}</span>
        </div>
      </Card>
    </div>
  );
}

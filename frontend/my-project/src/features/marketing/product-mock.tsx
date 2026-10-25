import { Check, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";

// Illustration of the composer for the hero. Decorative: the same facts are in the page text.
export function ProductMock() {
  const t = useTranslations("marketing.mock");
  return (
    <div aria-hidden className="relative isolate select-none">
      {/* Coral shape: decorative only (FRONTEND.md §2.2) */}
      <svg viewBox="0 0 600 520" className="absolute -inset-x-6 -bottom-10 -top-6 -z-10 h-[calc(100%+4rem)] w-[calc(100%+3rem)]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="coral" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--brand-coral)" />
            <stop offset="1" stopColor="var(--brand-coral-soft)" />
          </linearGradient>
        </defs>
        <path d="M60 470C-10 360 40 170 210 90S540 10 590 150 520 470 360 500 120 560 60 470Z" fill="url(#coral)" />
      </svg>

      <div className="overflow-hidden rounded-xl border border-input/50 bg-card">
        <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2">
          <span className="size-2.5 rounded-full bg-ink/20" />
          <span className="size-2.5 rounded-full bg-ink/20" />
          <span className="size-2.5 rounded-full bg-ink/20" />
          <span className="ms-3 text-xs text-muted-foreground">{t("title")}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4 p-4 sm:grid-cols-[0.9fr_1.2fr_auto]">
          <div className="hidden space-y-2 sm:block">
            <p className="eyebrow">{t("accounts")}</p>
            {(["instagram", "tiktok", "youtube"] as const).map((id, i) => (
              <div key={id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs">
                <span className={`inline-flex size-3.5 items-center justify-center rounded-[3px] ${i < 2 ? "bg-primary text-primary-foreground" : "border border-input"}`}>
                  {i < 2 ? <Check className="size-2.5" strokeWidth={3} /> : null}
                </span>
                <PlatformMark id={id} size="sm" />
                <span className="truncate">@northwind</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="eyebrow">{t("media")}</p>
            <div className="relative aspect-video overflow-hidden rounded bg-gradient-to-br from-[#2f6fe4] via-[#6e4fe0] to-[#ff7d4b]">
              <div className="absolute inset-y-0 left-1/2 w-[31.6%] -translate-x-1/2 border-x-2 border-dashed border-white/90 bg-white/10" />
              <span className="absolute bottom-1.5 start-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-xs text-white">16:9 · 1920×1080</span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-2 w-11/12 rounded bg-muted" />
              <div className="h-2 w-8/12 rounded bg-muted" />
            </div>
          </div>

          <div className="w-28 space-y-2 sm:w-32">
            <div className="mx-auto aspect-[9/16] w-full overflow-hidden rounded-[14px] border-4 border-ink bg-ink">
              <div className="h-full w-full bg-gradient-to-b from-[#6e4fe0] to-[#ff7d4b]" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5 border-t bg-background p-3">
          <div className="flex items-center gap-2 rounded bg-warning-bg px-2 py-1.5 text-xs text-warning">
            <TriangleAlert className="size-3.5 shrink-0" />
            <span className="flex-1">{t("warning")}</span>
            <span className="rounded bg-ink px-1.5 py-0.5 text-xs font-semibold text-white">{t("fix")}</span>
          </div>
          <div className="flex gap-3 px-2 text-xs text-success">
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5" /> {t("duration")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5" /> {t("size")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

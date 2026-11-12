import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// What goes wrong without the product, in two cards (founder's call, 2026-11-11): posting by
// hand, and basic schedulers in general (no product is named). Each point is something the
// product fixes, as the sections above show.
const SIDES = [
  { key: "manual", items: ["manual.items.time", "manual.items.missed", "manual.items.looks"], surface: "bg-card ring-1 ring-border" },
  { key: "basic", items: ["basic.items.hope", "basic.items.preview", "basic.items.fixes"], surface: "bg-muted" },
] as const;

export function Comparison() {
  const t = useTranslations("marketing.home.compare");
  return (
    <section aria-labelledby="compare-title" className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
      <h2 id="compare-title" className="display text-center text-4xl text-balance md:text-5xl lg:text-6xl pt-6 pb-2 md:pt-10 md:pb-4">
        {t("title")}
      </h2>
      <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
        {SIDES.map((side) => (
          <div key={side.key} className={cn("rounded-2xl p-6 sm:p-8", side.surface)}>
            <h3 className="font-heading text-2xl font-semibold tracking-tight">{t(`${side.key}.title`)}</h3>
            <ul className="mt-6 space-y-6">
              {side.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
                    <X className="size-3.5" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block text-lg font-semibold">{t(`${item}.title`)}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{t(`${item}.body`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

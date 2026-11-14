import { ArrowRight, CalendarClock, Check, Hand, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import mark from "@/assets/images/brand/logo-mark.png";

// What goes wrong without the product, and what changes with it (founder's call, 2026-11-13):
// posting by hand and basic schedulers in general (no product is named) on light grey, then
// the product on forest. Each point on forest answers the ones beside it, and is built.
const SIDES = [
  { key: "manual", icon: Hand, chip: "bg-card-salmon", items: ["manual.items.time", "manual.items.missed", "manual.items.looks"] },
  { key: "basic", icon: CalendarClock, chip: "bg-card-lavender", items: ["basic.items.hope", "basic.items.preview", "basic.items.fixes"] },
] as const;

const OURS = ["together", "checked", "fix"] as const;

export function Comparison() {
  const t = useTranslations("marketing.home.compare");
  const th = useTranslations("marketing.home");
  return (
    <section aria-labelledby="compare-title" className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
      <h2 id="compare-title" className="display mx-auto max-w-3xl text-center text-3xl text-balance sm:text-4xl md:text-5xl">
        {t("title")}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-base text-balance text-muted-foreground sm:text-lg md:mt-5 md:text-xl">{t("sub", { product: PRODUCT_NAME })}</p>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {SIDES.map(({ key, icon: Icon, chip, items }) => (
          <div key={key} className="rounded-2xl bg-band p-6 sm:p-8 dark:ring-1 dark:ring-border">
            <div className="flex items-center gap-3">
              <span aria-hidden className={cn("inline-flex size-11 items-center justify-center rounded-xl text-forest", chip)}>
                <Icon className="size-5" />
              </span>
              <h3 className="font-heading text-xl font-medium tracking-tight md:text-2xl">{t(`${key}.title`)}</h3>
            </div>
            <ul className="mt-7 space-y-6">
              {items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
                    <X className="size-3.5" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block text-base font-medium md:text-lg">{t(`${item}.title`)}</span>
                    <span className="mt-1 block text-sm text-muted-foreground md:text-base">{t(`${item}.body`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex flex-col rounded-2xl bg-forest p-6 text-white sm:p-8">
          <div className="flex items-center gap-3">
            <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-xl bg-white">
              <Image src={mark} alt="" className="h-6 w-auto" />
            </span>
            <h3 className="font-heading text-xl font-medium tracking-tight md:text-2xl">{t("ours.title", { product: PRODUCT_NAME })}</h3>
          </div>
          <ul className="mt-7 space-y-6">
            {OURS.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-leaf text-forest">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>
                  <span className="block text-base font-medium md:text-lg">{t(`ours.items.${item}.title`)}</span>
                  <span className="mt-1 block text-sm text-white/75 md:text-base">{t(`ours.items.${item}.body`)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full px-7 sm:w-auto")}>
              {th("ctaPrimary")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

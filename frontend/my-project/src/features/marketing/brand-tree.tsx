import { Briefcase, Building2, Croissant, Dumbbell, ShoppingBag, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PRODUCT_NAME } from "@/config/site";
import mark from "@/assets/images/brand/logo-mark.png";

// One account, a workspace per brand (founder's call, 2026-11-11): the logo with lines
// branching to six example brands. No count of brands is claimed. The lines end on the centres
// of the six columns below them, so they only show where the brands sit in one row (sm up).
const BRANDS: Array<{ key: "bakery" | "agency" | "realEstate" | "fitness" | "shop" | "restaurant"; icon: LucideIcon }> = [
  { key: "bakery", icon: Croissant },
  { key: "agency", icon: Briefcase },
  { key: "realEstate", icon: Building2 },
  { key: "fitness", icon: Dumbbell },
  { key: "shop", icon: ShoppingBag },
  { key: "restaurant", icon: UtensilsCrossed },
];

export function BrandTree() {
  const t = useTranslations("marketing.home.brands");
  const tw = useTranslations("marketing.home.businesses");
  const step = 600 / BRANDS.length;
  return (
    <section aria-labelledby="brands-title" className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6 md:pb-24 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 id="brands-title" className="display text-4xl text-balance md:text-5xl lg:text-6xl pt-6 pb-2 md:pt-10 md:pb-4">
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-balance text-muted-foreground">{t("sub")}</p>
      </div>
      <div role="img" aria-label={t("visual", { product: PRODUCT_NAME })} className="mx-auto mt-12 max-w-4xl">
        <div aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-card shadow-card ring-1 ring-border">
          <Image src={mark} alt="" className="h-9 w-auto" />
        </div>
        <svg aria-hidden viewBox="0 0 600 120" preserveAspectRatio="none" className="hidden h-28 w-full text-foreground/20 sm:block" fill="none">
          {BRANDS.map((brand, i) => {
            const x = step * i + step / 2;
            return <path key={brand.key} d={`M300 0 C 300 70, ${x} 50, ${x} 120`} stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <ul aria-hidden className="mt-8 grid grid-cols-3 gap-y-6 sm:mt-0 sm:grid-cols-6">
          {BRANDS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex flex-col items-center gap-2">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-card-periwinkle">
                <Icon className="size-5" />
              </span>
              <span className="text-center font-medium">{tw(`${key}.label`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

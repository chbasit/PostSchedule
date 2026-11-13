import { Briefcase, Building2, Croissant, Dumbbell, ShoppingBag, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PRODUCT_NAME } from "@/config/site";
import { cn } from "@/lib/utils";
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

// The founder's card tints, in turn (2026-11-13), all clear on the lavender panel.
const CHIPS = ["bg-card-aqua", "bg-card-salmon", "bg-card-yellow"];

// The picture only; the homepage puts it on a coloured panel beside its words (2026-11-13).
export function BrandTreeVisual() {
  const t = useTranslations("marketing.home.brands");
  const tw = useTranslations("marketing.home.businesses");
  const step = 600 / BRANDS.length;
  return (
    <div role="img" aria-label={t("visual", { product: PRODUCT_NAME })} className="mx-auto w-full max-w-xl">
      <div aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-card shadow-card">
        <Image src={mark} alt="" className="h-9 w-auto" />
      </div>
      <svg aria-hidden viewBox="0 0 600 120" preserveAspectRatio="none" className="hidden h-24 w-full text-forest/30 sm:block" fill="none">
        {BRANDS.map((brand, i) => {
          const x = step * i + step / 2;
          return <path key={brand.key} d={`M300 0 C 300 70, ${x} 50, ${x} 120`} stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <ul aria-hidden className="mt-6 grid grid-cols-3 gap-y-5 sm:mt-0 sm:grid-cols-6">
        {BRANDS.map(({ key, icon: Icon }, i) => (
          <li key={key} className="flex flex-col items-center gap-2">
            <span className={cn("inline-flex size-12 items-center justify-center rounded-xl text-forest shadow-card", CHIPS[i % CHIPS.length])}>
              <Icon className="size-5" />
            </span>
            <span className="text-center text-sm font-medium text-forest">{tw(`${key}.label`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

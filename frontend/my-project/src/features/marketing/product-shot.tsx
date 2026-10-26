import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PRODUCT_NAME } from "@/config/site";
import arDark from "@/assets/screens/dashboard-ar-dark.webp";
import arLight from "@/assets/screens/dashboard-ar-light.webp";
import enDark from "@/assets/screens/dashboard-en-dark.webp";
import enLight from "@/assets/screens/dashboard-en-light.webp";

// The real dashboard (sample workspace) in the visitor's theme, with rounded corners and no
// frame. Arabic pages show the right-to-left screen; the other languages show the English one.
// Both images stay lazy so only the visible theme downloads (Next.js image docs, "Theme
// detection"); fetchPriority lifts it because it is the hero's largest element.
const SHOTS = { en: { light: enLight, dark: enDark }, ar: { light: arLight, dark: arDark } } as const;

// Landing container 1440 px minus its padding, and the panel's own padding on wide screens.
const SIZES = "(min-width: 1440px) 1344px, (min-width: 768px) 92vw, 100vw";

export function ProductShot() {
  const t = useTranslations("marketing.home");
  const shot = useLocale() === "ar" ? SHOTS.ar : SHOTS.en;
  const alt = t("shotAlt", { product: PRODUCT_NAME });

  return (
    <figure className="overflow-hidden rounded-2xl bg-card">
      <Image src={shot.light} alt={alt} sizes={SIZES} placeholder="blur" fetchPriority="high" className="h-auto w-full dark:hidden" />
      <Image src={shot.dark} alt={alt} sizes={SIZES} placeholder="blur" fetchPriority="high" className="hidden h-auto w-full dark:block" />
    </figure>
  );
}

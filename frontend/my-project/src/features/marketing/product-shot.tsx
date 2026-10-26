import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PRODUCT_NAME } from "@/config/site";
import arDark from "@/assets/screens/dashboard-ar-dark.webp";
import arLight from "@/assets/screens/dashboard-ar-light.webp";
import enDark from "@/assets/screens/dashboard-en-dark.webp";
import enLight from "@/assets/screens/dashboard-en-light.webp";
import { BrowserFrame } from "./browser-frame";

// The real dashboard (sample workspace) in a browser frame, in the visitor's theme. Arabic
// pages show the right-to-left screen; the other languages show the English one.
// Both images stay lazy so only the visible theme downloads (Next.js image docs, "Theme
// detection"); fetchPriority lifts it because it is the hero's largest element.
const SHOTS = { en: { light: enLight, dark: enDark }, ar: { light: arLight, dark: arDark } } as const;

// Marketing container 1200 px minus its padding, and the frame's own padding on wide screens.
const SIZES = "(min-width: 1200px) 1088px, (min-width: 768px) 90vw, 100vw";

export function ProductShot() {
  const t = useTranslations("marketing.home");
  const shot = useLocale() === "ar" ? SHOTS.ar : SHOTS.en;
  const alt = t("shotAlt", { product: PRODUCT_NAME });

  return (
    <BrowserFrame>
      <Image src={shot.light} alt={alt} sizes={SIZES} placeholder="blur" fetchPriority="high" className="h-auto w-full dark:hidden" />
      <Image src={shot.dark} alt={alt} sizes={SIZES} placeholder="blur" fetchPriority="high" className="hidden h-auto w-full dark:block" />
    </BrowserFrame>
  );
}

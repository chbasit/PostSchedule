import {
  Briefcase,
  Building2,
  Clapperboard,
  Croissant,
  Dumbbell,
  Flower2,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import bakery from "@/assets/images/landing/bakery.webp";
import fitness from "@/assets/images/landing/fitness.webp";
import realEstate from "@/assets/images/landing/real-estate.webp";
import restaurant from "@/assets/images/landing/restaurant.webp";
import { PlatformMark } from "@/components/platform-badge";
import type { PlatformId } from "@/providers/catalog";
import { cn } from "@/lib/utils";
import { Marquee } from "./marquee";

type Business = "realEstate" | "beauty" | "bakery" | "agency" | "restaurant" | "shop" | "fitness" | "creator";

// "post" cards show a sample post for that business, with a stock photo (Unsplash License,
// see src/assets/images/landing/CREDITS.md); "use" cards say how it uses the app. All sit on the
// same neutral grey.
type Tile = { business: Business; kind: "post" | "use"; icon: LucideIcon; photo?: StaticImageData; platforms: PlatformId[] };

const TILES: Tile[] = [
  { business: "realEstate", kind: "post", icon: Building2, photo: realEstate, platforms: ["instagram", "facebook", "linkedin"] },
  { business: "beauty", kind: "use", icon: Flower2, platforms: ["instagram", "tiktok"] },
  { business: "agency", kind: "use", icon: Briefcase, platforms: ["linkedin", "facebook", "instagram", "bluesky"] },
  { business: "bakery", kind: "post", icon: Croissant, photo: bakery, platforms: ["instagram", "tiktok", "facebook"] },
  { business: "restaurant", kind: "post", icon: UtensilsCrossed, photo: restaurant, platforms: ["instagram", "facebook", "tiktok"] },
  { business: "shop", kind: "use", icon: ShoppingBag, platforms: ["instagram", "tiktok", "youtube", "facebook"] },
  { business: "creator", kind: "use", icon: Clapperboard, platforms: ["tiktok", "instagram", "youtube"] },
  { business: "fitness", kind: "post", icon: Dumbbell, photo: fitness, platforms: ["instagram", "tiktok", "youtube"] },
];

// Every card has the same width in the sliding row; the photo fills it.
const CARD = "w-[17rem] shrink-0 sm:w-72";
const PHOTO_SIZES = "(min-width: 640px) 288px, 272px";

function Marks({ ids }: { ids: PlatformId[] }) {
  return (
    <ul aria-hidden className="flex gap-1.5">
      {ids.map((id) => (
        <li key={id}>
          <PlatformMark id={id} size="sm" className="size-6 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

function Label({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", onDark ? "bg-foreground/85 text-background" : "bg-card text-foreground")}>
      {children}
    </span>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  const t = useTranslations("marketing.home.wall.items");
  const Icon = tile.icon;
  const label = t(`${tile.business}.label`);
  if (tile.kind === "use") {
    return (
      <li className={cn(CARD, "flex flex-col rounded-2xl bg-muted p-6")}>
        <div className="flex items-center justify-between gap-3">
          <Label>{label}</Label>
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <p className="mt-5 text-[15px] leading-relaxed">{t(`${tile.business}.text`)}</p>
        <div className="mt-auto pt-6">
          <Marks ids={tile.platforms} />
        </div>
      </li>
    );
  }
  return (
    <li className={cn(CARD, "rounded-2xl bg-muted p-3 pb-4")}>
      <Label onDark>{label}</Label>
      <div className="mt-3 rounded-xl bg-card p-3">
        <div aria-hidden className="flex items-center gap-2">
          <PlatformMark id={tile.platforms[0]} size="sm" className="size-6 rounded-full" />
          <span className="h-2 w-20 rounded-full bg-muted" />
        </div>
        {tile.photo ? (
          <Image src={tile.photo} alt="" sizes={PHOTO_SIZES} placeholder="blur" className="mt-3 aspect-[4/5] h-auto w-full rounded-lg object-cover" />
        ) : (
          <div aria-hidden className="mt-3 flex aspect-[4/5] items-center justify-center rounded-lg bg-muted">
            <Icon className="size-14 text-foreground/60" strokeWidth={1.5} />
          </div>
        )}
        <p className="mt-3 text-sm leading-relaxed">{t(`${tile.business}.text`)}</p>
        <div className="mt-3">
          <Marks ids={tile.platforms} />
        </div>
      </div>
    </li>
  );
}

// Sample posts and uses for different businesses (examples, not customers), in a row that
// slides on its own (founder's call, 2026-11-11). Real reviews have their own section
// (customer-reviews.tsx).
export function BusinessWall() {
  const t = useTranslations("marketing.home.wall");
  return (
    <section aria-labelledby="wall-title" className="py-16 md:py-24">
      <div className="mx-auto max-w-2xl px-4 text-center md:px-6">
        <h2 id="wall-title" className="display text-3xl text-balance md:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">{t("sub")}</p>
      </div>
      <Marquee label={t("title")} align="center" className="mx-auto mt-12 max-w-[1440px]">
        {TILES.map((tile) => (
          <TileCard key={tile.business} tile={tile} />
        ))}
      </Marquee>
    </section>
  );
}

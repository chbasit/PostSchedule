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
import { ParallaxColumns } from "./parallax-columns";
import { TESTIMONIALS, type Testimonial } from "./testimonials";

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

// Real reviews (testimonials.ts) replace these "use" cards in this order, so the wall keeps
// its shape; any beyond four are added at the end.
const REVIEW_SLOTS: Business[] = ["creator", "agency", "beauty", "shop"];

// A post card is a quarter of the row on wide screens, half on tablets, all of it on phones.
const PHOTO_SIZES = "(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw";

// Four columns of two tiles; the speeds differ so neighbouring columns drift apart.
const COLUMNS = [
  { speed: 110, className: "" },
  { speed: 230, className: "hidden sm:flex sm:pt-16" },
  { speed: 110, className: "hidden lg:flex" },
  { speed: 230, className: "hidden lg:flex lg:pt-16" },
];

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
      <li className="flex flex-col rounded-[24px] bg-muted p-6">
        <div className="flex items-center justify-between gap-3">
          <Label>{label}</Label>
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <p className="mt-5 text-[15px] leading-relaxed">{t(`${tile.business}.text`)}</p>
        <div className="mt-6">
          <Marks ids={tile.platforms} />
        </div>
      </li>
    );
  }
  return (
    <li className="rounded-[24px] bg-muted p-3 pb-4">
      <Label onDark>{label}</Label>
      <div className="mt-3 rounded-2xl bg-card p-3">
        <div aria-hidden className="flex items-center gap-2">
          <PlatformMark id={tile.platforms[0]} size="sm" className="size-6 rounded-full" />
          <span className="h-2 w-20 rounded-full bg-muted" />
        </div>
        {tile.photo ? (
          <Image src={tile.photo} alt="" sizes={PHOTO_SIZES} placeholder="blur" className="mt-3 aspect-[4/5] h-auto w-full rounded-xl object-cover" />
        ) : (
          <div aria-hidden className="mt-3 flex aspect-[4/5] items-center justify-center rounded-xl bg-muted">
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

// A customer review: the quote and who said it, no stars. The same reviews are in the
// page's JSON-LD (reviewSchema), so search engines can read them.
function ReviewCard({ item }: { item: Testimonial }) {
  return (
    <li className="rounded-[24px] bg-muted p-6">
      <figure className="flex flex-col">
        <blockquote className="text-[15px] leading-relaxed">
          <p>“{item.quote}”</p>
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-3">
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small local photos, sized here
            <img src={item.photo} alt="" width={36} height={36} className="size-9 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-card text-sm font-semibold">
              {item.name.slice(0, 1)}
            </span>
          )}
          <span className="text-sm">
            <span className="block font-medium">{item.name}</span>
            <span className="block text-muted-foreground">{item.role}</span>
          </span>
        </figcaption>
      </figure>
    </li>
  );
}

// A wall of businesses that post with the product, in drifting columns. Real customer
// reviews (testimonials.ts) replace the "use" cards once there are any.
export function BusinessWall() {
  const t = useTranslations("marketing.home.wall");
  const items: ReactNode[] = TILES.map((tile) => <TileCard key={tile.business} tile={tile} />);
  TESTIMONIALS.forEach((item, i) => {
    const card = <ReviewCard key={`review-${i}`} item={item} />;
    const slot = TILES.findIndex((tile) => tile.business === REVIEW_SLOTS[i]);
    if (slot >= 0) items[slot] = card;
    else items.push(card);
  });
  // Filled column by column, so each column alternates a sample post and a use.
  const per = Math.ceil(items.length / COLUMNS.length);
  const columns = COLUMNS.map((column, c) => ({
    ...column,
    children: <ul className="contents">{items.slice(c * per, (c + 1) * per)}</ul>,
  }));

  return (
    <section aria-labelledby="wall-title" className="overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="wall-title" className="display text-3xl text-balance md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("sub")}</p>
        </div>
        <ParallaxColumns columns={columns} className="mt-12 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4" />
      </div>
    </section>
  );
}

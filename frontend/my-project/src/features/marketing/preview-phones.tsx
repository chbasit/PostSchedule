"use client";

import { Camera, Check, EllipsisVertical, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import bakery from "@/assets/images/landing/bakery.webp";
import { PlatformMark } from "@/components/platform-badge";
import { PostPreview } from "@/features/composer/post-preview";
import type { SocialAccount } from "@/lib/api/client";
import { getPlatform, type PlatformId } from "@/providers/catalog";
import { cn } from "@/lib/utils";

// One sample post shown the way the app's composer previews it on each platform (Reels,
// TikTok, Shorts): the same PostPreview, so the landing shows what customers really get.
// The photo is the bakery card's (Unsplash License, see CREDITS.md); the caption is its text.
const ACCOUNT: SocialAccount = {
  id: "landing-sample",
  workspaceId: "landing",
  provider: "instagram",
  displayName: "Your brand",
  handle: "yourbrand",
  status: "active",
  createdAt: "2026-11-03T00:00:00Z",
};

const MEDIA = [{ id: "landing-bakery", kind: "image" as const, previewUrl: bakery.src, width: bakery.width, height: bakery.height }];

// Each app's own top bar over the player; the words are the apps' names for these screens,
// which they keep in every language.
const TOP_BARS: Partial<Record<PlatformId, ReactNode>> = {
  instagram: (
    <>
      <span className="text-sm font-semibold">Reels</span>
      <Camera className="size-[18px]" />
    </>
  ),
  tiktok: (
    <>
      <span className="rounded border border-white/80 px-1 text-[9px] font-bold leading-4">LIVE</span>
      <Search className="size-[18px]" />
    </>
  ),
  youtube: (
    <>
      <span />
      <span className="flex gap-3">
        <Search className="size-[18px]" />
        <EllipsisVertical className="size-[18px]" />
      </span>
    </>
  ),
};

// badge: the top corner for the ready mark, the one the front phone does not cover.
function Phone({ id, badge = "end", className }: { id: PlatformId; badge?: "start" | "end"; className?: string }) {
  const t = useTranslations("marketing.home.businesses");
  const platform = getPlatform(id);
  return (
    <div className={cn("absolute top-0 w-[250px] [&_figcaption]:hidden", className)}>
      <div className="relative">
        <PostPreview platform={platform} account={{ ...ACCOUNT, provider: id }} type="video" caption={t("bakery.text")} media={MEDIA} fill />
        <div aria-hidden className="absolute inset-x-[5px] top-[5px] z-20 flex items-center justify-between px-3 pt-2.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {TOP_BARS[id]}
        </div>
        <span
          className={cn(
            "absolute -top-2 z-30 inline-flex size-8 items-center justify-center rounded-full bg-highlight text-highlight-foreground ring-4 ring-ink",
            badge === "end" ? "-end-2" : "-start-2",
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}

// Instagram in front, TikTok and YouTube angled behind. Drawn at a fixed size and zoomed to
// fit the column, so the phones keep the app's real proportions at every width.
export function PreviewPhones({ label }: { label: string }) {
  return (
    <div role="img" aria-label={label} className="mx-auto w-[560px] [zoom:0.6] min-[440px]:[zoom:0.68] sm:[zoom:1] lg:[zoom:0.78] xl:[zoom:1]">
      <div className="relative h-[470px]">
        <Phone id="tiktok" badge="start" className="start-0 top-10 origin-bottom -rotate-[8deg] scale-[0.84] rtl:rotate-[8deg]" />
        <Phone id="youtube" className="end-0 top-10 origin-bottom rotate-[8deg] scale-[0.84] rtl:-rotate-[8deg]" />
        <Phone id="instagram" className="start-[155px] z-10" />
      </div>
      <ul aria-hidden className="mt-6 flex flex-wrap justify-center gap-2">
        {(["instagram", "tiktok", "youtube"] as const).map((id) => (
          <li key={id} className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 ps-1 pe-3 text-sm text-white">
            <PlatformMark id={id} size="sm" className="rounded-full" />
            {getPlatform(id).name}
            <Check className="size-3.5 text-white/70" strokeWidth={3} />
          </li>
        ))}
      </ul>
    </div>
  );
}

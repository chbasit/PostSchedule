"use client";

import { ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { cn } from "@/lib/utils";
import type { PlatformDescriptor } from "@/providers/catalog";

type Props = {
  platform: PlatformDescriptor;
  media: { kind: "image" | "video"; url: string | null; width: number; height: number } | null;
  caption: string;
  handle: string;
  // "frame" shows the platform's video frame; "feed" shows an image or text post card.
  layout?: "frame" | "feed";
  className?: string;
};

// Feed cards show media between 4:5 and 1.91:1, which is the range most feeds display.
function FeedCard({ platform, media, caption, handle, className }: Omit<Props, "layout">) {
  const t = useTranslations("preflight.preview");
  // The URL that failed to load; a new file gets a fresh chance.
  const [failed, setFailed] = useState<string | null>(null);
  const broken = !!media?.url && failed === media.url;
  const ratio = media ? Math.min(1.91, Math.max(0.8, media.width / media.height)) : 1;
  return (
    <figure className={cn("mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border bg-card", className)}>
      <p className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold">
        <PlatformMark id={platform.id} size="sm" className="rounded-full" /> {handle}
      </p>
      {media?.url && !broken ? (
        <div className="bg-muted" style={{ aspectRatio: ratio }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable */}
          <img src={media.url} alt={t("mediaLabel", { platform: platform.name })} className="size-full object-cover" onError={() => setFailed(media.url)} />
        </div>
      ) : media ? (
        <div className="flex items-center justify-center bg-muted text-muted-foreground" style={{ aspectRatio: ratio }}>
          <ImageOff className="size-6" aria-hidden />
        </div>
      ) : null}
      <figcaption className="line-clamp-4 whitespace-pre-wrap break-words px-3 py-2.5 text-sm" dir="auto">
        {caption || <span className="text-muted-foreground">{t("captionPlaceholder")}</span>}
      </figcaption>
    </figure>
  );
}

// Phone-style preview with the crop the platform will apply and safe-zone guides.
// Overlays are approximate until each platform's guide is checked (TEST.md PRE-11).
export function PreviewFrame({ layout = "frame", ...props }: Props) {
  return layout === "feed" ? <FeedCard {...props} /> : <VideoFrame {...props} />;
}

function VideoFrame({ platform, media, caption, handle, className }: Omit<Props, "layout">) {
  const t = useTranslations("preflight.preview");
  // The URL that failed to load; a new file gets a fresh chance.
  const [failed, setFailed] = useState<string | null>(null);
  const broken = !!media?.url && failed === media.url;
  const frameRatio = platform.video.recommendedWidth / platform.video.recommendedHeight;
  const vertical = frameRatio < 1;
  const sourceRatio = media ? media.width / media.height : frameRatio;
  const cropped = media ? Math.abs(sourceRatio - frameRatio) / frameRatio > 0.03 : false;

  return (
    <figure className={cn("mx-auto w-full", vertical ? "max-w-[240px]" : "max-w-[360px]", className)}>
      <div
        className={cn("relative overflow-hidden bg-ink", vertical ? "rounded-[28px] border-[6px] border-ink" : "rounded-lg border-4 border-ink")}
        style={{ aspectRatio: `${platform.video.recommendedWidth} / ${platform.video.recommendedHeight}` }}
      >
        {media?.url && !broken ? (
          media.kind === "video" ? (
            <video src={media.url} className="size-full object-cover" muted loop playsInline autoPlay aria-label={t("mediaLabel", { platform: platform.name })} onError={() => setFailed(media.url)} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
            <img src={media.url} alt={t("mediaLabel", { platform: platform.name })} className="size-full object-cover" onError={() => setFailed(media.url)} />
          )
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#2f6fe4]/60 to-[#6e4fe0]/60 text-white/80">
            <ImageOff className="size-6" aria-hidden />
            <span className="px-4 text-center text-xs">{t("noMedia")}</span>
          </div>
        )}

        {vertical ? (
          <>
            {/* Safe zones: interface overlays cover the top and bottom of vertical video. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[9%] border-b border-dashed border-white/50 bg-ink/25" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] border-t border-dashed border-white/50 bg-gradient-to-t from-ink/80 to-ink/10" />
            <div className="absolute inset-x-0 bottom-0 space-y-1 p-3 pe-10 text-white">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <PlatformMark id={platform.id} size="sm" className="rounded-full" /> {handle}
              </p>
              <p className="line-clamp-2 text-xs leading-snug text-white/90" dir="auto">
                {caption || t("captionPlaceholder")}
              </p>
            </div>
          </>
        ) : null}

        {cropped ? (
          <span className="absolute start-2 top-2 rounded bg-warning-bg px-1.5 py-0.5 text-xs font-semibold text-warning">
            {t("cropped")}
          </span>
        ) : null}
      </div>
      {!vertical ? (
        <figcaption className="mt-2 space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <PlatformMark id={platform.id} size="sm" className="rounded-full" /> {handle}
          </p>
          <p className="line-clamp-3 text-xs text-muted-foreground" dir="auto">
            {caption || t("captionPlaceholder")}
          </p>
        </figcaption>
      ) : (
        <figcaption className="sr-only">{t("frameLabel", { platform: platform.name, format: platform.video.format })}</figcaption>
      )}
    </figure>
  );
}

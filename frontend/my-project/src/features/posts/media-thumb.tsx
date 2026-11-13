"use client";

import { ImageOff, Play } from "lucide-react";
import { useState } from "react";
import type { MediaSummary } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// A post's photo or video from its short-lived signed link (founder's call, 2026-11-13: the
// calendar and the post's details show which post it is at a glance). A video shows its first
// frame with a play mark, or real controls when `playable`; a missing or expired link shows a
// plain tile instead of a broken image.
export function MediaThumb({ media, playable, className }: { media: MediaSummary; playable?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  const url = broken ? null : media.previewUrl;
  return (
    <span className={cn("relative block overflow-hidden rounded-md bg-muted", className)}>
      {!url ? (
        <span className="absolute inset-0 grid place-items-center text-muted-foreground">
          <ImageOff className="size-1/3 max-h-6 max-w-6" aria-hidden />
        </span>
      ) : media.kind === "video" ? (
        <video
          src={playable ? url : `${url}#t=0.1`}
          preload="metadata"
          muted={!playable}
          playsInline
          controls={playable}
          draggable={false}
          onError={() => setBroken(true)}
          className="size-full bg-black object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to the user's own file
        <img src={url} alt="" loading="lazy" draggable={false} onError={() => setBroken(true)} className="size-full object-cover" />
      )}
      {url && media.kind === "video" && !playable ? (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="grid size-5 place-items-center rounded-full bg-black/60 text-white">
            <Play className="size-2.5 fill-current" />
          </span>
        </span>
      ) : null}
    </span>
  );
}

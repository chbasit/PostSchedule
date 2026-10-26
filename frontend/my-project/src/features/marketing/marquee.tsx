"use client";

import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// A row of cards drifting sideways, looped by rendering the list twice (the copy is hidden
// from assistive tech). Hovering or tapping the row holds it; keyboard users get a pause
// button that shows when focused (WCAG 2.2.2). With reduced motion the row stands still and
// scrolls by hand instead.
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations("marketing.home.facts");
  const [paused, setPaused] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] motion-reduce:overflow-x-auto">
        <div
          className={cn(
            "flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none",
            paused && "[animation-play-state:paused]",
          )}
        >
          <ul className="flex gap-4 pe-4">{children}</ul>
          <ul aria-hidden inert className="flex gap-4 pe-4 motion-reduce:hidden">
            {children}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="pointer-events-none absolute inset-x-0 -bottom-6 z-10 mx-auto inline-flex h-9 w-fit items-center gap-2 rounded-full bg-card px-4 text-sm opacity-0 shadow-menu transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 motion-reduce:hidden"
      >
        {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        {paused ? t("play") : t("pause")}
      </button>
    </div>
  );
}

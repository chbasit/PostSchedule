"use client";

import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Connection = { saveData?: boolean };

// A muted product clip that plays while a third of it is on screen and pauses when it
// scrolls away. Nothing downloads before that (preload="none"); phones get the smaller
// copy. Visitors who ask for reduced motion or data saving see the poster and start it
// with the button.
export function ViewportVideo({
  src,
  smallSrc,
  poster,
  label,
  width,
  height,
  className,
}: {
  src: string;
  smallSrc?: string;
  poster: string;
  label: string;
  width: number;
  height: number;
  className?: string;
}) {
  const t = useTranslations("marketing.home.video");
  const ref = useRef<HTMLVideoElement>(null);
  // Set when the visitor pauses: scrolling back must not start it again.
  const held = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const quiet =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator as Navigator & { connection?: Connection }).connection?.saveData === true;
    if (quiet) held.current = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) video.pause();
        else if (!held.current) video.play().catch(() => {});
      },
      { threshold: 0.33 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    held.current = !video.paused;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  return (
    <div className={cn("group/video relative", className)}>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        width={width}
        height={height}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="block h-auto w-full"
      >
        {smallSrc ? <source src={smallSrc} type="video/mp4" media="(max-width: 767px)" /> : null}
        <source src={src} type="video/mp4" />
      </video>
      {/* Out of the way while playing: shown on hover, focus, touch screens and when paused. */}
      <button
        type="button"
        onClick={toggle}
        data-playing={playing}
        aria-label={playing ? t("pause") : t("play")}
        className="absolute end-2.5 top-2.5 inline-flex size-8 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 backdrop-blur-sm transition-[opacity,background-color] hover:bg-ink/85 focus-visible:opacity-100 group-hover/video:opacity-100 data-[playing=false]:opacity-100 [@media(hover:none)]:opacity-100"
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 translate-x-px" aria-hidden />}
      </button>
    </div>
  );
}

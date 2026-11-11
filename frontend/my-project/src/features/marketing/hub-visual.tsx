import Image from "next/image";
import { PlatformMark } from "@/components/platform-badge";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/providers/catalog";
import mark from "@/assets/images/brand/logo-mark.png";

// The landing page's centre picture (founder's call, 2026-11-11): the logo in the middle and
// every platform on a ring around it, the ring turning slowly (still with reduced motion; the
// marks turn back so they stay upright). One labelled image.
export function HubVisual({ label, className }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("relative mx-auto aspect-square w-full max-w-[22rem]", className)}>
      <div aria-hidden className="absolute inset-[12%] rounded-full bg-linear-to-br from-card-lavender via-card-periwinkle to-card-pink blur-2xl" />
      <div aria-hidden className="absolute inset-[7%] rounded-full border border-dashed border-foreground/20" />
      <div aria-hidden className="absolute inset-[24%] rounded-full border border-foreground/10" />
      <ul aria-hidden className="absolute inset-[7%] motion-safe:animate-[spin_48s_linear_infinite]">
        {PLATFORMS.map((p, i) => {
          const angle = (i / PLATFORMS.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <li
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + 50 * Math.cos(angle)}%`, top: `${50 + 50 * Math.sin(angle)}%` }}
            >
              <span className="block rounded-2xl bg-card p-1.5 shadow-card ring-1 ring-border motion-safe:animate-[spin_48s_linear_infinite_reverse]">
                <PlatformMark id={p.id} size="lg" className="rounded-xl" />
              </span>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="absolute inset-[31%] flex items-center justify-center rounded-full bg-card shadow-card ring-1 ring-border">
        <Image src={mark} alt="" className="h-[46%] w-auto" />
      </div>
    </div>
  );
}

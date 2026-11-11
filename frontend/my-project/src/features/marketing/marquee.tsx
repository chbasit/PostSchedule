import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A row of cards that slides sideways on its own and loops (founder's call, 2026-11-11). The
// track holds the row twice and moves by exactly one copy, so the loop has no seam; each copy
// ends with the same gap the cards have between them. It stops while hovered or focused.
// With reduced motion it stands still and scrolls by hand instead, without the copy. Cards
// stretch to one height, or keep their own height and line up on the middle ("center").
export function Marquee({ children, label, align = "stretch", className }: { children: ReactNode; label: string; align?: "stretch" | "center"; className?: string }) {
  const row = cn("flex gap-4 pe-4", align === "center" ? "items-center" : "items-stretch");
  return (
    <div
      className={cn(
        "group/marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] motion-reduce:overflow-x-auto",
        className,
      )}
    >
      <div className="flex w-max motion-safe:animate-marquee group-focus-within/marquee:[animation-play-state:paused] group-hover/marquee:[animation-play-state:paused] rtl:motion-safe:animate-marquee-rtl">
        <ul aria-label={label} className={row}>
          {children}
        </ul>
        <ul aria-hidden className={cn(row, "motion-reduce:hidden")}>
          {children}
        </ul>
      </div>
    </div>
  );
}

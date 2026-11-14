"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FeatureTab = { key: string; title: string; body: string; visual: ReactNode };

// A list of features beside a picture, straight on the page (founder's call, 2026-11-13: no
// coloured panel behind it). A line fills over the open item; when it is full the next item
// opens and its picture fades in. The others stay faded. Hovering or focusing the list pauses
// it; with reduced motion nothing moves on its own and the items open on click.
export function FeatureTabs({ items, label }: { items: FeatureTab[]; label: string }) {
  const [active, setActive] = useState(0);
  const id = useId();

  return (
    // Taller than any one item's text or picture, so the page below does not jump when the
    // next item opens.
    <div className="grid items-center gap-8 lg:min-h-[34rem] lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 xl:min-h-[28rem]">
      <div role="tablist" aria-label={label} aria-orientation="vertical" className="group/tabs">
        {items.map((item, i) => {
          const on = i === active;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={on}
              aria-controls={`${id}-panel`}
              onClick={() => setActive(i)}
              className="relative block w-full border-t border-border py-6 text-start outline-offset-4"
            >
              {on ? (
                <span
                  key={`bar-${active}`}
                  aria-hidden
                  onAnimationEnd={() => setActive((active + 1) % items.length)}
                  className="absolute -top-px start-0 h-0.5 w-full origin-left bg-foreground group-focus-within/tabs:[animation-play-state:paused] group-hover/tabs:[animation-play-state:paused] motion-safe:animate-[tab-progress_7s_linear_forwards] rtl:origin-right"
                />
              ) : null}
              <span className={cn("block font-heading text-xl font-medium tracking-tight transition-opacity duration-300 sm:text-2xl md:text-3xl", on ? "opacity-100" : "opacity-35 hover:opacity-60")}>
                {item.title}
              </span>
              {on ? <span className="mt-3 block max-w-xl animate-fade-in text-base text-muted-foreground md:text-lg">{item.body}</span> : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        className="relative grid place-items-center"
      >
        {items.map((item, i) => (
          <div
            key={item.key}
            aria-hidden={i !== active}
            className={cn("col-start-1 row-start-1 w-full transition-opacity duration-500", i === active ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            {item.visual}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useSyncExternalStore, type ReactNode } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

// The site header's sticky bar. Transparent at the top of the page, so the hero shows through
// (founder's call, 2026-11-14); once the page scrolls under it, it gets a blurred white
// background and a hairline along its lower edge.
export function HeaderBar({ children }: { children: ReactNode }) {
  const scrolled = useSyncExternalStore(subscribe, () => window.scrollY > 8, () => false);
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-40 border-b border-transparent bg-transparent transition-[background-color,border-color,box-shadow] duration-300 data-scrolled:border-border data-scrolled:bg-background/90 data-scrolled:shadow-[0_1px_12px_rgb(0_0_0/0.04)] data-scrolled:backdrop-blur-md"
    >
      {children}
    </header>
  );
}

"use client";

import { useSyncExternalStore, type ReactNode } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

// The site header's sticky bar. It is flat at the top of the page; once the page scrolls
// under it, a hairline marks its lower edge.
export function HeaderBar({ children }: { children: ReactNode }) {
  const scrolled = useSyncExternalStore(subscribe, () => window.scrollY > 0, () => false);
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-40 border-b border-transparent bg-background/85 backdrop-blur-md transition-colors data-scrolled:border-border"
    >
      {children}
    </header>
  );
}

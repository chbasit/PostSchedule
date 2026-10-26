"use client";

import { useEffect } from "react";

// Menus and dialogs render at the end of <body>, outside the marketing wrapper, so the
// font classes are also put on <html> while a marketing page is open. Removed again when
// the visitor moves on to the app.
export function SiteFontsRoot({ className }: { className: string }) {
  useEffect(() => {
    const classes = className.split(" ");
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [className]);
  return null;
}

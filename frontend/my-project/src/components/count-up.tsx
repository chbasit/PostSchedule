"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

// Counts from the last shown value to the new one with an ease-out curve. Screen
// readers get the final number straight away.
export function CountUp({ value, duration = 900, className }: { value: number; duration?: number; className?: string }) {
  const locale = useLocale();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reduce ? 0 : duration;
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      t0 ??= now;
      const p = total === 0 ? 1 : Math.min(1, (now - t0) / total);
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(Math.round(v));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const format = (n: number) => new Intl.NumberFormat(locale).format(n);
  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden className="tabular">
        {format(shown)}
      </span>
    </span>
  );
}

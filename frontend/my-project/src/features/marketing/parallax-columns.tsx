"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Column = { speed: number; className?: string; children: ReactNode };

// Columns that drift against the scroll: scrolling down moves them up, scrolling back up
// moves them down, each at its own speed (pixels over the section's pass through the
// window). From the sm breakpoint only, where the columns sit side by side; never with
// reduced motion. Listens to scroll only while the section is on screen.
export function ParallaxColumns({ columns, className }: { columns: Column[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const pass = window.innerHeight + rect.height;
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / pass));
      el.style.setProperty("--scroll", (progress - 0.5).toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
      } else {
        window.removeEventListener("scroll", onScroll);
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {columns.map((column, i) => (
        <div
          key={i}
          className={cn("flex flex-col gap-4 sm:[transform:translateY(calc(var(--scroll,0)*var(--speed)*-1px))] sm:will-change-transform", column.className)}
          style={{ "--speed": column.speed } as CSSProperties}
        >
          {column.children}
        </div>
      ))}
    </div>
  );
}

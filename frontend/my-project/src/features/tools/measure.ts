"use client";

import { useEffect, useRef, useState } from "react";

// Line breaking measured with the canvas text metrics, for previews with a known width and
// font: where a LinkedIn post folds, where a YouTube title gets cut. Same idea as the
// browser's own wrapping (break at spaces, keep line breaks, cut words wider than a line),
// computed without touching the page, so it can run during render.

let context: CanvasRenderingContext2D | null = null;

// The element's content width, kept up to date as the layout changes (0 until measured).
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function measurer(font: string): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  context ??= document.createElement("canvas").getContext("2d");
  if (context) context.font = font;
  return context;
}

export function wrapLines(text: string, maxWidth: number, font: string): string[] {
  const c = measurer(font);
  if (!c) return text.split("\n");
  const fits = (s: string) => c.measureText(s.trimEnd()).width <= maxWidth;
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.match(/\s*\S+\s*/g) ?? [""]) {
      if (fits(line + word)) {
        line += word;
        continue;
      }
      if (line) {
        lines.push(line.trimEnd());
        line = "";
      }
      // A word wider than the whole line is cut wherever it overflows.
      for (const ch of word.trimStart()) {
        if (line && !fits(line + ch)) {
          lines.push(line);
          line = "";
        }
        line += ch;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

// How many characters show in `maxLines` lines when the rest is cut with "…"; the whole
// length when it fits.
export function visibleChars(text: string, maxWidth: number, font: string, maxLines: number): number {
  const total = [...text].length;
  const c = measurer(font);
  if (!c || !text) return total;
  const lines = wrapLines(text, maxWidth, font);
  if (lines.length <= maxLines) return total;
  let last = [...lines[maxLines - 1]];
  while (last.length && c.measureText(`${last.join("")}…`).width > maxWidth) last = last.slice(0, -1);
  // Earlier lines, plus the one space each line break swallowed.
  const before = lines.slice(0, maxLines - 1).reduce((n, line) => n + [...line].length + 1, 0);
  return Math.min(total, before + last.length);
}

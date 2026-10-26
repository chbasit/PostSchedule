import type { ReactNode } from "react";

// Plus Jakarta Sans gives its full stop and comma a wide left side, so at headline sizes
// "word." reads as "word ." Headlines wrap each stop or comma that ends a word so it can be
// pulled in (.tight-stop in globals.css; Latin pages only). Dots and commas inside numbers
// stay as they are.
export function tightStops(text: string): ReactNode {
  // The capture group keeps the punctuation: text, mark, text, mark, …, text.
  const parts = text.split(/([.,])(?=\s|$)/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="tight-stop">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// Tinted surfaces from globals.css. Class names are written out in full so Tailwind sees them.
// Text on a tinted surface stays in the normal text colours; the tint's own colour is for
// icons and short emphasis (all pairs are 5.7:1 or better in both themes).

export type Tint = "blue" | "violet" | "green" | "amber" | "rose" | "peach";

export const tints: Record<Tint, { surface: string; icon: string; fg: string; line: string; dot: string }> = {
  blue: { surface: "bg-tint-blue", icon: "bg-tint-blue text-tint-blue-fg", fg: "text-tint-blue-fg", line: "border-tint-blue-line", dot: "bg-tint-blue-fg" },
  violet: { surface: "bg-tint-violet", icon: "bg-tint-violet text-tint-violet-fg", fg: "text-tint-violet-fg", line: "border-tint-violet-line", dot: "bg-tint-violet-fg" },
  green: { surface: "bg-tint-green", icon: "bg-tint-green text-tint-green-fg", fg: "text-tint-green-fg", line: "border-tint-green-line", dot: "bg-tint-green-fg" },
  amber: { surface: "bg-tint-amber", icon: "bg-tint-amber text-tint-amber-fg", fg: "text-tint-amber-fg", line: "border-tint-amber-line", dot: "bg-tint-amber-fg" },
  rose: { surface: "bg-tint-rose", icon: "bg-tint-rose text-tint-rose-fg", fg: "text-tint-rose-fg", line: "border-tint-rose-line", dot: "bg-tint-rose-fg" },
  peach: { surface: "bg-tint-peach", icon: "bg-tint-peach text-tint-peach-fg", fg: "text-tint-peach-fg", line: "border-tint-peach-line", dot: "bg-tint-peach-fg" },
};

export const TINT_ORDER: readonly Tint[] = ["blue", "green", "violet", "peach", "rose", "amber"];

// Solid icon chips (stat cards) with a soft halo of the same colour. Sky and amber carry
// ink glyphs; the saturated chips use --chip-glyph (white in light, ink in dark).
export type Chip = "sky" | "violet" | "green" | "rose" | "blue" | "amber";

export const chips: Record<Chip, string> = {
  sky: "bg-chip-sky text-ink ring-chip-sky/35",
  violet: "bg-chip-violet text-chip-glyph ring-chip-violet/15",
  green: "bg-chip-green text-chip-glyph ring-chip-green/15",
  rose: "bg-chip-rose text-chip-glyph ring-chip-rose/15",
  blue: "bg-chip-blue text-chip-glyph ring-chip-blue/15",
  amber: "bg-chip-amber text-ink ring-chip-amber/20",
};

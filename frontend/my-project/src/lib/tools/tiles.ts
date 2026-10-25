// Geometry for cutting one image into equal tiles: carousel slides (one row) and profile
// grids (three columns). Pure, so the preview and the downloaded files use the same numbers.

export type Size = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Focus = { x: number; y: number };
export type FitMode = "fill" | "fit";
export type Layout = { cols: number; rows: number; tile: Size };

// One canvas drawImage call: source rectangle, then destination rectangle on the tile.
export type Draw = { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function compositeSize({ cols, rows, tile }: Layout): Size {
  return { w: cols * tile.w, h: rows * tile.h };
}

// The part of the source that fills a target of this aspect ratio (w / h). Focus 0..1 on
// each axis picks which part survives the crop; 0.5 keeps the middle.
export function coverRect(src: Size, ratio: number, focus: Focus = { x: 0.5, y: 0.5 }): Rect {
  const srcRatio = src.w / src.h;
  // Same shape already: nothing to crop (and no floating-point slivers).
  if (Math.abs(srcRatio - ratio) < 1e-9) return { x: 0, y: 0, w: src.w, h: src.h };
  if (srcRatio > ratio) {
    const w = src.h * ratio;
    return { x: (src.w - w) * clamp(focus.x, 0, 1), y: 0, w, h: src.h };
  }
  const h = src.w / ratio;
  return { x: 0, y: (src.h - h) * clamp(focus.y, 0, 1), w: src.w, h };
}

// Where the whole source sits, centred, inside a target without cropping.
export function containRect(src: Size, target: Size): Rect {
  const scale = Math.min(target.w / src.w, target.h / src.h);
  const w = src.w * scale;
  const h = src.h * scale;
  return { x: (target.w - w) / 2, y: (target.h - h) / 2, w, h };
}

// The drawImage calls for every tile, in reading order (left to right, top to bottom).
export function tileDraws(src: Size, layout: Layout, mode: FitMode, focus?: Focus): Draw[] {
  const { cols, rows, tile } = layout;
  const total = compositeSize(layout);
  const draws: Draw[] = [];
  if (mode === "fill") {
    const crop = coverRect(src, total.w / total.h, focus);
    const sw = crop.w / cols;
    const sh = crop.h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        draws.push({ sx: crop.x + c * sw, sy: crop.y + r * sh, sw, sh, dx: 0, dy: 0, dw: tile.w, dh: tile.h });
      }
    }
    return draws;
  }
  const dest = containRect(src, total);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      draws.push({ sx: 0, sy: 0, sw: src.w, sh: src.h, dx: dest.x - c * tile.w, dy: dest.y - r * tile.h, dw: dest.w, dh: dest.h });
    }
  }
  return draws;
}

// How many slides a panorama fills without much cropping, within the allowed range.
export function suggestSlides(src: Size, tile: Size, min: number, max: number): number {
  return clamp(Math.round(src.w / src.h / (tile.w / tile.h)), min, max);
}

// How many rows of a three-column grid an image fills without much cropping.
export function suggestRows(src: Size, tile: Size, cols: number, min: number, max: number): number {
  return clamp(Math.round((src.h / src.w) * ((cols * tile.w) / tile.h)), min, max);
}

// Instagram shows the newest post first, so a grid is posted from its last tile (bottom
// right) back to its first (top left). Returns the posting step, 1 first, for a tile.
export function postingStep(index: number, total: number): number {
  return total - index;
}

"use client";

import { tileDraws, type Draw, type FitMode, type Focus, type Layout, type Size } from "@/lib/tools/tiles";
import { zipStore } from "@/lib/tools/zip";

// Browser side of the image tools: open a picture, draw tiles, and hand files to the person.
// Nothing is uploaded; every step runs on this device.

export type LoadedImage = { img: HTMLImageElement; size: Size; url: string; base: string };

export class ImageOpenError extends Error {
  constructor(public code: "type" | "unreadable") {
    super(code);
  }
}

const IMAGE_NAME = /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i;

export async function openImage(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith("image/") && !IMAGE_NAME.test(file.name)) throw new ImageOpenError("type");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("empty");
    // The file's own name, made safe for the downloads ("Beach trip.jpg" -> "beach-trip").
    const base =
      file.name
        .replace(/\.[^.]+$/, "")
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "image";
    return { img, size: { w: img.naturalWidth, h: img.naturalHeight }, url, base };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageOpenError("unreadable");
  }
}

// One tile onto a canvas, scaled to the canvas: background first, so transparent pictures
// and the "whole image" bars come out in the chosen colour rather than black.
export function drawTile(canvas: HTMLCanvasElement, image: LoadedImage, draw: Draw, tile: Size, background: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const k = canvas.width / tile.w;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image.img, draw.sx, draw.sy, draw.sw, draw.sh, draw.dx * k, draw.dy * k, draw.dw * k, draw.dh * k);
}

// True when the picture has to be enlarged more than a third to fill a tile.
export function isLowRes(image: LoadedImage, layout: Layout, mode: FitMode, focus?: Focus): boolean {
  const first = tileDraws(image.size, layout, mode, focus)[0];
  const scale = mode === "fill" ? layout.tile.w / first.sw : first.dw / image.size.w;
  return scale > 4 / 3;
}

export type TileFile = { name: string; blob: Blob };

// Full-size JPEGs, one per tile, in the given order of indexes.
export async function renderTiles(image: LoadedImage, layout: Layout, mode: FitMode, focus: Focus, background: string, names: string[], order?: number[]): Promise<TileFile[]> {
  const draws = tileDraws(image.size, layout, mode, focus);
  const canvas = document.createElement("canvas");
  canvas.width = layout.tile.w;
  canvas.height = layout.tile.h;
  const files: TileFile[] = [];
  for (const [i, index] of (order ?? draws.map((_, n) => n)).entries()) {
    drawTile(canvas, image, draws[index], layout.tile, background);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("encode_failed");
    files.push({ name: names[i], blob });
  }
  return files;
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function saveZip(files: TileFile[], name: string) {
  const entries = await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) })));
  saveBlob(new Blob([zipStore(entries)], { type: "application/zip" }), name);
}

// Phones and tablets can hand the images straight to the share sheet (Save to Photos,
// Instagram...). Desktops download instead, so the button is touch-only.
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  if (!matchMedia("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "probe.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

export async function shareFiles(files: TileFile[]): Promise<void> {
  const list = files.map((f) => new File([f.blob], f.name, { type: "image/jpeg" }));
  try {
    await navigator.share({ files: list });
  } catch (e) {
    // Closing the share sheet is not an error worth showing.
    if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
  }
}

export const twoDigits = (n: number) => String(n).padStart(2, "0");

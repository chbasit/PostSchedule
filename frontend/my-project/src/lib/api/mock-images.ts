"use client";

import { ASPECT_SIZES, type ImageAspect, type ImageStyle } from "@/lib/ai/images";

// Preview mode only: draws a placeholder for an AI image so AI Studio and the composer can be
// tried end to end before the image service is connected. Same prompt, same seed, same art;
// a new seed gives a variation. The real service (src/server/ai) replaces this.

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function random(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${Math.round(h) % 360}, ${s}%, ${l}%, ${a})`;

export async function drawPlaceholder(prompt: string, style: ImageStyle, aspect: ImageAspect, seed: number): Promise<Blob> {
  const { width, height } = ASPECT_SIZES[aspect];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  const rnd = random(hash(`${prompt}|${style}|${seed}`));
  const base = rnd() * 360;
  const short = Math.min(width, height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, hsl(base, 70, style === "cinematic" ? 18 : 62));
  bg.addColorStop(1, hsl(base + 60 + rnd() * 80, 75, style === "cinematic" ? 30 : 48));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (style === "minimal") {
    ctx.fillStyle = hsl(base + 180, 60, 92, 0.9);
    ctx.beginPath();
    ctx.arc(width * (0.35 + rnd() * 0.3), height * (0.4 + rnd() * 0.2), short * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "flat") {
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = hsl(base + i * 40, 70, 55 + rnd() * 20, 0.9);
      ctx.save();
      ctx.translate(rnd() * width, rnd() * height);
      ctx.rotate(rnd() * Math.PI);
      ctx.fillRect(-short * 0.15, -short * 0.15, short * (0.15 + rnd() * 0.25), short * (0.15 + rnd() * 0.25));
      ctx.restore();
    }
  } else if (style === "3d") {
    for (let i = 0; i < 4; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const r = short * (0.08 + rnd() * 0.18);
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, hsl(base + i * 50, 80, 90));
      g.addColorStop(1, hsl(base + i * 50, 70, 35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === "illustration") {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = hsl(base + i * 30, 75, 50 + i * 7, 0.75);
      ctx.beginPath();
      ctx.moveTo(0, height * (0.45 + i * 0.12));
      for (let x = 0; x <= width; x += width / 8) ctx.lineTo(x, height * (0.4 + i * 0.12) + Math.sin(x / 140 + rnd() * 6) * short * 0.05);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();
    }
  } else {
    // Photo and cinematic: soft bokeh lights.
    for (let i = 0; i < 18; i++) {
      const x = rnd() * width;
      const y = rnd() * height;
      const r = short * (0.03 + rnd() * 0.12);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hsl(base + 30 + rnd() * 60, 90, 85, 0.55));
      g.addColorStop(1, hsl(base, 90, 85, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const v = ctx.createRadialGradient(width / 2, height / 2, short * 0.3, width / 2, height / 2, Math.max(width, height) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, width, height);
    if (style === "cinematic") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height * 0.08);
      ctx.fillRect(0, height * 0.92, width, height * 0.08);
    }
  }

  // Marked as a preview so nobody mistakes it for a real generation.
  ctx.font = `600 ${Math.round(short * 0.026)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("AI preview", short * 0.04, height - short * 0.045);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/jpeg", 0.86));
}

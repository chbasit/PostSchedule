// Turns recordings into the landing page's clips: H.264 MP4s (WebCodecs in headless Chrome,
// written by mp4.mjs), a smaller copy for phones and a WebP poster of the first frame.
// Usage: node scripts/clips/encode.mjs [--install] [name ...]
// The clips are described in clips.json: the recording, the crop (CSS pixels), the parts to
// play in order ([from, to, speed]; seconds or marker names such as "previews+0.5", "start",
// "end") and the output sizes. --install copies the results into public/clips and
// src/assets/clips.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { launch, serve, WORK } from "./chrome.mjs";
import { trackToMp4, WEBCODECS } from "./mp4.mjs";

const FPS = 30;
const ROOT = join(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const install = args.includes("--install");
const only = args.filter((a) => !a.startsWith("--"));
const specs = JSON.parse(readFileSync(join(import.meta.dirname, "clips.json"), "utf8")).filter((s) => !only.length || only.includes(s.name));
const outDir = join(WORK, "out");
mkdirSync(outDir, { recursive: true });

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>${WEBCODECS}
window.encode = async (spec) => {
  const manifest = await (await fetch(spec.rec + "/manifest.json")).json();
  const frames = manifest.frames;
  // Screencast timestamps can jitter backwards; keep arrival order and make time monotonic.
  for (let i = 1; i < frames.length; i++) frames[i].t = Math.max(frames[i].t, frames[i - 1].t);
  const cache = new Map();
  const bitmap = (i) => {
    if (!cache.has(i)) cache.set(i, fetch(spec.rec + "/" + frames[i].file).then((r) => r.blob()).then((b) => createImageBitmap(b)));
    return cache.get(i);
  };
  // Frame pixels per CSS pixel, from the frames themselves.
  const scale = (await bitmap(0)).width / manifest.viewport.w;
  const crop = { x: spec.crop.x * scale, y: spec.crop.y * scale, w: spec.crop.w * scale, h: spec.crop.h * scale };

  const at = (v) => {
    if (typeof v === "number") return v;
    const m = /^([a-z]+)([+-][0-9.]+)?$/.exec(v);
    const base = !m ? undefined : m[1] === "start" ? 0 : m[1] === "end" ? frames[frames.length - 1].t : manifest.markers[m[1]];
    if (base === undefined) throw new Error("unknown time " + v);
    return base + (m[2] ? Number(m[2]) : 0);
  };
  // Output time -> recording time, through each part's speed.
  const parts = [];
  let total = 0;
  for (const [from, to, speed] of spec.parts) {
    const length = (at(to) - at(from)) / speed;
    parts.push({ start: total, end: total + length, from: at(from), speed });
    total += length;
  }
  const sourceAt = (t) => { const p = parts.find((x) => t < x.end) ?? parts[parts.length - 1]; return p.from + (Math.min(t, p.end) - p.start) * p.speed; };
  const indexAt = (s) => { let lo = 0, hi = frames.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (frames[mid].t <= s) lo = mid; else hi = mid - 1; } return lo; };

  const outputs = [];
  for (const v of spec.variants) {
    const canvas = document.createElement("canvas");
    canvas.width = v.width;
    canvas.height = v.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingQuality = "high";
    outputs.push({ v, canvas, ctx, track: await createTrack(v.width, v.height, v.bitrate, ${FPS}) });
  }
  const count = Math.round(total * ${FPS});
  let poster = null;
  for (let n = 0; n < count; n++) {
    const i = indexAt(sourceAt(n / ${FPS}));
    for (let k = 1; k <= 4; k++) if (i + k < frames.length) bitmap(i + k);
    const b = await bitmap(i);
    // Keep a window around the playhead; parts can jump backwards, so drop by distance.
    for (const k of [...cache.keys()]) if (Math.abs(k - i) > 16) { cache.get(k).then((x) => x.close()); cache.delete(k); }
    for (const out of outputs) {
      out.ctx.drawImage(b, crop.x, crop.y, crop.w, crop.h, 0, 0, out.v.width, out.v.height);
      await addFrame(out.track, out.canvas, n, ${FPS});
    }
    // The poster is the first frame, so nothing jumps when playback starts.
    if (n === 0) poster = await toBase64(new Uint8Array(await (await new Promise((r) => outputs[0].canvas.toBlob(r, "image/webp", 0.86))).arrayBuffer()));
  }
  const tracks = [];
  for (const out of outputs) tracks.push({ suffix: out.v.suffix, ...(await finishTrack(out.track)) });
  return { poster, seconds: +total.toFixed(2), tracks };
};
</script>`;

const server = await serve(async (path) => {
  if (path === "/") return { type: "text/html", body: PAGE };
  const file = resolve(WORK, `.${path}`);
  if (!file.startsWith(resolve(WORK) + sep)) return null;
  return { type: file.endsWith(".json") ? "application/json" : "image/jpeg", body: await readFile(file) };
});
const { page, close } = await launch({ base: server.origin, port: 9336, profile: join(WORK, "profiles", "encode") });
try {
  for (const spec of specs) {
    await page.goto("/", { settle: 100 });
    const r = await page.eval(`encode(${JSON.stringify(spec)})`);
    writeFileSync(join(outDir, `${spec.name}.webp`), Buffer.from(r.poster, "base64"));
    for (const track of r.tracks) {
      const mp4 = trackToMp4(track, FPS);
      writeFileSync(join(outDir, `${spec.name}${track.suffix}.mp4`), mp4);
      console.log(`${spec.name}${track.suffix}: ${track.width}x${track.height} ${track.codec}, ${r.seconds}s, ${(mp4.length / 1e6).toFixed(2)} MB`);
    }
    if (install) {
      for (const track of r.tracks) copyFileSync(join(outDir, `${spec.name}${track.suffix}.mp4`), join(ROOT, "public", "clips", `${spec.name}${track.suffix}.mp4`));
      copyFileSync(join(outDir, `${spec.name}.webp`), join(ROOT, "src", "assets", "clips", `${spec.name}.webp`));
    }
  }
  if (install) console.log("installed into public/clips and src/assets/clips");
  if (page.errors.length) console.log(`errors:\n${page.errors.join("\n")}`);
} finally {
  await close();
  server.close();
}

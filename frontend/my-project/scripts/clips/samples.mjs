// The media the recordings upload: a 6-second 1920 × 1080 clip with film grain (so it
// encodes at a camera-like bitrate and passes the bitrate check) and a 7200 × 1500 panorama
// for the carousel splitter. Usage: node scripts/clips/samples.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launch, serve, WORK } from "./chrome.mjs";
import { trackToMp4, WEBCODECS } from "./mp4.mjs";

const FPS = 30;
const out = join(WORK, "samples");
mkdirSync(out, { recursive: true });

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>${WEBCODECS}
// Dusk over hills and a lake; the panorama is the same scene, wider.
function scene(w, h) {
  const stars = Array.from({ length: 9 }, (_, i) => '<circle cx="' + w * (0.08 + i * 0.11) + '" cy="' + h * (0.14 + (i % 3) * 0.05) + '" r="' + Math.min(w, h) * 0.004 + '" fill="#fff" opacity="0.8"/>').join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22305f"/><stop offset="0.5" stop-color="#e79fb0"/><stop offset="0.78" stop-color="#ffb489"/><stop offset="1" stop-color="#ff8a5c"/></linearGradient>' +
    '<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9e7a"/><stop offset="1" stop-color="#3a2f63"/></linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#sky)"/>' +
    '<circle cx="' + w * 0.63 + '" cy="' + h * 0.58 + '" r="' + Math.min(w, h) * 0.13 + '" fill="#ffe0b8"/>' + stars +
    '<path d="M0 ' + h * 0.72 + ' L' + w * 0.1 + ' ' + h * 0.55 + ' L' + w * 0.2 + ' ' + h * 0.66 + ' L' + w * 0.33 + ' ' + h * 0.46 + ' L' + w * 0.45 + ' ' + h * 0.68 + ' L' + w * 0.57 + ' ' + h * 0.5 + ' L' + w * 0.7 + ' ' + h * 0.7 + ' L' + w * 0.82 + ' ' + h * 0.48 + ' L' + w + ' ' + h * 0.64 + ' L' + w + ' ' + h + ' L0 ' + h + ' Z" fill="#4a3a6e"/>' +
    '<path d="M0 ' + h * 0.8 + ' L' + w * 0.14 + ' ' + h * 0.66 + ' L' + w * 0.28 + ' ' + h * 0.78 + ' L' + w * 0.41 + ' ' + h * 0.63 + ' L' + w * 0.6 + ' ' + h * 0.8 + ' L' + w * 0.74 + ' ' + h * 0.66 + ' L' + w * 0.88 + ' ' + h * 0.79 + ' L' + w + ' ' + h * 0.7 + ' L' + w + ' ' + h + ' L0 ' + h + ' Z" fill="#2c2347"/>' +
    '<rect y="' + h * 0.84 + '" width="' + w + '" height="' + h * 0.16 + '" fill="url(#lake)"/>' +
    '<rect x="' + w * 0.6 + '" y="' + h * 0.85 + '" width="' + w * 0.06 + '" height="' + h * 0.012 + '" fill="#ffe0b8" opacity="0.7"/>' +
    '</svg>';
}

window.makePanorama = async (w, h) => {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(scene(w, h));
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  return toBase64(new Uint8Array(await blob.arrayBuffer()));
};

window.makeClip = async () => {
  const W = 1920, H = 1080, SECONDS = 6;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  const ridge = (base, amp, phase, color, t) => {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, base + Math.sin(x / 260 + phase + t * 0.15) * amp + Math.sin(x / 90 + phase * 2) * amp * 0.25);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const draw = (t) => {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#22305f");
    sky.addColorStop(0.55, "#e79fb0");
    sky.addColorStop(1, "#ffb489");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // The sun sets slowly and the clouds drift.
    ctx.fillStyle = "#ffe0b8";
    ctx.beginPath();
    ctx.arc(W * 0.62, H * 0.42 + t * 28, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 4; i++) {
      const x = ((i * 520 + t * 60) % (W + 400)) - 200;
      const y = 150 + i * 55;
      ctx.beginPath();
      ctx.ellipse(x, y, 150, 26, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 90, y - 18, 90, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ridge(H * 0.62, 70, 0.4, "#4a3a6e", t);
    ridge(H * 0.72, 55, 2.1, "#2c2347", t * 1.6);
    const lake = ctx.createLinearGradient(0, H * 0.84, 0, H);
    lake.addColorStop(0, "#ff9e7a");
    lake.addColorStop(1, "#3a2f63");
    ctx.fillStyle = lake;
    ctx.fillRect(0, H * 0.84, W, H * 0.16);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "600 64px system-ui, sans-serif";
    ctx.fillText("Autumn shoot · Day 2", 96, 140);
    // Film grain.
    for (const tone of ["rgba(255,255,255,0.07)", "rgba(0,0,0,0.07)"]) {
      ctx.fillStyle = tone;
      for (let i = 0; i < 12000; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
  };
  const track = await createTrack(W, H, 4000000, ${FPS});
  for (let n = 0; n < SECONDS * ${FPS}; n++) {
    draw(n / ${FPS});
    await addFrame(track, canvas, n, ${FPS});
  }
  return finishTrack(track);
};
</script>`;

const server = await serve(async (path) => (path === "/" ? { type: "text/html", body: PAGE } : null));
const { page, close } = await launch({ base: server.origin, profile: join(WORK, "profiles", "samples") });
try {
  await page.goto("/", { settle: 100 });
  const clip = await page.eval("makeClip()");
  const mp4 = trackToMp4(clip, FPS);
  writeFileSync(join(out, "autumn-shoot.mp4"), mp4);
  console.log(`autumn-shoot.mp4: ${clip.width}x${clip.height} ${clip.codec}, ${(mp4.length / 1e6).toFixed(1)} MB`);
  writeFileSync(join(out, "panorama-wide.jpg"), Buffer.from(await page.eval("makePanorama(7200, 1500)"), "base64"));
  console.log("panorama-wide.jpg: 7200x1500");
  if (page.errors.length) console.log(`errors:\n${page.errors.join("\n")}`);
} finally {
  await close();
  server.close();
}

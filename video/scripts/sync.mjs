// Copies what the video needs from the app: the logo mark, the landing clips (real screen recordings of the
// app, see frontend/my-project/scripts/clips) with their size and length, and each platform's
// name, colour and logo. Run again after re-recording the clips or adding a platform.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const app = join(root, "..", "frontend", "my-project");
const clipsIn = join(app, "public", "videos");
const clipsOut = join(root, "public", "clips");

// Reads one box of an MP4 file: its type and where its content starts and ends.
function* boxes(buf, start, end) {
  let at = start;
  while (at + 8 <= end) {
    let size = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(at + 8));
      header = 16;
    } else if (size === 0) size = end - at;
    yield { type, start: at + header, end: at + size };
    at += size;
  }
}

const find = (buf, start, end, path) => {
  const [head, ...rest] = path;
  for (const box of boxes(buf, start, end)) {
    if (box.type !== head) continue;
    return rest.length ? find(buf, box.start, box.end, rest) : box;
  }
  return undefined;
};

// Length from the movie header; size from the first video track header (16.16 fixed point).
function probe(file) {
  const buf = readFileSync(file);
  const mvhd = find(buf, 0, buf.length, ["moov", "mvhd"]);
  if (!mvhd) throw new Error(`${file}: no movie header`);
  const v1 = buf[mvhd.start] === 1;
  const timescale = buf.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
  const duration = v1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
  let width = 0;
  let height = 0;
  const moov = find(buf, 0, buf.length, ["moov"]);
  for (const trak of boxes(buf, moov.start, moov.end)) {
    if (trak.type !== "trak") continue;
    const tkhd = find(buf, trak.start, trak.end, ["tkhd"]);
    const w = buf.readUInt32BE(tkhd.end - 8) / 65536;
    const h = buf.readUInt32BE(tkhd.end - 4) / 65536;
    if (w && h) {
      width = w;
      height = h;
      break;
    }
  }
  return { seconds: duration / timescale, width, height };
}

mkdirSync(clipsOut, { recursive: true });
const clips = {};
for (const file of readdirSync(clipsIn).filter((f) => f.endsWith(".mp4") && !f.endsWith("-sm.mp4"))) {
  copyFileSync(join(clipsIn, file), join(clipsOut, file));
  clips[file.replace(/\.mp4$/, "")] = probe(join(clipsIn, file));
}

// The logo mark, for the intro and the closing scene.
copyFileSync(join(app, "src", "assets", "images", "brand", "logo-mark.png"), join(root, "public", "logo-mark.png"));

// The platform descriptors are TypeScript; only these plain string fields are read.
const field = (src, name) => new RegExp(`\\b${name}: "([^"]*)"`).exec(src)?.[1];
const catalog = readFileSync(join(app, "src", "providers", "catalog.ts"), "utf8");
const order = /PLATFORMS[^=]*=\s*\[([^\]]*)\]/.exec(catalog)[1].split(",").map((s) => s.trim()).filter(Boolean);
const platforms = order.map((id) => {
  const src = readFileSync(join(app, "src", "providers", id, "limits.ts"), "utf8");
  return { id, name: field(src, "name"), color: field(src, "brandColor"), background: field(src, "markBackground") ?? null, logo: field(src, "logo") };
});

writeFileSync(join(root, "src", "assets.json"), JSON.stringify({ clips, platforms }, null, 2) + "\n");
for (const [name, c] of Object.entries(clips)) console.log(`${name}: ${c.width}x${c.height}, ${c.seconds.toFixed(2)} s`);
console.log(`platforms: ${platforms.map((p) => p.name).join(", ")}`);

// A minimal MP4 writer for one H.264 video track: ftyp, moov (before the data, so playback
// can start while downloading) and one mdat. Samples arrive in decode order with no
// B-frames (WebCodecs output), so no ctts or edit list is needed. Chrome's MediaRecorder is
// not used because its MP4s can report the wrong duration.

const enc = new TextEncoder();
const u8 = (bytes) => Uint8Array.from(bytes);
function u16(n) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n);
  return b;
}
function u32(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n);
  return b;
}
const zeros = (n) => new Uint8Array(n);

function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function box(type, ...payload) {
  const body = concat(payload);
  return concat([u32(8 + body.length), enc.encode(type), body]);
}
function fullBox(type, version, flags, ...payload) {
  return box(type, u8([version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...payload);
}

const MATRIX = concat([0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32));

// WebCodecs colour space names to the ISO/IEC 23091-2 codes used by the colr box.
const PRIMARIES = { bt709: 1, bt470bg: 5, smpte170m: 6, bt2020: 9, smpte432: 12 };
const TRANSFER = { bt709: 1, smpte170m: 6, "iec61966-2-1": 13, linear: 8, pq: 16, hlg: 18 };
const MATRIX_COEFFS = { rgb: 0, bt709: 1, bt470bg: 5, smpte170m: 6, "bt2020-ncl": 9 };

/**
 * @param {{ width: number, height: number, fps: number, avcC: Uint8Array,
 *   colorSpace?: { primaries?: string, transfer?: string, matrix?: string, fullRange?: boolean },
 *   samples: Array<{ size: number, key: boolean }>, data: Uint8Array }} track
 */
export function writeMp4({ width, height, fps, avcC, colorSpace, samples, data }) {
  const timescale = fps * 1000;
  const delta = 1000;
  const mediaDuration = samples.length * delta;
  const movieDuration = Math.round((samples.length / fps) * 1000);

  const ftyp = box("ftyp", enc.encode("isom"), u32(0x200), enc.encode("isom"), enc.encode("iso2"), enc.encode("avc1"), enc.encode("mp41"));

  const colr = colorSpace
    ? box(
        "colr",
        enc.encode("nclx"),
        u16(PRIMARIES[colorSpace.primaries] ?? 2),
        u16(TRANSFER[colorSpace.transfer] ?? 2),
        u16(MATRIX_COEFFS[colorSpace.matrix] ?? 2),
        u8([colorSpace.fullRange ? 0x80 : 0]),
      )
    : new Uint8Array(0);

  const avc1 = box(
    "avc1",
    zeros(6),
    u16(1), // data_reference_index
    zeros(16), // pre_defined, reserved, pre_defined[3]
    u16(width),
    u16(height),
    u32(0x00480000),
    u32(0x00480000),
    u32(0),
    u16(1), // frame_count
    zeros(32), // compressorname
    u16(0x0018),
    u16(0xffff),
    box("avcC", avcC),
    box("pasp", u32(1), u32(1)),
    colr,
  );

  const keyNumbers = samples.flatMap((s, i) => (s.key ? [i + 1] : []));
  const stbl = (offset) =>
    box(
      "stbl",
      fullBox("stsd", 0, 0, u32(1), avc1),
      fullBox("stts", 0, 0, u32(1), u32(samples.length), u32(delta)),
      fullBox("stss", 0, 0, u32(keyNumbers.length), ...keyNumbers.map(u32)),
      fullBox("stsc", 0, 0, u32(1), u32(1), u32(samples.length), u32(1)),
      fullBox("stsz", 0, 0, u32(0), u32(samples.length), ...samples.map((s) => u32(s.size))),
      fullBox("stco", 0, 0, u32(1), u32(offset)),
    );

  const moov = (offset) =>
    box(
      "moov",
      fullBox("mvhd", 0, 0, u32(0), u32(0), u32(1000), u32(movieDuration), u32(0x00010000), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(2)),
      box(
        "trak",
        fullBox("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(movieDuration), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width * 65536), u32(height * 65536)),
        box(
          "mdia",
          fullBox("mdhd", 0, 0, u32(0), u32(0), u32(timescale), u32(mediaDuration), u16(0x55c4), u16(0)),
          fullBox("hdlr", 0, 0, u32(0), enc.encode("vide"), zeros(12), enc.encode("VideoHandler\0")),
          box("minf", fullBox("vmhd", 0, 1, zeros(8)), box("dinf", fullBox("dref", 0, 0, u32(1), fullBox("url ", 0, 1))), stbl(offset)),
        ),
      ),
    );

  // The chunk offset does not change the moov's size, so measure once and fill it in.
  const offset = ftyp.length + moov(0).length + 8;
  return concat([ftyp, moov(offset), u32(8 + data.length), enc.encode("mdat"), data]);
}

// Browser-side helper, injected into pages as a string: encodes frames drawn on canvases with
// WebCodecs and hands back what writeMp4 needs. `pickCodec` takes the first High/Main/Baseline
// profile the encoder supports at that size.
export const WEBCODECS = `
async function pickCodec(width, height, bitrate, fps) {
  for (const codec of ["avc1.640028", "avc1.640032", "avc1.4D4028", "avc1.42E028"]) {
    const config = { codec, width, height, bitrate, framerate: fps, avc: { format: "avc" }, latencyMode: "quality", bitrateMode: "variable" };
    if ((await VideoEncoder.isConfigSupported(config)).supported) return config;
  }
  throw new Error("no H.264 encoder for " + width + "x" + height);
}
async function createTrack(width, height, bitrate, fps) {
  const track = { width, height, samples: [], chunks: [], avcC: null, colorSpace: null, error: null, lastTs: -1 };
  track.encoder = new VideoEncoder({
    output(chunk, meta) {
      if (meta && meta.decoderConfig) {
        if (meta.decoderConfig.description) track.avcC = new Uint8Array(meta.decoderConfig.description);
        if (meta.decoderConfig.colorSpace) track.colorSpace = meta.decoderConfig.colorSpace;
      }
      if (chunk.timestamp <= track.lastTs) track.error = "frames out of order (B-frames?)";
      track.lastTs = chunk.timestamp;
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      track.chunks.push(data);
      track.samples.push({ size: data.length, key: chunk.type === "key" });
    },
    error(e) { track.error = String(e); },
  });
  track.config = await pickCodec(width, height, bitrate, fps);
  track.encoder.configure(track.config);
  return track;
}
async function addFrame(track, canvas, n, fps) {
  const frame = new VideoFrame(canvas, { timestamp: Math.round((n * 1e6) / fps), duration: Math.round(1e6 / fps) });
  track.encoder.encode(frame, { keyFrame: n % (fps * 2) === 0 });
  frame.close();
  while (track.encoder.encodeQueueSize > 8) await new Promise((r) => track.encoder.addEventListener("dequeue", r, { once: true }));
}
const toBase64 = (bytes) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1]); r.readAsDataURL(new Blob([bytes])); });
async function finishTrack(track) {
  await track.encoder.flush();
  track.encoder.close();
  if (track.error) throw new Error(track.error);
  const data = new Uint8Array(track.chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of track.chunks) { data.set(c, o); o += c.length; }
  return { width: track.width, height: track.height, codec: track.config.codec, colorSpace: track.colorSpace,
    avcC: await toBase64(track.avcC), samples: track.samples, data: await toBase64(data) };
}
`;

// Turns a finishTrack() result back into an MP4 file.
export function trackToMp4(track, fps) {
  return writeMp4({
    width: track.width,
    height: track.height,
    fps,
    avcC: Buffer.from(track.avcC, "base64"),
    colorSpace: track.colorSpace,
    samples: track.samples,
    data: Buffer.from(track.data, "base64"),
  });
}

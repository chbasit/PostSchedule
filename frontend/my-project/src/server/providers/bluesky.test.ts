import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectFacets, fitImage } from "./bluesky";

const slice = (text: string, f: { index: { byteStart: number; byteEnd: number } }) =>
  Buffer.from(text, "utf8").subarray(f.index.byteStart, f.index.byteEnd).toString("utf8");

describe("detectFacets", () => {
  it("marks links without trailing punctuation", () => {
    const text = "New menu: https://example.com/menu. Come by!";
    const [link] = detectFacets(text);
    expect(slice(text, link)).toBe("https://example.com/menu");
    expect(link.features[0]).toEqual({ $type: "app.bsky.richtext.facet#link", uri: "https://example.com/menu" });
  });

  it("marks hashtags, counting UTF-8 bytes after accented letters and emoji", () => {
    const text = "Café ☕ opening #FreshBread and #café";
    const tags = detectFacets(text);
    expect(tags.map((f) => slice(text, f))).toEqual(["#FreshBread", "#café"]);
    expect(tags.map((f) => f.features[0].tag)).toEqual(["FreshBread", "café"]);
  });

  it("ignores numbers alone and # inside words", () => {
    expect(detectFacets("Order #123 is ready, see issue#4")).toEqual([]);
  });

  it("returns facets in text order", () => {
    const text = "#one https://a.example #two";
    expect(detectFacets(text).map((f) => slice(text, f))).toEqual(["#one", "https://a.example", "#two"]);
  });
});

describe("fitImage", () => {
  it("brings a large photo under Bluesky's 1 MB limit and keeps its shape", async () => {
    // Random pixels do not compress, so the PNG is several megabytes.
    const noise = randomBytes(3000 * 2000 * 3);
    const big = await sharp(noise, { raw: { width: 3000, height: 2000, channels: 3 } }).png().toBuffer();
    expect(big.length).toBeGreaterThan(1_000_000);
    const out = await fitImage(big);
    expect(out.bytes.length).toBeLessThanOrEqual(950_000);
    expect(out.width / out.height).toBeCloseTo(1.5, 1);
    // Noise is the worst case for JPEG, so every size step runs: give it time under load.
  }, 30_000);
});

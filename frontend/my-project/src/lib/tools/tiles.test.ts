import { describe, expect, it } from "vitest";
import { containRect, coverRect, postingStep, suggestRows, suggestSlides, tileDraws } from "./tiles";

const portrait = { w: 1080, h: 1350 };

describe("coverRect", () => {
  it("crops the sides of a wider image, keeping the chosen part", () => {
    expect(coverRect({ w: 4000, h: 1000 }, 2)).toEqual({ x: 1000, y: 0, w: 2000, h: 1000 });
    expect(coverRect({ w: 4000, h: 1000 }, 2, { x: 0, y: 0.5 })).toEqual({ x: 0, y: 0, w: 2000, h: 1000 });
    expect(coverRect({ w: 4000, h: 1000 }, 2, { x: 1, y: 0.5 })).toEqual({ x: 2000, y: 0, w: 2000, h: 1000 });
  });

  it("crops the top and bottom of a taller image", () => {
    expect(coverRect({ w: 1000, h: 3000 }, 1, { x: 0.5, y: 0 })).toEqual({ x: 0, y: 0, w: 1000, h: 1000 });
  });
});

describe("containRect", () => {
  it("centres the whole image with bars on the short sides", () => {
    expect(containRect({ w: 2000, h: 1000 }, { w: 1000, h: 1000 })).toEqual({ x: 0, y: 250, w: 1000, h: 500 });
  });
});

describe("tileDraws", () => {
  it("fills: slices are side by side, equal, and cover the crop exactly", () => {
    const draws = tileDraws({ w: 3240, h: 1350 }, { cols: 3, rows: 1, tile: portrait }, "fill");
    expect(draws).toHaveLength(3);
    expect(draws.map((d) => d.sx)).toEqual([0, 1080, 2160]);
    for (const d of draws) expect(d).toMatchObject({ sw: 1080, sh: 1350, dx: 0, dy: 0, dw: 1080, dh: 1350 });
  });

  it("fills a grid in reading order", () => {
    const draws = tileDraws({ w: 3240, h: 2700 }, { cols: 3, rows: 2, tile: portrait }, "fill");
    expect(draws.map((d) => [d.sx, d.sy])).toEqual([
      [0, 0],
      [1080, 0],
      [2160, 0],
      [0, 1350],
      [1080, 1350],
      [2160, 1350],
    ]);
  });

  it("fits: each tile shows its own part of the centred image", () => {
    const draws = tileDraws({ w: 2000, h: 500 }, { cols: 2, rows: 1, tile: { w: 1000, h: 1000 } }, "fit");
    expect(draws[0]).toMatchObject({ sx: 0, sw: 2000, sh: 500, dx: 0, dy: 250, dw: 2000, dh: 500 });
    expect(draws[1]).toMatchObject({ dx: -1000, dy: 250 });
  });
});

describe("suggestions", () => {
  it("picks the slide count that fits a panorama, within the limits", () => {
    expect(suggestSlides({ w: 8000, h: 2500 }, portrait, 2, 10)).toBe(4);
    expect(suggestSlides({ w: 1000, h: 1000 }, portrait, 2, 10)).toBe(2);
    expect(suggestSlides({ w: 40000, h: 1000 }, portrait, 2, 10)).toBe(10);
  });

  it("picks the number of grid rows", () => {
    expect(suggestRows({ w: 3240, h: 2700 }, portrait, 3, 1, 4)).toBe(2);
    expect(suggestRows({ w: 4000, h: 1000 }, portrait, 3, 1, 4)).toBe(1);
  });
});

describe("postingStep", () => {
  it("posts the bottom-right tile first and the top-left last", () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => postingStep(i, 6))).toEqual([6, 5, 4, 3, 2, 1]);
  });
});

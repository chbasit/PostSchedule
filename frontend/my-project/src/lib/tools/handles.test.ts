import { describe, expect, it } from "vitest";
import { checkHandle, normalizeHandle, suggestHandles } from "./handles";

const failing = (raw: string, platform: "instagram" | "tiktok") =>
  checkHandle(raw, platform)
    .results.filter((r) => !r.ok)
    .map((r) => r.rule);

describe("normalizeHandle", () => {
  it("drops the @, spaces around it and capitals", () => {
    expect(normalizeHandle("  @@Northwind.Studio ")).toBe("northwind.studio");
  });
});

describe("checkHandle", () => {
  it("accepts letters, numbers, periods and underscores", () => {
    expect(checkHandle("@northwind_studio.2026", "instagram").valid).toBe(true);
    expect(checkHandle("north.wind_26", "tiktok").valid).toBe(true);
  });

  it("names every rule a handle breaks", () => {
    expect(failing(".north..wind.", "instagram")).toEqual(["startPeriod", "endPeriod", "doublePeriod"]);
    expect(failing("north wind!", "instagram")).toEqual(["characters"]);
    expect(failing("café", "tiktok")).toEqual(["characters"]);
  });

  it("applies each platform's length limits", () => {
    expect(failing("a".repeat(31), "instagram")).toEqual(["length"]);
    expect(checkHandle("a".repeat(30), "instagram").valid).toBe(true);
    expect(failing("a", "tiktok")).toEqual(["length"]);
    expect(failing("a".repeat(25), "tiktok")).toEqual(["length"]);
  });

  it("only checks the rules a platform has", () => {
    // TikTok allows a leading period and double periods; it only forbids a trailing one.
    expect(checkHandle(".north..wind", "tiktok").valid).toBe(true);
    expect(failing("northwind.", "tiktok")).toEqual(["endPeriod"]);
  });

  it("treats an empty box as not valid", () => {
    expect(checkHandle("  @ ", "instagram").valid).toBe(false);
  });
});

describe("suggestHandles", () => {
  it("builds valid alternatives from a name, accents dropped", () => {
    const list = suggestHandles("Café Niño", "instagram");
    expect(list.slice(0, 3)).toEqual(["cafenino", "cafe.nino", "cafe_nino"]);
    expect(list).toHaveLength(8);
    for (const handle of list) expect(checkHandle(handle, "instagram").valid).toBe(true);
  });

  it("leaves out the handle itself and anything over the length limit", () => {
    const list = suggestHandles("northwindcreative", "tiktok");
    expect(list).not.toContain("northwindcreative");
    for (const handle of list) expect(handle.length).toBeLessThanOrEqual(24);
  });

  it("has nothing to suggest without Latin letters or digits", () => {
    expect(suggestHandles("مرحبا", "instagram")).toEqual([]);
  });
});

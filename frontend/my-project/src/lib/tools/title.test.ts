import { describe, expect, it } from "vitest";
import { checkTitle, cleanSpaces, titleLength, TITLE_LIMIT } from "./title";

const status = (title: string) => Object.fromEntries(checkTitle(title).map((c) => [c.id, c.status]));

describe("checkTitle", () => {
  it("passes a clean title", () => {
    expect(Object.values(status("How I edit vertical video in 10 minutes"))).toEqual(["pass", "pass", "pass", "pass", "pass"]);
  });

  it("blocks titles over the limit, counting emoji as one character", () => {
    expect(TITLE_LIMIT).toBe(100);
    expect(status("a".repeat(100)).length).toBe("pass");
    expect(status("a".repeat(101)).length).toBe("block");
    expect(titleLength("🎬🎬")).toBe(2);
  });

  it("blocks angle brackets", () => {
    expect(status("Top <10> tips").angleBrackets).toBe("block");
  });

  it("warns about shouting, repeated punctuation and stray spaces", () => {
    expect(status("THIS CHANGES EVERYTHING").caps).toBe("warn");
    expect(status("NASA and ESA launch day").caps).toBe("pass");
    expect(status("Wait for it!!!").punctuation).toBe("warn");
    expect(status("Really?!").punctuation).toBe("pass");
    expect(status(" Two  spaces ").spaces).toBe("warn");
  });

  it("ignores scripts without capital letters", () => {
    expect(status("كيف أصور فيديو عمودي").caps).toBe("pass");
  });
});

describe("cleanSpaces", () => {
  it("trims and collapses runs of spaces", () => {
    expect(cleanSpaces("  My   first\tvideo ")).toBe("My first video");
  });
});

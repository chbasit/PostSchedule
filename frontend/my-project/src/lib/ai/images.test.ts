import { describe, expect, it } from "vitest";
import { AI_COSTS, imageCost, PLANS } from "@/lib/billing/plans";
import { ASPECT_SIZES, buildImagePrompt, IMAGE_ASPECTS } from "./images";

describe("AI Studio options", () => {
  it("sizes every aspect at exactly its ratio, 1080 px on the short side", () => {
    for (const aspect of IMAGE_ASPECTS) {
      const [w, h] = aspect.split(":").map(Number);
      const size = ASPECT_SIZES[aspect];
      expect(size.width * h).toBe(size.height * w);
      expect(Math.min(size.width, size.height)).toBe(1080);
    }
  });

  it("keeps the person's words first and asks for no added text", () => {
    const prompt = buildImagePrompt("  A latte on marble  ", "photo", "4:5");
    expect(prompt.startsWith("A latte on marble\n")).toBe(true);
    expect(prompt).toContain("4:5");
    expect(prompt).toMatch(/Do not add text/);
  });

  it("charges per image and quality, and every plan can afford at least one HD image", () => {
    expect(imageCost("standard", 3)).toBe(3 * AI_COSTS.image.standard);
    expect(imageCost("hd", 2)).toBe(2 * AI_COSTS.image.hd);
    for (const plan of PLANS) expect(plan.aiCredits).toBeGreaterThanOrEqual(AI_COSTS.image.hd);
    // More expensive plans never get fewer credits.
    for (let i = 1; i < PLANS.length; i++) expect(PLANS[i].aiCredits).toBeGreaterThan(PLANS[i - 1].aiCredits);
  });
});

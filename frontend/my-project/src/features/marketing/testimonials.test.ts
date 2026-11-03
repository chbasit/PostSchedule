import { describe, expect, it } from "vitest";
import { reviewSchema, type Testimonial } from "./testimonials";

const review = (name: string): Testimonial => ({ quote: "Saves me an hour a day.", name, role: "Owner", date: "2026-11-03" });

describe("reviewSchema", () => {
  it("adds nothing until there is a real review", () => {
    expect(reviewSchema([])).toEqual({});
  });

  it("lists each review's text and author, with no rating since the wall shows none", () => {
    const schema = reviewSchema([review("A"), review("B")]);
    expect(schema.review).toHaveLength(2);
    expect(schema.review?.[0]).toEqual({ "@type": "Review", reviewBody: "Saves me an hour a day.", datePublished: "2026-11-03", author: { "@type": "Person", name: "A" } });
    expect(schema).not.toHaveProperty("aggregateRating");
  });
});

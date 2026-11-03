// Real customer reviews for the landing wall, shown in the language they were given in. Only
// reviews a customer actually gave and agreed to publish, with their real name and role:
// invented or edited reviews are unlawful in most markets, break platform app reviews, and
// marked up as structured data they break Google's spam policies. Each review takes the
// place of a "use" card on the wall (business-wall.tsx) and feeds the page's JSON-LD.
export type Testimonial = {
  quote: string;
  name: string;
  // Role and business, e.g. "Owner, Sweet Crumbs Bakery".
  role: string;
  // When the review was given (ISO date), for schema.org datePublished.
  date: string;
  // A photo in public/images/testimonials/, used with the person's permission.
  photo?: string;
};

export const TESTIMONIALS: readonly Testimonial[] = [];

// The reviews as schema.org properties for the SoftwareApplication JSON-LD: text and author
// only, matching the wall, which shows no stars (so there is no rating to mark up). Nothing
// is added until there is a real review.
export function reviewSchema(items: readonly Testimonial[] = TESTIMONIALS) {
  if (items.length === 0) return {};
  return {
    review: items.map((r) => ({
      "@type": "Review",
      reviewBody: r.quote,
      datePublished: r.date,
      author: { "@type": "Person", name: r.name },
    })),
  };
}

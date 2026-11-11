import { useTranslations } from "next-intl";
import { Marquee } from "./marquee";
import { TESTIMONIALS, type Testimonial } from "./testimonials";

// A customer review: the quote and who said it, no stars. The same reviews are in the
// page's JSON-LD (reviewSchema), so search engines can read them.
function ReviewCard({ item }: { item: Testimonial }) {
  return (
    <li className="flex w-[19rem] shrink-0 sm:w-96">
      <figure className="flex flex-col rounded-2xl bg-muted p-6">
        <blockquote className="text-[15px] leading-relaxed">
          <p>“{item.quote}”</p>
        </blockquote>
        <figcaption className="mt-auto flex items-center gap-3 pt-6">
          {item.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small local photos, sized here
            <img src={item.photo} alt="" width={36} height={36} className="size-9 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-card text-sm font-semibold">
              {item.name.slice(0, 1)}
            </span>
          )}
          <span className="text-sm">
            <span className="block font-medium">{item.name}</span>
            <span className="block text-muted-foreground">{item.role}</span>
          </span>
        </figcaption>
      </figure>
    </li>
  );
}

// Real customer reviews (testimonials.ts) in a sliding row. Nothing shows until there is a
// real review: invented ones are never added (founder asked, 2026-11-11; declined).
export function CustomerReviews() {
  const t = useTranslations("marketing.home.reviews");
  if (TESTIMONIALS.length === 0) return null;
  return (
    <section aria-labelledby="reviews-title" className="pb-16 md:pb-24">
      <h2 id="reviews-title" className="display px-4 text-center text-4xl text-balance md:text-5xl">
        {t("title")}
      </h2>
      <Marquee label={t("title")} className="mx-auto mt-12 max-w-[1440px]">
        {TESTIMONIALS.map((item) => (
          <ReviewCard key={`${item.name}-${item.date}`} item={item} />
        ))}
      </Marquee>
    </section>
  );
}

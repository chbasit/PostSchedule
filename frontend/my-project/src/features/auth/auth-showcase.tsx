import { Sparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { PLATFORMS } from "@/providers/catalog";
import { PreviewPhones } from "@/features/marketing/preview-phones";

// The picture side of the sign-in and sign-up pages (founder's call, 2026-11-14): a split
// screen with the form on the left, and here, on forest, the product's own phone previews with
// a headline over the bottom. Our own facts only: the trial and the platforms, no ratings or
// customer counts. Hidden on phones, where the form has the screen to itself.
export function AuthShowcase() {
  const t = useTranslations("auth.showcase");
  const format = useFormatter();
  const platforms = format.list(
    PLATFORMS.map((p) => p.name),
    { type: "conjunction" },
  );
  return (
    // Exactly the screen's height, so the headline and platforms always stay in view.
    <aside className="relative hidden overflow-hidden bg-forest text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
      {/* Soft squares and light, for depth. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -end-24 size-96 rounded-full bg-leaf/15 blur-3xl" />
        <div className="absolute bottom-40 -start-20 size-80 rounded-full bg-card-aqua/10 blur-3xl" />
        <div className="absolute top-16 start-12 size-24 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm" />
        <div className="absolute top-40 start-28 size-12 rounded-lg border border-white/15 bg-white/5" />
        <div className="absolute top-24 end-16 size-28 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm" />
        <div className="absolute bottom-[42%] end-10 size-16 rounded-xl border border-white/10 bg-white/5" />
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-10 pt-10">
        {/* A little smaller than on the homepage, so everything fits a laptop screen. */}
        <div className="[zoom:0.8]">
          <PreviewPhones label={t("phones", { platforms })} />
        </div>
      </div>

      <div className="relative bg-linear-to-t from-forest via-forest/95 to-transparent px-12 pt-6 pb-10 xl:px-16">
        <Sparkles className="size-7 text-leaf" aria-hidden />
        <h2 className="mt-3 max-w-xl font-heading text-4xl font-semibold tracking-tight text-balance xl:text-[2.75rem] xl:leading-tight">{t("title")}</h2>
        <p className="mt-3 max-w-lg text-lg text-white/80">{t("body", { days: TRIAL_DAYS })}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ul className="flex -space-x-1.5" aria-hidden>
            {PLATFORMS.map((p) => (
              <li key={p.id}>
                <PlatformMark id={p.id} className="rounded-full ring-2 ring-forest" />
              </li>
            ))}
          </ul>
          <p className="text-sm text-white/75">{t("platforms", { platforms })}</p>
        </div>
      </div>
    </aside>
  );
}

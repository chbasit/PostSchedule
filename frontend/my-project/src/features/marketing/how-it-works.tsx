import { useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import { PLATFORMS } from "@/providers/catalog";

// How it works, in three cards (founder's call, 2026-11-14): a numbered chip, the step, what
// happens, and small tags with what the step involves. Only what the product does today.
const STEPS = [
  { key: "connect", tags: ["platforms"] },
  { key: "check", tags: ["checks", "previews", "copy"] },
  { key: "publish", tags: ["calendar", "zones", "now"] },
] as const;

export function HowItWorks() {
  const t = useTranslations("marketing.home.how");
  const shown = PLATFORMS.slice(0, 3);
  return (
    <section aria-labelledby="how-title" className="bg-band py-16 md:py-24 dark:border-y dark:border-border">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-8">
        <p className="mx-auto flex w-fit items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-sm font-medium ring-1 ring-border">
          <span aria-hidden className="size-2 rounded-full bg-leaf ring-2 ring-leaf/30" />
          {t("eyebrow")}
        </p>
        <h2 id="how-title" className="display mx-auto mt-5 max-w-3xl text-center text-3xl text-balance sm:text-4xl md:text-5xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-balance text-muted-foreground sm:text-lg">{t("sub")}</p>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ key, tags }, i) => (
            <li key={key} className="flex flex-col rounded-2xl bg-card p-6 md:p-7 ring-1 ring-border">
              <span aria-hidden className="tabular inline-flex size-12 items-center justify-center rounded-xl bg-card font-heading text-lg font-medium ring-1 ring-border">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 font-heading text-lg font-medium tracking-tight md:mt-6 md:text-xl">{t(`steps.${key}.title`)}</h3>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">{t(`steps.${key}.body`)}</p>
              <ul className="mt-auto flex flex-wrap gap-2 pt-6">
                {tags.map((tag) =>
                  tag === "platforms" ? (
                    [
                      ...shown.map((p) => (
                        <li key={p.id} className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 text-sm ring-1 ring-border">
                          <PlatformMark id={p.id} size="sm" className="rounded-md" /> {p.name}
                        </li>
                      )),
                      <li key="more" className="rounded-lg bg-card px-2.5 py-1 text-sm ring-1 ring-border">
                        {t("more", { count: PLATFORMS.length - shown.length })}
                      </li>,
                    ]
                  ) : (
                    <li key={tag} className="rounded-lg bg-card px-2.5 py-1 text-sm ring-1 ring-border">
                      {t(`tags.${tag}`)}
                    </li>
                  ),
                )}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

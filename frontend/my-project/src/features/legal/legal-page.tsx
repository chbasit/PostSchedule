import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { parseInline } from "./inline";
import { getLegalPage, type LegalKey } from "./registry";

const LINK_CLASS = "font-medium underline underline-offset-4 transition-colors hover:decoration-2";

function Inline({ text }: { text: string }) {
  return parseInline(text).map((seg, i) =>
    !seg.href ? (
      <Fragment key={i}>{seg.text}</Fragment>
    ) : seg.href.startsWith("/") ? (
      <Link key={i} href={seg.href} className={LINK_CLASS}>
        {seg.text}
      </Link>
    ) : (
      <a key={i} href={seg.href} className={LINK_CLASS}>
        {seg.text}
      </a>
    ),
  );
}

// One shell for every legal page: translated title and date, then the English text. Outside
// English a notice says so, and the English parts carry lang="en" (and dir="ltr" in Arabic).
export function LegalPage({ pageKey }: { pageKey: LegalKey }) {
  const t = useTranslations("legal");
  const format = useFormatter();
  const locale = useLocale();
  const { doc } = getLegalPage(pageKey);
  const english = locale === "en" ? {} : ({ lang: "en", dir: "ltr" } as const);

  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-12 md:px-6 md:pt-16">
      <header>
        <h1 className="display text-4xl text-balance md:text-5xl">{t(`${pageKey}.title`)}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("updated", { date: format.dateTime(new Date(doc.updated), { dateStyle: "long", timeZone: "UTC" }) })}
        </p>
        {locale !== "en" && (
          <p role="note" className="mt-6 rounded-xl border bg-muted px-4 py-3 text-sm">
            {t("englishOnly")}
          </p>
        )}
      </header>

      <div {...english} className="mt-8 space-y-4 text-lg leading-relaxed">
        {doc.intro.map((text, i) => (
          <p key={i}>
            <Inline text={text} />
          </p>
        ))}
      </div>

      <nav aria-label={t("onThisPage")} className="mt-10 rounded-2xl border p-5">
        <p className="font-heading text-sm font-semibold">{t("onThisPage")}</p>
        <ol {...english} className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {doc.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="inline-flex min-h-6 items-center text-muted-foreground transition-colors hover:text-foreground">
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div {...english}>
        {doc.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="mt-12 scroll-mt-24">
            <h2 id={`${section.id}-heading`} className="font-heading text-2xl font-semibold tracking-tight">
              {section.heading}
            </h2>
            {section.blocks.map((block, i) =>
              typeof block === "string" ? (
                <p key={i} className="mt-4 leading-relaxed">
                  <Inline text={block} />
                </p>
              ) : (
                <ul key={i} className="mt-4 list-disc space-y-2 ps-5 leading-relaxed marker:text-muted-foreground">
                  {block.map((item, j) => (
                    <li key={j}>
                      <Inline text={item} />
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/config/site";
import { pageMetadata } from "@/features/tools/metadata";
import { TOOLS, toolHref } from "@/features/tools/registry";
import { ToolCard } from "@/features/tools/tool-card";
import { ToolBadges, ToolsCta } from "@/features/tools/tool-page";

export async function generateMetadata() {
  const t = await getTranslations("tools.index");
  return pageMetadata("/tools", t("metaTitle"), t("metaDescription"));
}

export default function ToolsPage() {
  const t = useTranslations("tools");
  const locale = useLocale();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t("index.metaTitle"),
          itemListElement: TOOLS.map((tool, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t(`${tool.key}.name`),
            url: `${SITE_URL}/${locale}${toolHref(tool)}`,
          })),
        }}
      />
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 md:px-6 md:pt-16 lg:px-8">
        <h1 className="display max-w-3xl text-5xl md:text-6xl">{t("index.title")}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t("index.intro")}</p>
        <ToolBadges className="mt-6" />
      </section>
      <section aria-label={t("index.eyebrow")} className="mx-auto max-w-6xl px-4 pb-20 md:px-6 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.key}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>
      <ToolsCta />
    </>
  );
}

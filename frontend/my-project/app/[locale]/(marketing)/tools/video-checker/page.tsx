import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { VideoChecker } from "@/features/preflight/video-checker";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tools.videoChecker");
  const locale = await rootLocale();
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/tools/video-checker` },
  };
}

export default function VideoCheckerPage() {
  const t = useTranslations("tools.videoChecker");
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-14 md:px-6">
      <div className="mb-10 max-w-3xl space-y-4">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display text-5xl">{t("title")}</h1>
        {/* Answer first: what the tool checks, in one sentence (SEO-AEO.md workflow 2). */}
        <p className="text-lg text-muted-foreground">{t("intro")}</p>
      </div>
      <VideoChecker />
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AI_ENABLED } from "@/config/site";
import { AiStudio } from "@/features/ai-studio/ai-studio";
import { AiStudioComingSoon } from "@/features/ai-studio/coming-soon";
import { AppPage } from "@/features/shell/app-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("aiStudio") };
}

export default function AiStudioPage() {
  return (
    <AppPage skeleton="cards">
      {AI_ENABLED ? <AiStudio /> : <AiStudioComingSoon />}
    </AppPage>
  );
}

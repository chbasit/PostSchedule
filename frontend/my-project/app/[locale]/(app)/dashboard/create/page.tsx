import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppPage } from "@/features/shell/app-page";
import { Composer } from "@/features/composer/composer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("newPost") };
}

export default function CreatePage() {
  return (
    <AppPage skeleton="composer">
      <Composer />
    </AppPage>
  );
}

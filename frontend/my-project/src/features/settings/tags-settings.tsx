"use client";

import { Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { TagsCard } from "@/features/tags/tags-card";

export function TagsSettings() {
  const t = useTranslations("settings.tags");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={Tag} tint="rose" title={t("title")} description={t("body")} />
      <TagsCard />
    </div>
  );
}

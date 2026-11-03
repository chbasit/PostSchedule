import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PRODUCT_NAME } from "@/config/site";
import { pageMetadata } from "@/features/tools/metadata";
import { getLegalPage, type LegalKey } from "./registry";

export async function legalMetadata(key: LegalKey): Promise<Metadata> {
  const t = await getTranslations("legal");
  return pageMetadata(getLegalPage(key).href, t(`${key}.title`), t(`${key}.metaDescription`, { product: PRODUCT_NAME }));
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { getPlatform, type InsightMetric, type PlatformId } from "@/providers/catalog";

// Metrics that get a column in the per-post table: everything except account-level totals.
export function postColumns(provider: PlatformId): InsightMetric[] {
  return getPlatform(provider).insights.metrics.filter((m) => m !== "followers" && m !== "posts");
}

// What engagement rate divides by on this platform (providers/types.ts).
export function rateBase(provider: PlatformId): "reach" | "impressions" | "views" | "followers" {
  const metrics = getPlatform(provider).insights.metrics;
  return (["reach", "impressions", "views"] as const).find((m) => metrics.includes(m)) ?? "followers";
}

// The platform's own word for each metric: LinkedIn "Reactions", YouTube "Subscribers".
export function useMetricLabel(provider: PlatformId) {
  const t = useTranslations("insights.metrics");
  const terms = getPlatform(provider).insights.terms ?? {};
  return (metric: InsightMetric) => t(terms[metric] ?? metric);
}

export function useFormatMetric() {
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (metric: InsightMetric, value: number) => (metric === "engagementRate" ? percent.format(value / 100) : number.format(value));
}

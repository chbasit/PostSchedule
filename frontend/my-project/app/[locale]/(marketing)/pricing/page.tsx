import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { JsonLd } from "@/components/json-ld";
import { PRODUCT_NAME, SITE_URL } from "@/config/site";
import { FEATURES, FOUNDING_CUSTOMERS, FOUNDING_LOCK_MONTHS, MAX_YEARLY_SAVING, PLANS, TRIAL_DAYS } from "@/lib/billing/plans";
import { PricingPlans } from "@/features/billing/pricing-plans";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  const locale = await rootLocale();
  return { title: t("metaTitle"), description: t("metaDescription", { percent: MAX_YEARLY_SAVING }), alternates: { canonical: `/${locale}/pricing` } };
}

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tp = useTranslations("plans");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: PRODUCT_NAME,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: PLANS.map((p) => ({
            "@type": "Offer",
            name: p.key,
            price: p.priceMonthly,
            priceCurrency: "USD",
            url: `${SITE_URL}/pricing`,
          })),
        }}
      />
      <section className="mx-auto max-w-[1440px] px-4 pb-16 pt-14 text-center md:px-6 lg:px-8">
        <h1 className="display mx-auto max-w-3xl text-5xl text-balance md:text-6xl">{t("title")}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{t("sub", { days: TRIAL_DAYS })}</p>
        <p className="mx-auto mt-5 inline-flex rounded-full bg-highlight px-3.5 py-1 text-sm font-medium text-highlight-foreground">
          {t("founding", { count: FOUNDING_CUSTOMERS, months: FOUNDING_LOCK_MONTHS })}
        </p>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-8">
        <PricingPlans />
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-20 md:px-6 lg:px-8">
        <h2 className="mb-6 font-heading text-2xl font-semibold tracking-tight">{t("compareTitle")}</h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">{t("compareTitle")}</caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="sticky start-0 bg-muted px-4 py-3 text-start font-medium">
                  {t("feature")}
                </th>
                {PLANS.map((p) => (
                  <th key={p.key} scope="col" className="px-4 py-3 text-start font-medium">
                    {tp(`names.${p.key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <th scope="row" className="sticky start-0 bg-background px-4 py-3 text-start font-normal">
                  {t("rowAccounts")}
                </th>
                {PLANS.map((p) => (
                  <td key={p.key} className="tabular px-4 py-3">
                    {p.accounts}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="sticky start-0 bg-background px-4 py-3 text-start font-normal">
                  {t("rowSeats")}
                </th>
                {PLANS.map((p) => (
                  <td key={p.key} className="tabular px-4 py-3">
                    {p.seats}
                  </td>
                ))}
              </tr>
              {FEATURES.map((row) => (
                <tr key={row}>
                  <th scope="row" className="sticky start-0 bg-background px-4 py-3 text-start font-normal">
                    {tp(`features.${row}`)}
                  </th>
                  {PLANS.map((p) => (
                    <td key={p.key} className="px-4 py-3">
                      {p.features.includes(row) ? (
                        <>
                          <Check className="size-4" aria-hidden />
                          <span className="sr-only">{t("included")}</span>
                        </>
                      ) : (
                        <>
                          <Minus className="size-4 text-muted-foreground" aria-hidden />
                          <span className="sr-only">{t("notIncluded")}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t("note")}</p>
      </section>
    </>
  );
}

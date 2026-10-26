import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/banner";
import { Link } from "@/i18n/navigation";
import { FOUNDING_CUSTOMERS } from "@/lib/billing/plans";
import { SITE_FONTS } from "@/features/marketing/fonts";
import { SiteFontsRoot } from "@/features/marketing/site-fonts-root";
import { SiteFooter } from "@/features/marketing/site-footer";
import { SiteHeader } from "@/features/marketing/site-header";

export default function MarketingLayout({ children }: LayoutProps<"/[locale]">) {
  const t = useTranslations("marketing");
  return (
    <div className={SITE_FONTS}>
      <SiteFontsRoot className={SITE_FONTS} />
      <Banner tone="announcement" dismissKey="founding-offer-v1">
        <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold transition-colors hover:bg-ink/10">
          {t("announcement", { count: FOUNDING_CUSTOMERS })}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </Banner>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

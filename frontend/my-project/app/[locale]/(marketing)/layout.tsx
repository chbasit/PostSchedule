import { SiteFooter } from "@/features/marketing/site-footer";
import { SiteHeader } from "@/features/marketing/site-header";

// No announcement bar above the header (founder's call, 2026-11-14): the founding offer is on
// the Pricing page.
export default function MarketingLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    // The whole product uses DM Sans; "site-fonts" only sets the public site's headline style.
    <div className="site-fonts">
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

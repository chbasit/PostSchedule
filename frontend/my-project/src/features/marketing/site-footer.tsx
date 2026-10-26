import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { PlatformMark } from "@/components/platform-badge";
import { PRODUCT_NAME } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { PLATFORMS } from "@/providers/catalog";
import { TOOLS, toolHref } from "@/features/tools/registry";

// A full-width deep green footer, its content on the landing sections' 1440 px line: brand and
// link columns, the copyright line, and the product name set large along the bottom edge
// (decoration, hidden from assistive tech). Focus rings turn white so they show on the green.
export function SiteFooter() {
  const t = useTranslations("marketing.footer");
  const tt = useTranslations("tools");
  const columns = [
    {
      title: t("product"),
      links: [
        { href: "/#features", label: t("features") },
        { href: "/pricing", label: t("pricing") },
      ],
    },
    {
      title: t("tools"),
      links: [...TOOLS.map((tool) => ({ href: toolHref(tool), label: tt(`${tool.key}.name`) })), { href: "/tools", label: t("allTools") }],
    },
    {
      title: t("account"),
      links: [
        { href: "/login", label: t("login") },
        { href: "/signup", label: t("signup") },
      ],
    },
  ];

  return (
    <footer className="overflow-hidden bg-footer text-footer-foreground [&_:focus-visible]:outline-footer-foreground">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-10 px-4 pb-12 pt-16 md:grid-cols-[1.5fr_0.8fr_1.3fr_0.8fr] md:px-6 lg:px-8">
        <div className="col-span-2 space-y-5 md:col-span-1">
          <Link href="/" className="inline-flex rounded-lg">
            {/* The ink tile is close to the footer's green; a lighter ring keeps its edge. */}
            <Logo className="text-lg [&>span:first-child]:ring-white/30" />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-footer-foreground/70">{t("tagline")}</p>
          <ul aria-hidden className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((platform) => (
              <li key={platform.id}>
                <PlatformMark id={platform.id} size="sm" className="size-7 rounded-lg" />
              </li>
            ))}
          </ul>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className={col.links.length > 4 ? "col-span-2 sm:col-span-1" : undefined}>
            <p className="mb-4 font-heading text-sm font-bold">{col.title}</p>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-footer-foreground/70 transition-colors hover:text-footer-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-8">
        <p className="border-t border-footer-foreground/15 py-6 text-sm text-footer-foreground/60">{t("copyright", { product: PRODUCT_NAME })}</p>
      </div>
      <p
        aria-hidden
        dir="ltr"
        className="pointer-events-none -mb-[0.14em] select-none whitespace-nowrap text-center font-heading text-[clamp(3.25rem,13.5vw,12.5rem)] font-extrabold leading-[0.85] tracking-[-0.05em] text-footer-foreground/[0.07]"
      >
        {PRODUCT_NAME}
      </p>
    </footer>
  );
}

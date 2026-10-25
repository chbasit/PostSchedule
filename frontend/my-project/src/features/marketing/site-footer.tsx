import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { PRODUCT_NAME } from "@/config/site";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("marketing.footer");
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
      links: [{ href: "/tools/video-checker", label: t("videoChecker") }],
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
    <footer className="border-t">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)] md:px-6 lg:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="eyebrow mb-3">{col.title}</p>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-[1200px] px-4 py-6 text-xs text-muted-foreground md:px-6 lg:px-8">
          {t("copyright", { product: PRODUCT_NAME })}
        </p>
      </div>
    </footer>
  );
}

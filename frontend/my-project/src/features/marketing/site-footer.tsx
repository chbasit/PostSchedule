import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { PRODUCT_NAME } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { TOOLS, toolHref } from "@/features/tools/registry";

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
    <footer className="border-t bg-shell">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 md:grid-cols-[1.4fr_0.8fr_1.3fr_0.8fr] md:px-6 lg:px-8">
        <div className="col-span-2 space-y-4 md:col-span-1">
          <Link href="/" className="inline-flex rounded">
            <Logo />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{t("tagline")}</p>
          <p className="text-sm text-muted-foreground">{t("copyright", { product: PRODUCT_NAME })}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className={col.links.length > 4 ? "col-span-2 sm:col-span-1" : undefined}>
            <p className="eyebrow mb-4">{col.title}</p>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ThemeMenu } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader() {
  const t = useTranslations("marketing.nav");
  const links = [
    { href: "/#features", label: t("product") },
    { href: "/pricing", label: t("pricing") },
    { href: "/tools/video-checker", label: t("freeTools") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 md:px-6 lg:px-8">
        <Link href="/" className="rounded" aria-label={t("home")}>
          <Logo />
        </Link>
        <nav aria-label={t("main")} className="ms-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex h-9 items-center rounded px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeMenu />
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
            {t("login")}
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), "hidden sm:inline-flex")}>
            {t("startFree")}
          </Link>
          <MobileMenu links={links.map((l) => ({ ...l }))} loginLabel={t("login")} startLabel={t("startFree")} />
        </div>
      </div>
    </header>
  );
}

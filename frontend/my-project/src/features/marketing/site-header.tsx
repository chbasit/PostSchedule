import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { ThemeMenu } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./mobile-menu";

// A floating, rounded bar: 12 px from the top and 56 px tall, blurred over the page.
export function SiteHeader() {
  const t = useTranslations("marketing.nav");
  const links = [
    { href: "/#features", label: t("product") },
    { href: "/pricing", label: t("pricing") },
    { href: "/tools", label: t("freeTools") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-4">
      <div className="mx-auto grid h-14 max-w-[1200px] grid-cols-[1fr_auto] items-center gap-3 rounded-full border bg-background/80 pe-2 ps-4 shadow-card backdrop-blur-md md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="justify-self-start rounded-full" aria-label={t("home")}>
          <Logo />
        </Link>
        <nav aria-label={t("main")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 justify-self-end">
          <LanguageSwitcher className="rounded-full" />
          <ThemeMenu className="rounded-full" />
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden rounded-full sm:inline-flex")}>
            {t("login")}
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), "hidden rounded-full px-5 sm:inline-flex")}>
            {t("startFree")}
          </Link>
          <MobileMenu links={links.map((l) => ({ ...l }))} loginLabel={t("login")} startLabel={t("startFree")} />
        </div>
      </div>
    </header>
  );
}

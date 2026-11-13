import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { FeaturesMenu } from "./features-menu";
import { HeaderBar } from "./header-bar";
import { MobileMenu } from "./mobile-menu";

// A full-width bar, 64 px tall, blurred over the page. Its content lines up with the landing
// sections (1440 px). Links at 16 px (founder's call, 2026-11-13).
export function SiteHeader() {
  const t = useTranslations("marketing.nav");
  const links = [
    { href: "/features", label: t("features") },
    { href: "/pricing", label: t("pricing") },
    { href: "/tools", label: t("freeTools") },
  ] as const;

  return (
    <HeaderBar>
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto] items-center gap-3 px-4 md:grid-cols-[1fr_auto_1fr] md:px-6 lg:px-8">
        <Link href="/" className="justify-self-start rounded-full" aria-label={t("home")}>
          <Logo />
        </Link>
        <nav aria-label={t("main")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {/* Features opens a menu of every feature on wide screens; phones get the page. */}
            <li>
              <FeaturesMenu />
            </li>
            {links.slice(1).map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex h-10 items-center rounded-full px-4 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 justify-self-end">
          <ThemeToggle className="rounded-full" />
          {/* No "Log in" here (founder's call, 2026-11-11): it is in the phone menu, the footer
              and on the sign-up page. */}
          <Link href="/signup" className={cn(buttonVariants(), "hidden h-10 rounded-full px-5 text-base sm:inline-flex")}>
            {t("startFree")}
          </Link>
          <MobileMenu links={links.map((l) => ({ ...l }))} loginLabel={t("login")} startLabel={t("startFree")} />
        </div>
      </div>
    </HeaderBar>
  );
}

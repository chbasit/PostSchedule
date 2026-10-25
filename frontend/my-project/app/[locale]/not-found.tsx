import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <p className="eyebrow">404</p>
      <h1 className="display text-4xl">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("body")}</p>
      <Link href="/" className={buttonVariants()}>
        {t("home")}
      </Link>
    </main>
  );
}

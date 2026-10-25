"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition, type TransitionStartFunction } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isRtl, localeNames, routing, type AppLocale } from "@/i18n/routing";

type Props = {
  // Signed-in screens also save the choice to the profile.
  onChange?: (locale: AppLocale) => void;
  showLabel?: boolean;
};

// Keeps the current page; the middleware remembers the choice in a cookie (FRONTEND.md F15).
export function LanguageSwitcher({ onChange, showLabel = false }: Props) {
  const t = useTranslations("language");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={showLabel ? "md" : "icon"}
          aria-label={showLabel ? undefined : t("label")}
          aria-busy={pending || undefined}
        >
          <Globe aria-hidden />
          {showLabel ? <span lang={locale}>{localeNames[locale]}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <LanguageOptions onChange={onChange} startTransition={startTransition} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Reads the URL only while the menu is open, so routes with runtime params (an account
// page's id) can still prerender their shell.
function LanguageOptions({ onChange, startTransition }: Pick<Props, "onChange"> & { startTransition: TransitionStartFunction }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function select(next: string) {
    if (next === locale) return;
    onChange?.(next as AppLocale);
    startTransition(() => router.replace(pathname, { locale: next as AppLocale, scroll: false }));
  }

  return (
    <DropdownMenuRadioGroup value={locale} onValueChange={select}>
      {routing.locales.map((l) => (
        <DropdownMenuRadioItem key={l} value={l} lang={l} dir={isRtl(l) ? "rtl" : "ltr"}>
          {localeNames[l]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SoonBadge } from "@/features/ai-studio/coming-soon";
import { FEATURES, featureHref } from "./feature-catalog";

// How long the menu waits after the pointer leaves, so it can cross the gap into the menu.
const CLOSE_DELAY_MS = 150;

// "Features" in the site header: every feature in two columns, each opening its part of the
// Features page; the ones not built yet carry a Soon badge (founder's call, 2026-11-13).
// A mouse opens it by hovering (founder's call, 2026-11-13); touch and the keyboard open it
// as before, by tapping or pressing Enter.
export function FeaturesMenu() {
  const t = useTranslations("marketing.features");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Closing because the pointer left: keep focus where it is instead of moving it to the trigger.
  const hoverClosed = useRef(false);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const enter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      hoverClosed.current = true;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  };

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onPointerEnter={enter}
        onPointerLeave={leave}
        // Hovering already opened it, so a click must not close it again.
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && open) event.preventDefault();
        }}
        className="inline-flex h-10 items-center gap-1 rounded-full px-4 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
      >
        {t("menu")}
        <ChevronDown className="size-4 transition-transform duration-200 in-data-[state=open]:rotate-180" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        onPointerEnter={enter}
        onPointerLeave={leave}
        onCloseAutoFocus={(event) => {
          if (hoverClosed.current) event.preventDefault();
          hoverClosed.current = false;
        }}
        className="w-[min(42rem,calc(100vw-2rem))] p-2"
      >
        <div className="grid gap-1 sm:grid-cols-2">
          {FEATURES.map(({ key, icon: Icon, tint, soon }) => (
            <DropdownMenuItem key={key} asChild className="items-start gap-3 rounded-xl p-3">
              <Link href={featureHref(key)}>
                <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-forest", tint)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 whitespace-normal">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    {t(`items.${key}.title`)}
                    {soon ? <SoonBadge /> : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t(`items.${key}.short`)}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

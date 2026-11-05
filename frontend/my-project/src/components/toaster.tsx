"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore, type CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { Spinner } from "@/components/ui/spinner";

const DESKTOP = "(min-width: 64rem)";

function subscribeDesktop(cb: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
}

// Sonner's own colours, swapped for the theme's so toasts follow light and dark.
const themeVars = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "0.75rem",
  "--width": "380px",
} as CSSProperties;

// Sonner injects its stylesheet after ours, so the overrides below are marked important.
const classNames = {
  toast: "items-start! gap-3! py-3.5! ps-4! pe-11! font-sans! text-sm! shadow-menu!",
  icon: "m-0! size-5!",
  content: "gap-0.5!",
  title: "font-medium! leading-5!",
  description: "text-[13px]! leading-5! text-muted-foreground!",
  actionButton:
    "-my-1! h-7! rounded-md! border! border-border! bg-transparent! px-2.5! text-sm! font-medium! text-foreground! transition-colors! hover:bg-muted!",
  // Sits on the end side, level with the title, instead of sonner's badge on the corner.
  closeButton:
    "start-auto! end-2! top-2.5! size-7! transform-none! rounded-md! border-0! bg-transparent! text-muted-foreground! hover:bg-muted! hover:text-foreground!",
};

const icons = {
  success: <CircleCheck className="size-5 text-success" />,
  error: <CircleAlert className="size-5 text-danger" />,
  info: <Info className="size-5 text-info" />,
  warning: <TriangleAlert className="size-5 text-warning" />,
  loading: <Spinner className="size-5 text-muted-foreground" />,
  close: <X className="size-4" />,
};

// Desktop: bottom end, lifted over a page's sticky action bar (data-action-bar, see
// globals.css). Phones: top centre, clear of the bottom navigation and the composer's bar.
export function Toaster({ dir }: { dir: "ltr" | "rtl" }) {
  const t = useTranslations("common");
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => false);
  return (
    <Sonner
      position={desktop ? (dir === "rtl" ? "bottom-left" : "bottom-right") : "top-center"}
      dir={dir}
      offset={24}
      gap={10}
      closeButton
      icons={icons}
      style={themeVars}
      toastOptions={{ classNames, closeButtonAriaLabel: t("dismiss") }}
    />
  );
}

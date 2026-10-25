"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

type ContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  // "sheet" slides in from the end edge (detail panels); "drawer" from the start edge (phone menu).
  variant?: "dialog" | "sheet" | "drawer";
  hideClose?: boolean;
};

// Traps focus, closes on Escape, returns focus to the trigger (Radix behaviour).
export function DialogContent({ className, children, variant = "dialog", hideClose, ...props }: ContentProps) {
  const t = useTranslations("common");
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-popover text-popover-foreground outline-none",
          variant === "dialog" &&
            "left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6 shadow-dialog data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in dark:ring-1 dark:ring-white/10",
          variant === "sheet" &&
            "inset-y-0 end-0 h-dvh w-full max-w-md overflow-y-auto border-s p-6 data-[state=closed]:animate-sheet-out data-[state=open]:animate-slide-in-end",
          variant === "drawer" &&
            "inset-y-0 start-0 h-dvh w-full max-w-xs overflow-y-auto border-e p-4 data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className="absolute end-3 top-3 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("close")}
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-1.5 pe-8">
      <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
      )}
    </div>
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

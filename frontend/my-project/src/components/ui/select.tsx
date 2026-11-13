"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fieldBase } from "./input";
import { menuItem, menuSurface } from "./menu-styles";

// Looks like a text field; the open list is a shadowed menu with the chosen item ticked.
export const selectTrigger = cn(
  fieldBase,
  "group inline-flex h-10 items-center justify-between gap-2 px-3 text-start text-sm data-[placeholder]:text-muted-foreground data-[state=open]:border-foreground/60 [&>span]:truncate",
);

// Filter bars: no border, just the label and chevron, with a muted fill on hover and while open.
export const selectTriggerGhost =
  "group inline-flex h-8 w-auto max-w-full shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-start text-sm font-medium text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted [&>span]:truncate";

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  variant?: "field" | "ghost";
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Select({ value, onValueChange, children, variant = "field", placeholder, disabled, name, className, contentClassName, ...trigger }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
      <SelectPrimitive.Trigger className={cn(variant === "ghost" ? selectTriggerGhost : selectTrigger, className)} {...trigger}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            menuSurface,
            "max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin) overflow-hidden",
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function SelectItem({ value, children, className, lang, disabled }: { value: string; children: ReactNode; className?: string; lang?: string; disabled?: boolean }) {
  return (
    <SelectPrimitive.Item value={value} lang={lang} disabled={disabled} className={cn(menuItem, "pe-8 data-disabled:pointer-events-none data-disabled:opacity-50", className)}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute inset-e-2.5 inline-flex animate-pop">
        <Check aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

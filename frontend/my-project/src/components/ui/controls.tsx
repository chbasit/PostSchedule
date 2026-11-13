"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer inline-flex size-5 shrink-0 items-center justify-center rounded-[3px] border border-input bg-background transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:cursor-not-allowed disabled:border-border disabled:bg-muted",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const RadioGroup = ({ className, ...props }: ComponentProps<typeof RadioPrimitive.Root>) => (
  <RadioPrimitive.Root className={cn("grid gap-2", className)} {...props} />
);

export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-input bg-background data-[state=checked]:border-forest disabled:border-border disabled:bg-muted dark:data-[state=checked]:border-leaf",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-forest dark:bg-leaf" />
    </RadioPrimitive.Item>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-muted p-0.5 transition-colors data-[state=checked]:border-forest data-[state=checked]:bg-forest disabled:border-border dark:data-[state=checked]:border-leaf dark:data-[state=checked]:bg-leaf",
        className,
      )}
      {...props}
    >
      {/* A bordered thumb instead of a drop shadow keeps it visible on both track colours. */}
      <SwitchPrimitive.Thumb className="block size-[18px] rounded-full border border-input bg-background transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:border-forest dark:data-[state=checked]:border-leaf rtl:data-[state=checked]:-translate-x-5" />
    </SwitchPrimitive.Root>
  );
}

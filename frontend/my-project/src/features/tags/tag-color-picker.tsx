"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { RadioGroup as RadioPrimitive } from "radix-ui";
import { TINT_ORDER, tints } from "@/components/tint";
import type { TagColor } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// Swatches as a radio group: arrow keys move between colours and each one has a spoken name.
export function TagColorPicker({ value, onChange, labelledBy }: { value: TagColor; onChange: (c: TagColor) => void; labelledBy: string }) {
  const t = useTranslations("settings.tags.colors");
  return (
    <RadioPrimitive.Root
      value={value}
      onValueChange={(v) => onChange(v as TagColor)}
      aria-labelledby={labelledBy}
      orientation="horizontal"
      className="flex flex-wrap gap-1"
    >
      {TINT_ORDER.map((c) => (
        <RadioPrimitive.Item
          key={c}
          value={c}
          aria-label={t(c)}
          title={t(c)}
          className="inline-flex size-9 items-center justify-center rounded-full border-2 border-transparent hover:border-input data-[state=checked]:border-foreground"
        >
          <span aria-hidden className={cn("inline-flex size-6 items-center justify-center rounded-full", tints[c].dot)}>
            <RadioPrimitive.Indicator>
              <Check className="size-3.5 text-background" strokeWidth={3} />
            </RadioPrimitive.Indicator>
          </span>
        </RadioPrimitive.Item>
      ))}
    </RadioPrimitive.Root>
  );
}

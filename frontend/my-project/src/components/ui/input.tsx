import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// `field-control` gives text fields their focus style: a 2 px border in the ring colour,
// with no shadow and no offset (globals.css). Shared with select triggers.
export const fieldBase =
  "field-control w-full min-w-0 rounded-md border border-input bg-background text-foreground transition-colors hover:border-foreground/60 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

// Text fields also grey out when read-only. Not for buttons: CSS :read-only matches every
// <button>, which is what made select triggers grey.
export const control = cn(fieldBase, "placeholder:text-muted-foreground read-only:bg-muted read-only:hover:border-input");

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(control, "h-10 px-3 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea data-slot="textarea" className={cn(control, "min-h-28 px-3 py-2 text-sm leading-relaxed", className)} {...props} />
  );
}

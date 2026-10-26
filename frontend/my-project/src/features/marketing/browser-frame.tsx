import type { ReactNode } from "react";
import { PRODUCT_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

// A plain browser window around product media, screenshots and clips alike.
export function BrowserFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <figure className={cn("overflow-hidden rounded-2xl border bg-card shadow-dialog", className)}>
      <div aria-hidden className="grid grid-cols-[1fr_auto_1fr] items-center border-b bg-muted/60 px-4 py-2.5" dir="ltr">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
        </span>
        <span className="rounded-md bg-background px-3 py-0.5 text-xs text-muted-foreground">{PRODUCT_NAME}</span>
        <span />
      </div>
      {children}
    </figure>
  );
}

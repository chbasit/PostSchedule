import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border bg-card text-card-foreground", className)} {...props} />;
}

// A soft light sweep instead of a pulse.
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent dark:before:via-white/[0.07]",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className, ...props }: ComponentProps<"hr">) {
  return <hr className={cn("border-0 border-t", className)} {...props} />;
}

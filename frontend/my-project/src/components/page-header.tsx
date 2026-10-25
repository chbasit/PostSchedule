import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tints, type Tint } from "./tint";

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  tint = "blue",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  tint?: Tint;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span aria-hidden className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl", tints[tint].icon)}>
            <Icon className="size-5" />
          </span>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

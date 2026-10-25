import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A titled card of setting rows, split by hairlines.
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card px-5 pb-1 pt-5", className)}>
      <h2 className="font-semibold">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-2 divide-y">{children}</div>
    </section>
  );
}

// Label and help on the start side, the control on the end side; stacked on phones.
export function SettingRow({ id, title, description, children }: { id: string; title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 space-y-0.5">
        <p id={id} className="text-sm font-medium">
          {title}
        </p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="w-full shrink-0 sm:w-64">{children}</div>
    </div>
  );
}

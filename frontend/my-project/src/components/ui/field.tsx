"use client";

import { CircleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FieldControlProps = {
  id: string;
  // Lets button-based controls (selects, pickers) take the label as their name too.
  "aria-labelledby": string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  labelAside?: ReactNode;
  children: (props: FieldControlProps) => ReactNode;
};

// Visible label above, helper text below, error text with an icon (FRONTEND.md §5).
export function Field({ label, hint, error, className, labelAside, children }: FieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label id={labelId} htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {labelAside}
      </div>
      {children({ id, "aria-labelledby": labelId, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={errorId} className="flex animate-fade-up items-start gap-1.5 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

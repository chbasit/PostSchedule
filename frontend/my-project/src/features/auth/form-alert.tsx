"use client";

import { CircleAlert, Info } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Form-level message that receives focus so screen readers announce it (TEST.md A11Y-08).
export function FormAlert({ tone = "danger", children }: { tone?: "danger" | "info"; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [children]);
  const Icon = tone === "danger" ? CircleAlert : Info;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm outline-none",
        tone === "danger" ? "bg-danger-bg text-danger" : "bg-info-bg text-info",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

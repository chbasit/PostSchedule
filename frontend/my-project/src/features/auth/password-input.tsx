"use client";

import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PASSWORD_MIN, passwordRules } from "./schema";

// Paste and password managers are always allowed (TEST.md A11Y-07).
export function PasswordInput(props: ComponentProps<"input">) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pe-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        className="absolute end-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

// The rules for a new password, ticked off while typing.
export function PasswordRules({ value }: { value: string }) {
  const t = useTranslations("auth");
  const rules = [
    { ok: passwordRules.length(value), label: t("ruleLength", { min: PASSWORD_MIN }) },
    { ok: passwordRules.letter(value) && passwordRules.number(value), label: t("ruleMix") },
  ];
  return (
    <ul className="mt-1 space-y-1 text-sm" aria-live="polite">
      {rules.map((rule) => (
        <li key={rule.label} className={cn("flex items-center gap-2", rule.ok ? "text-success" : "text-muted-foreground")}>
          {rule.ok ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
          {rule.label}
          <span className="sr-only">{rule.ok ? t("ruleMet") : t("ruleNotMet")}</span>
        </li>
      ))}
    </ul>
  );
}

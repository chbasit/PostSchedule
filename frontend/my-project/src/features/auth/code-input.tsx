"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthErrorText } from "./auth-error";
import { FormAlert } from "./form-alert";

// The emailed code: digits only, filled in by the phone's keyboard suggestion or a paste.
export function CodeInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      spellCheck={false}
      maxLength={14}
      dir="ltr"
      className={cn("h-12 text-center font-mono text-xl tracking-[0.35em]", className)}
      {...props}
    />
  );
}

export function useCountdown(initial = 0) {
  const [remaining, setRemaining] = useState(initial);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  return [remaining, setRemaining] as const;
}

// "Send a new code" with a visible cooldown (TEST.md DBL-17). The older code stops working.
export function ResendCode({ send, startCooldown = 0, disabled }: { send: () => Promise<{ retryAfterSec: number }>; startCooldown?: number; disabled?: boolean }) {
  const t = useTranslations("auth");
  const [cooldown, setCooldown] = useCountdown(startCooldown);
  const errorText = useAuthErrorText();
  const resend = useMutation({ mutationFn: send, onSuccess: (r) => setCooldown(r.retryAfterSec) });

  return (
    <div className="space-y-3">
      {resend.isSuccess && cooldown > 0 ? <FormAlert tone="info">{t("resent")}</FormAlert> : null}
      {resend.isError ? <FormAlert>{errorText(resend.error, t("genericFailed"))}</FormAlert> : null}
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        loading={resend.isPending}
        disabled={cooldown > 0 || disabled}
        onClick={() => !resend.isPending && resend.mutate()}
      >
        {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
      </Button>
    </div>
  );
}

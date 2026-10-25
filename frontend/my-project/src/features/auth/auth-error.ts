"use client";

import { useTranslations } from "next-intl";
import { errorCode } from "@/lib/api/client";

// The failures every auth form can hit, in plain words. Form-specific cases come first
// at the call site; anything else falls back to the form's own message.
export function useAuthErrorText() {
  const t = useTranslations("auth");
  return (error: unknown, fallback: string) => {
    switch (errorCode(error)) {
      case "rate_limited":
        return t("tooManyTries");
      case "not_configured":
        return t("serviceOff");
      case "network":
      case "timeout":
        return t("networkFailed");
      default:
        return fallback;
    }
  };
}

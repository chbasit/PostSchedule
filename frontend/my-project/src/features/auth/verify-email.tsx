"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { api, usingMockApi } from "@/lib/api/client";
import { sessionKey, useSession } from "@/features/session/workspace-context";
import { useAuthErrorText } from "./auth-error";
import { FormAlert } from "./form-alert";

function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  return [remaining, setRemaining] as const;
}

// "Check your inbox" with a resend button and a visible cooldown (TEST.md DBL-17).
export function VerifyEmail() {
  const t = useTranslations("auth");
  const session = useSession();
  // Before the address is confirmed there is no session, so sign-up passes it along.
  const fromLink = useSearchParams().get("email") ?? "";
  const email = session.data?.user.email ?? fromLink;
  const [cooldown, setCooldown] = useCountdown();
  const errorText = useAuthErrorText();

  const resend = useMutation({
    mutationFn: () => api.auth.resendVerification(email),
    onSuccess: (r) => setCooldown(r.retryAfterSec),
  });

  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
        <MailCheck className="size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("checkInbox")}</h1>
        <p className="text-sm text-muted-foreground">{email ? t("sentTo", { email }) : t("sentGeneric")}</p>
      </div>
      {resend.isSuccess && cooldown > 0 ? <FormAlert tone="info">{t("resent")}</FormAlert> : null}
      {resend.isError ? <FormAlert>{errorText(resend.error, t("genericFailed"))}</FormAlert> : null}
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="lg"
          loading={resend.isPending}
          disabled={cooldown > 0 || !email}
          onClick={() => !resend.isPending && resend.mutate()}
        >
          {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
        </Button>
        {usingMockApi ? (
          <Link href="/auth/confirm?token=mock" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            {t("mockOpenLink")}
          </Link>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        {t.rich("wrongEmail", {
          link: (chunks) => (
            <Link href="/signup" className="font-semibold text-foreground transition-opacity hover:opacity-75">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

// The emailed link lands here; nothing happens until the person clicks (FRONTEND.md F1).
export function ConfirmEmail() {
  const t = useTranslations("auth");
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => api.auth.verifyEmail(new URLSearchParams(window.location.search).get("token") ?? ""),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionKey, session);
      router.replace(session.user.onboardedAt ? "/dashboard" : "/onboarding/start");
    },
  });

  return (
    <div className="space-y-5">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("confirmTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("confirmBody")}</p>
      </div>
      {confirm.isError ? <FormAlert>{t("confirmFailed")}</FormAlert> : null}
      <Button size="lg" className="w-full" loading={confirm.isPending} onClick={() => !confirm.isPending && confirm.mutate()}>
        {t("confirmButton")}
      </Button>
    </div>
  );
}

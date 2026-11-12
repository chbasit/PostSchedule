"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { api, isApiError, type Session } from "@/lib/api/client";
import { sessionKey, useSession } from "@/features/session/workspace-context";
import { useAuthErrorText } from "./auth-error";
import { CodeInput, ResendCode } from "./code-input";
import { DevCodeHint, rememberDevCode } from "./dev-code";
import { FormAlert } from "./form-alert";
import { verifySchema, type VerifyInput, type VerifyValues } from "./schema";

// "Check your email": the code from the sign-up email, a new code on request with a visible
// cooldown, and a way back when the address was wrong (FRONTEND.md F1).
export function VerifyEmail() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const errorText = useAuthErrorText();
  const params = useSearchParams();
  // Before the address is confirmed there is no session, so sign-up and sign-in pass it along.
  const known = (session.data?.user.email ?? params.get("email") ?? "").trim();
  const [typed, setTyped] = useState("");
  const email = known || typed.trim();

  const form = useForm<VerifyInput, unknown, VerifyValues>({ resolver: zodResolver(verifySchema), defaultValues: { code: "" } });
  const fillCode = useCallback((code: string) => form.setValue("code", code), [form]);
  const verify = useMutation({
    mutationFn: (values: VerifyValues) => api.auth.verifyEmail({ email, code: values.code }),
    onSuccess: (s: Session) => {
      queryClient.setQueryData(sessionKey, s);
      router.replace(s.user.onboardedAt ? "/dashboard" : "/onboarding/start");
    },
  });

  const reason = isApiError(verify.error) ? verify.error.details.reason : undefined;
  const { errors } = form.formState;

  return (
    <div className="space-y-5">
      <div className="space-y-3 text-center">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-3xl font-light tracking-tight">{t("checkInbox")}</h1>
          <p className="text-sm text-muted-foreground">{known ? t("sentTo", { email: known }) : t("sentGeneric")}</p>
        </div>
      </div>
      <DevCodeHint purpose="signup" email={email} fill={fillCode} />
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          if (!verify.isPending && email) verify.mutate(values);
        })}
      >
        {verify.isError ? (
          <FormAlert>{reason === "invalid_code" ? t("codeInvalid") : reason === "code_locked" ? t("codeLocked") : errorText(verify.error, t("genericFailed"))}</FormAlert>
        ) : null}
        {known ? null : (
          <Field label={t("email")}>
            {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={typed} onChange={(e) => setTyped(e.target.value)} />}
          </Field>
        )}
        <Field label={t("code")} hint={t("codeHint")} error={errors.code && tv(errors.code.message as "code")}>
          {(p) => <CodeInput {...p} autoFocus={!!known} {...form.register("code")} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={verify.isPending} disabled={!email} data-testid="verify-email">
          {t("verifyButton")}
        </Button>
      </form>
      <ResendCode
        send={async () => {
          const sent = await api.auth.resendVerification(email);
          rememberDevCode("signup", email, sent.dev);
          return sent;
        }}
        disabled={!email}
      />
      <p className="text-center text-sm text-muted-foreground">
        {t.rich("wrongEmail", {
          link: (chunks) => (
            <Link href="/signup" className="font-semibold text-foreground transition-opacity hover:opacity-75">
              {chunks}
            </Link>
          ),
        })}
      </p>
      {/* An address that already has an account gets no email (the answer looks the same, so
          nobody can test which addresses are registered); say so, and point to sign-in. */}
      <p className="text-center text-sm text-muted-foreground">
        {t.rich("noEmailHint", {
          link: (chunks) => (
            <Link href="/login" className="font-semibold text-foreground transition-opacity hover:opacity-75">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

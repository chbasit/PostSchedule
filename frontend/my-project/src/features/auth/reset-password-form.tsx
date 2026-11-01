"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { DEV_MODE } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { api, isApiError } from "@/lib/api/client";
import { sessionKey } from "@/features/session/workspace-context";
import { useAuthErrorText } from "./auth-error";
import { CodeInput, ResendCode } from "./code-input";
import { DevCodeHint, rememberDevCode } from "./dev-code";
import { FormAlert } from "./form-alert";
import { PasswordInput, PasswordRules } from "./password-input";
import { resetSchema, type ResetInput, type ResetValues } from "./schema";

// Matches the server (password-reset route).
const RESEND_COOLDOWN_SEC = DEV_MODE ? 5 : 60;

// The code from the reset email with the new password. The code works once; afterwards every
// session is signed out (TEST.md AUTH-06).
export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const queryClient = useQueryClient();
  const errorText = useAuthErrorText();
  const params = useSearchParams();
  const email = (params.get("email") ?? "").trim();
  // Arriving from "Send code", which has just sent one.
  const justSent = params.get("sent") === "1";

  const form = useForm<ResetInput, unknown, ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: "", password: "" },
    mode: "onBlur",
  });
  const password = useWatch({ control: form.control, name: "password" }) ?? "";
  const fillCode = useCallback((code: string) => form.setValue("code", code), [form]);

  const reset = useMutation({
    mutationFn: (values: ResetValues) => api.auth.resetPassword({ email, code: values.code, password: values.password }),
    onSuccess: () => queryClient.setQueryData(sessionKey, null),
  });

  const reason = isApiError(reset.error) ? reset.error.details.reason : undefined;

  if (reset.isSuccess) {
    return (
      <div className="space-y-5">
        <FormAlert tone="info">{t("resetDone")}</FormAlert>
        <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("signIn")}
        </Link>
      </div>
    );
  }

  // Opened without an address (an old bookmark): start from the email step.
  if (!email) {
    return (
      <div className="space-y-5">
        <FormAlert tone="info">{t("forgotSub")}</FormAlert>
        <Link href="/forgot-password" className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("sendCode")}
        </Link>
      </div>
    );
  }

  const { errors } = form.formState;

  return (
    <div className="space-y-5">
      <p className="text-center text-sm text-muted-foreground">{t("resetCodeSent", { email })}</p>
      <DevCodeHint purpose="recovery" email={email} fill={fillCode} />
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          if (!reset.isPending) reset.mutate(values);
        })}
      >
        {reset.isError ? (
          <FormAlert>
            {reason === "invalid_code"
              ? t("codeInvalid")
              : reason === "code_locked"
                ? t("codeLocked")
                : reason === "same_password"
                  ? t("samePassword")
                  : reason === "weak_password"
                    ? t("weakPassword")
                    : errorText(reset.error, t("genericFailed"))}
          </FormAlert>
        ) : null}
        <Field label={t("code")} hint={t("codeHint")} error={errors.code && tv(errors.code.message as "code")}>
          {(p) => <CodeInput {...p} autoFocus {...form.register("code")} />}
        </Field>
        <Field label={t("newPassword")} error={errors.password && tv(errors.password.message as "required")}>
          {(p) => (
            <>
              <PasswordInput {...p} autoComplete="new-password" {...form.register("password")} />
              <PasswordRules value={password} />
            </>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={reset.isPending} data-testid="save-password">
          {t("savePassword")}
        </Button>
      </form>
      <ResendCode
        send={async () => {
          const sent = await api.auth.requestPasswordReset(email);
          rememberDevCode("recovery", email, sent.dev);
          return sent;
        }}
        startCooldown={justSent ? RESEND_COOLDOWN_SEC : 0}
      />
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-semibold text-foreground transition-opacity hover:opacity-75">
          {t("differentEmail")}
        </Link>
      </p>
    </div>
  );
}

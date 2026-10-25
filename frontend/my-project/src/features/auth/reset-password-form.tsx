"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { api, isApiError } from "@/lib/api/client";
import { sessionKey } from "@/features/session/workspace-context";
import { useAuthErrorText } from "./auth-error";
import { FormAlert } from "./form-alert";
import { PasswordInput, PasswordRules } from "./password-input";
import { resetSchema, type ResetValues } from "./schema";

// Opened from the reset email. The link works once; afterwards every session is signed out.
export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const queryClient = useQueryClient();
  const errorText = useAuthErrorText();
  const token = useSearchParams().get("token") ?? "";

  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: "" }, mode: "onBlur" });
  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  const reset = useMutation({
    mutationFn: (values: ResetValues) => api.auth.resetPassword({ token, password: values.password }),
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

  if (!token || reason === "expired") {
    return (
      <div className="space-y-5">
        <FormAlert>{t("resetExpired")}</FormAlert>
        <Link href="/forgot-password" className={buttonVariants({ size: "lg", className: "w-full" })}>
          {t("sendResetLink")}
        </Link>
      </div>
    );
  }

  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        if (!reset.isPending) reset.mutate(values);
      })}
    >
      {reset.isError ? (
        <FormAlert>
          {reason === "same_password" ? t("samePassword") : reason === "weak_password" ? t("weakPassword") : errorText(reset.error, t("genericFailed"))}
        </FormAlert>
      ) : null}
      <Field label={t("newPassword")} error={errors.password && tv(errors.password.message as "required")}>
        {(p) => (
          <>
            <PasswordInput {...p} autoComplete="new-password" {...form.register("password")} />
            <PasswordRules value={password} />
          </>
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
        {t("savePassword")}
      </Button>
    </form>
  );
}

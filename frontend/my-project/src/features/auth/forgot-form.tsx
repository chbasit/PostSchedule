"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { useAuthErrorText } from "./auth-error";
import { FormAlert } from "./form-alert";
import { forgotSchema } from "./schema";

export function ForgotForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const form = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const errorText = useAuthErrorText();
  const reset = useMutation({ mutationFn: (email: string) => api.auth.requestPasswordReset(email) });
  const { errors } = form.formState;

  // Neutral message whether or not the email exists (FRONTEND.md F16).
  if (reset.isSuccess) {
    return (
      <div className="space-y-5 text-center">
        <FormAlert tone="info">{t("resetSent")}</FormAlert>
        <Link href="/login" className="text-sm font-semibold text-foreground transition-opacity hover:opacity-75">
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(({ email }) => {
        if (!reset.isPending) reset.mutate(email);
      })}
    >
      {reset.isError ? <FormAlert>{errorText(reset.error, t("genericFailed"))}</FormAlert> : null}
      <Field label={t("email")} error={errors.email && tv(errors.email.message as "required")}>
        {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...form.register("email")} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
        {t("sendResetLink")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-foreground transition-opacity hover:opacity-75">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { useAuthErrorText } from "./auth-error";
import { rememberDevCode } from "./dev-code";
import { FormAlert } from "./form-alert";
import { forgotSchema } from "./schema";

// Sends a reset code, then moves on to the page that takes it. The next page reads the same
// whether or not the address has an account (FRONTEND.md F16).
export function ForgotForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const router = useRouter();
  const form = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const errorText = useAuthErrorText();
  const reset = useMutation({
    mutationFn: (email: string) => api.auth.requestPasswordReset(email),
    onSuccess: (sent, email) => {
      rememberDevCode("recovery", email, sent.dev);
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}&sent=1`);
    },
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(({ email }) => {
        if (!reset.isPending && !reset.isSuccess) reset.mutate(email);
      })}
    >
      {reset.isError ? <FormAlert>{errorText(reset.error, t("genericFailed"))}</FormAlert> : null}
      <Field label={t("email")} error={errors.email && tv(errors.email.message as "required")}>
        {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...form.register("email")} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={reset.isPending || reset.isSuccess} data-testid="send-reset-code">
        {t("sendCode")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-foreground transition-opacity hover:opacity-75">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}

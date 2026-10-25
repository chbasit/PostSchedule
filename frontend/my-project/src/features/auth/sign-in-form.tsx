"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter as useNextRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { api, isApiError, usingMockApi, type Session } from "@/lib/api/client";
import { DEMO_EMAIL } from "@/lib/api/mock";
import { safeNextPath } from "@/lib/utils";
import { sessionKey } from "@/features/session/workspace-context";
import { useAuthErrorText } from "./auth-error";
import { FormAlert } from "./form-alert";
import { GoogleSignIn } from "./google-button";
import { PasswordInput } from "./password-input";
import { signInSchema, type SignInValues } from "./schema";

export function SignInForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const router = useRouter();
  const nextRouter = useNextRouter();
  const queryClient = useQueryClient();
  const errorText = useAuthErrorText();
  // Set by the Google sign-in routes when they send the person back here.
  const returned = useSearchParams().get("error");

  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });

  const signIn = useMutation({
    mutationFn: (values: SignInValues) => api.auth.signIn(values),
    onSuccess: (session: Session) => {
      queryClient.setQueryData(sessionKey, session);
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      if (next) nextRouter.replace(next);
      else router.replace(session.user.onboardedAt ? "/dashboard" : "/onboarding/start");
    },
  });

  const { errors } = form.formState;
  const unconfirmed = isApiError(signIn.error) && signIn.error.details.reason === "email_not_confirmed";

  return (
    <div className="space-y-5">
      {returned && !signIn.isError ? (
        <FormAlert tone={returned === "google_unavailable" ? "info" : "danger"}>
          {returned === "google_unavailable" ? t("googleOff") : t("googleFailed")}
        </FormAlert>
      ) : null}
      <GoogleSignIn />
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          if (!signIn.isPending) signIn.mutate(values);
        })}
      >
        {unconfirmed ? (
          <FormAlert tone="info">
            {t.rich("emailNotConfirmed", {
              link: (chunks) => (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(form.getValues("email"))}`}
                  className="font-semibold text-foreground transition-opacity hover:opacity-75"
                >
                  {chunks}
                </Link>
              ),
            })}
          </FormAlert>
        ) : signIn.isError ? (
          <FormAlert>{errorText(signIn.error, isApiError(signIn.error) && signIn.error.code === "unauthenticated" ? t("signInFailed") : t("genericFailed"))}</FormAlert>
        ) : null}
        {usingMockApi ? <FormAlert tone="info">{t("demoHint", { email: DEMO_EMAIL })}</FormAlert> : null}
        <Field label={t("email")} error={errors.email && tv(errors.email.message as "required")}>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...form.register("email")} />}
        </Field>
        <Field
          label={t("password")}
          error={errors.password && tv(errors.password.message as "required")}
          labelAside={
            <Link href="/forgot-password" className="text-sm font-semibold text-foreground transition-opacity hover:opacity-75">
              {t("forgot")}
            </Link>
          }
        >
          {(p) => <PasswordInput {...p} autoComplete="current-password" {...form.register("password")} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={signIn.isPending} data-testid="sign-in">
          {t("signIn")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t.rich("noAccount", {
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

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { api, isApiError } from "@/lib/api/client";
import { sessionKey } from "@/features/session/workspace-context";
import { useAuthErrorText } from "./auth-error";
import { FormAlert } from "./form-alert";
import { GoogleSignIn } from "./google-button";
import { PasswordInput, PasswordRules } from "./password-input";
import { signUpSchema, type SignUpValues } from "./schema";

export function SignUpForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorText = useAuthErrorText();

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "" },
    mode: "onBlur",
  });
  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  const signUp = useMutation({
    mutationFn: (values: SignUpValues) => api.auth.signUp(values),
    onSuccess: (session, values) => {
      // With email confirmation on there is no session yet, only the address to confirm.
      if (session.workspaces.length) queryClient.setQueryData(sessionKey, session);
      if (session.user.emailVerified) router.replace("/onboarding/start");
      else router.replace(`/verify-email?email=${encodeURIComponent(values.email.trim())}`);
    },
  });

  const { errors } = form.formState;
  const code = isApiError(signUp.error) ? signUp.error.code : null;
  const reason = isApiError(signUp.error) ? signUp.error.details.reason : undefined;

  return (
    <div className="space-y-5">
      <GoogleSignIn />
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          if (!signUp.isPending) signUp.mutate(values);
        })}
      >
        {signUp.isError ? (
          <FormAlert tone={code === "conflict" ? "info" : "danger"}>
            {code === "conflict"
              ? t("emailMaybeUsed")
              : reason === "weak_password"
                ? t("weakPassword")
                : reason === "email_not_allowed"
                  ? t("emailNotAllowed")
                  : errorText(signUp.error, t("signUpFailed"))}
          </FormAlert>
        ) : null}
        <Field label={t("name")} error={errors.displayName && tv(errors.displayName.message as "required")}>
          {(p) => <Input {...p} autoComplete="name" {...form.register("displayName")} />}
        </Field>
        <Field label={t("workEmail")} error={errors.email && tv(errors.email.message as "required")}>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...form.register("email")} />}
        </Field>
        <Field label={t("password")} error={errors.password && tv(errors.password.message as "required")}>
          {(p) => (
            <>
              <PasswordInput {...p} autoComplete="new-password" {...form.register("password")} />
              <PasswordRules value={password} />
            </>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={signUp.isPending} data-testid="sign-up">
          {t("createAccount")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t("terms")}</p>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t.rich("haveAccount", {
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

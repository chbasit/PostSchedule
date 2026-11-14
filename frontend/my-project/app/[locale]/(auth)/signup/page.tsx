import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { SignUpForm } from "@/features/auth/sign-up-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signUpTitle") };
}

export default function SignupPage() {
  const t = useTranslations("auth");
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("signUpTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("signUpSub", { days: TRIAL_DAYS })}</p>
      </div>
      <SignUpForm />
    </div>
  );
}

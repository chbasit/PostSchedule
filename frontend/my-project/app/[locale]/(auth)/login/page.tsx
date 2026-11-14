import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/features/auth/sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInTitle") };
}

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("signInTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("signInSub")}</p>
      </div>
      <SignInForm />
    </div>
  );
}

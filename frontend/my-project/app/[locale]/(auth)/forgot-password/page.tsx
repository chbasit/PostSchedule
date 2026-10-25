import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ForgotForm } from "@/features/auth/forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("forgotTitle") };
}

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("forgotTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("forgotSub")}</p>
      </div>
      <ForgotForm />
    </div>
  );
}

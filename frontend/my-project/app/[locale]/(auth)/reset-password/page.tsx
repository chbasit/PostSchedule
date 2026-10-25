import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle") };
}

// The password-reset email links here with ?token=.
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("resetTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("resetSub")}</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}

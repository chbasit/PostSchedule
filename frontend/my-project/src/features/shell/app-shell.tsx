"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Banner } from "@/components/banner";
import { Link } from "@/i18n/navigation";
import { useAccounts } from "@/features/session/queries";
import { useWorkspace, useWorkspaceState } from "@/features/session/workspace-context";

// Workspace-wide warnings: accounts that need reconnecting pause their queue (FRONTEND.md F3, F10).
function ConnectionBanner() {
  const t = useTranslations("shell");
  const { data } = useAccounts();
  const broken = data?.filter((a) => a.status === "needs_reconnect") ?? [];
  if (broken.length === 0) return null;
  return (
    <Banner
      tone="warning"
      className="rounded-none border-x-0 border-t-0"
      action={
        <Link href="/dashboard/settings/accounts" className="shrink-0 rounded-md px-2.5 py-1 font-semibold transition-colors hover:bg-current/10">
          {t("reconnect")}
        </Link>
      }
    >
      {t("needsReconnect", { count: broken.length, name: broken[0].displayName })}
    </Banner>
  );
}

function TrialBanner() {
  const t = useTranslations("shell");
  const { workspace } = useWorkspace();
  const [now] = useState(() => Date.now());
  const { trialEndsAt, status } = workspace.subscription;
  if (status !== "trialing" || !trialEndsAt) return null;
  const days = Math.max(0, Math.ceil((Date.parse(trialEndsAt) - now) / 86_400_000));
  return (
    <Banner
      tone="info"
      className="rounded-none border-x-0 border-t-0"
      dismissKey={`trial-${workspace.id}-${days <= 3 ? "late" : "early"}`}
      action={
        <Link href="/dashboard/settings/billing" className="shrink-0 rounded-md px-2.5 py-1 font-semibold transition-colors hover:bg-current/10">
          {t("choosePlan")}
        </Link>
      }
    >
      {t("trialEnds", { count: days })}
    </Banner>
  );
}

export function ShellBanners() {
  const state = useWorkspaceState();
  if (state.status !== "ready") return null;
  return (
    <>
      <ConnectionBanner />
      <TrialBanner key={state.workspace.id} />
    </>
  );
}

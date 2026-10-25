"use client";

import { Building2, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { usingMockApi } from "@/lib/api/client";
import { resetMockData } from "@/lib/api/mock";
import { useAccounts, useMembers } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { SettingRow, SettingsSection } from "./settings-ui";

// A value with a way to change it somewhere else.
function LinkValue({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:justify-end">
      {children}
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}

export function WorkspaceSettings() {
  const t = useTranslations("settings.workspace");
  const tn = useTranslations("nav.settings");
  const tp = useTranslations("plans.names");
  const tr = useTranslations("teams.roles");
  const { workspace } = useWorkspace();
  const accounts = useAccounts();
  const members = useMembers();
  const dash = "…";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={Building2} tint="green" title={tn("workspace")} description={t("body")} />

      <SettingsSection title={t("detailsTitle")}>
        <SettingRow id="ws-name" title={t("name")} description={t("nameHint")}>
          <p className="truncate px-3 py-2 text-sm font-medium sm:text-end">{workspace.name}</p>
        </SettingRow>
        <SettingRow id="ws-kind" title={t("kind")}>
          <p className="px-3 py-2 text-sm font-medium sm:text-end">{t(`kinds.${workspace.kind}`)}</p>
        </SettingRow>
        <SettingRow id="ws-role" title={t("role")} description={tr(`${workspace.role}.body`)}>
          <p className="px-3 py-2 text-sm font-medium sm:text-end">{tr(`${workspace.role}.name`)}</p>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t("usageTitle")}>
        <SettingRow id="ws-plan" title={t("plan")}>
          <LinkValue href="/dashboard/settings/billing">{tp(workspace.planKey)}</LinkValue>
        </SettingRow>
        <SettingRow id="ws-members" title={t("members")}>
          <LinkValue href="/dashboard/settings/team">
            {members.isSuccess ? t("ofLimit", { used: members.data.length, limit: workspace.memberLimit }) : dash}
          </LinkValue>
        </SettingRow>
        <SettingRow id="ws-accounts" title={t("accounts")}>
          <LinkValue href="/dashboard/settings/accounts">
            {accounts.isSuccess ? t("ofLimit", { used: accounts.data.length, limit: workspace.accountLimit }) : dash}
          </LinkValue>
        </SettingRow>
      </SettingsSection>

      {usingMockApi ? (
        <SettingsSection title={t("previewTitle")} className="border-dashed">
          <SettingRow id="ws-preview" title={t("previewRow")} description={t("previewBody")}>
            <ResetPreview />
          </SettingRow>
        </SettingsSection>
      ) : null}
    </div>
  );
}

// Wipes this browser's sample data, so it asks first.
function ResetPreview() {
  const t = useTranslations("settings.workspace");
  const tc = useTranslations("common");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full">
          {t("previewReset")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("previewConfirmTitle")} description={t("previewConfirmBody")} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tc("cancel")}</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={async () => {
              await resetMockData();
              window.location.reload();
            }}
          >
            {t("previewReset")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

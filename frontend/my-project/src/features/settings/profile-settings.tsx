"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { FormAlert } from "@/features/auth/form-alert";
import { sessionKey, useWorkspace } from "@/features/session/workspace-context";

export function ProfileSettings() {
  const t = useTranslations("settings");
  const tn = useTranslations("nav.settings");
  const { user } = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.displayName);
  const trimmed = name.trim();
  const nameError = !trimmed ? t("nameRequired") : undefined;
  const changed = trimmed !== user.displayName;

  const save = useMutation({
    mutationFn: () => api.me.update({ displayName: trimmed }),
    onSuccess: () => {
      toast.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: sessionKey });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={UserRound} tint="blue" title={tn("profile")} description={t("profileBody")} />

      <form
        noValidate
        className="space-y-5 rounded-xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameError && changed && !save.isPending) save.mutate();
        }}
      >
        <div className="flex items-center gap-3">
          <Avatar id={user.id} name={trimmed || user.displayName} className="size-12 text-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{trimmed || user.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")} error={nameError}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />}
          </Field>
          <Field label={t("email")} hint={t("emailHint")}>
            {(p) => <Input {...p} value={user.email} readOnly dir="ltr" />}
          </Field>
        </div>
        {save.isError ? <FormAlert>{t("saveFailed")}</FormAlert> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={!changed || !!nameError} loading={save.isPending}>
            {t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

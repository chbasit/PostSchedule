"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Building, CircleCheck, Rocket, Sparkles, User as UserIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type Persona } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/providers/catalog";
import { ConnectDialog } from "@/features/connections/connect-dialog";
import { useAccounts } from "@/features/session/queries";
import { sessionKey, useWorkspace } from "@/features/session/workspace-context";

const PERSONAS: Array<{ key: Persona; icon: LucideIcon }> = [
  { key: "creator", icon: UserIcon },
  { key: "startup", icon: Rocket },
  { key: "agency", icon: Briefcase },
  { key: "other", icon: Building },
];

export function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const t = useTranslations("onboarding");
  const steps = [t("steps.about"), t("steps.connect"), t("steps.done")];
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={t("progress", { step, total: 3 })}>
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i + 1 === step ? "step" : undefined}>
          <span
            className={cn(
              "tabular inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
              i + 1 < step && "bg-success-bg text-success",
              i + 1 === step && "bg-primary text-primary-foreground",
              i + 1 > step && "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <span className={cn("hidden sm:inline", i + 1 === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
          {i < steps.length - 1 ? <span aria-hidden className="mx-1 h-px w-6 bg-border" /> : null}
        </li>
      ))}
    </ol>
  );
}

export function PersonaStep() {
  const t = useTranslations("onboarding");
  const { user } = useWorkspace();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [persona, setPersona] = useState<Persona | null>(user.persona);

  const save = useMutation({
    mutationFn: (value: Persona) => api.me.update({ persona: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKey });
      router.push("/onboarding/connect");
    },
  });

  return (
    <div className="space-y-8">
      <Stepper step={1} />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("personaTitle", { name: user.displayName.split(" ")[0] })}</h1>
        <p className="text-muted-foreground">{t("personaSub")}</p>
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">{t("personaTitle", { name: user.displayName.split(" ")[0] })}</legend>
        {PERSONAS.map(({ key, icon: Icon }) => (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              persona === key ? "border-foreground bg-muted" : "hover:bg-muted/60",
            )}
          >
            <input type="radio" name="persona" value={key} checked={persona === key} onChange={() => setPersona(key)} className="sr-only" />
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span className="space-y-0.5">
              <span className="block font-medium">{t(`personas.${key}.title`)}</span>
              <span className="block text-sm text-muted-foreground">{t(`personas.${key}.body`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {save.isError ? <p role="alert" className="text-sm text-danger">{t("saveFailed")}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Link href="/onboarding/connect" className={buttonVariants({ variant: "ghost" })}>
          {t("skip")}
        </Link>
        <Button size="lg" disabled={!persona} loading={save.isPending} onClick={() => persona && !save.isPending && save.mutate(persona)}>
          {t("continue")}
        </Button>
      </div>
    </div>
  );
}

export function ConnectStep() {
  const t = useTranslations("onboarding");
  const accounts = useAccounts();
  const connected = new Set(accounts.data?.map((a) => a.provider));

  return (
    <div className="space-y-8">
      <Stepper step={2} />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("connectTitle")}</h1>
        <p className="text-muted-foreground">{t("connectSub")}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PLATFORMS.map((p) => (
          <li key={p.id} className="flex flex-col items-center gap-3 rounded-lg border p-5 text-center">
            <PlatformMark id={p.id} size="lg" />
            <span className="font-medium">{p.name}</span>
            {connected.has(p.id) ? (
              <span className="inline-flex h-8 items-center gap-1.5 text-sm text-success">
                <CircleCheck className="size-4" aria-hidden /> {t("connected")}
              </span>
            ) : (
              <ConnectDialog
                initial={p.id}
                trigger={
                  <Button size="sm" variant="secondary" aria-label={t("connectPlatform", { platform: p.name })}>
                    {t("connect")}
                  </Button>
                }
              />
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Link href="/onboarding/done" className={buttonVariants({ variant: "ghost" })}>
          {t("skip")}
        </Link>
        <Link href="/onboarding/done" className={buttonVariants({ size: "lg" })}>
          {t("continue")}
        </Link>
      </div>
    </div>
  );
}

export function DoneStep() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const queryClient = useQueryClient();
  const finish = useMutation({
    mutationFn: () => api.me.update({ onboardedAt: new Date().toISOString() }),
    onSuccess: (user) => {
      queryClient.setQueryData(sessionKey, (old: { user: unknown } | null | undefined) => (old ? { ...old, user } : old));
      router.replace("/dashboard");
    },
  });

  return (
    <div className="space-y-8">
      <Stepper step={3} />
      <span className="inline-flex size-14 animate-pop items-center justify-center rounded-full bg-mint text-ink">
        <Sparkles className="size-7" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("doneTitle")}</h1>
        <p className="text-muted-foreground">{t("doneSub")}</p>
      </div>
      <Button size="lg" loading={finish.isPending} onClick={() => !finish.isPending && finish.mutate()}>
        {t("goToDashboard")}
      </Button>
      {finish.isError ? <p role="alert" className="text-sm text-danger">{t("saveFailed")}</p> : null}
    </div>
  );
}

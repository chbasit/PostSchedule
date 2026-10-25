"use client";

import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { FormAlert } from "@/features/auth/form-alert";
import { getPlatform, PLATFORMS, type PlatformId } from "@/providers/catalog";
import { useConnectAccount } from "./use-connect";

// Step 1 explains, in plain words, what we can and cannot do; step 2 is the platform's
// own consent screen (FRONTEND.md F3).
export function ConnectDialog({ trigger, initial }: { trigger?: ReactNode; initial?: PlatformId }) {
  const t = useTranslations("connections");
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<PlatformId | null>(initial ?? null);
  const { connect, isPlanLimit } = useConnectAccount(() => setOpen(false));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setPlatform(initial ?? null);
          connect.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus aria-hidden /> {t("connect")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {platform === null ? (
          <>
            <DialogHeader title={t("chooseTitle")} description={t("chooseBody")} />
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLATFORMS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className="flex w-full flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <PlatformMark id={p.id} size="lg" />
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <DialogHeader
              title={t("scopesTitle", { platform: getPlatform(platform).name })}
              description={t("scopesBody", { platform: getPlatform(platform).name })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("weCan")}</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {(["publish", "profile", "metrics"] as const).map((k) => (
                    <li key={k} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      {t(`can.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("weCannot")}</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {(["password", "messages", "postAlone"] as const).map((k) => (
                    <li key={k} className="flex gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                      {t(`cannot.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {connect.isError ? (
              <div className="mt-4">
                {isPlanLimit(connect.error) ? (
                  <FormAlert>
                    {t("limitReached")}{" "}
                    <Link href="/dashboard/settings/billing" className="font-semibold transition-opacity hover:opacity-75">
                      {t("upgrade")}
                    </Link>
                  </FormAlert>
                ) : (
                  <FormAlert>{t("connectFailed")}</FormAlert>
                )}
              </div>
            ) : null}
            <DialogFooter>
              {initial ? null : (
                <Button variant="ghost" onClick={() => setPlatform(null)}>
                  <ArrowLeft className="rtl:-scale-x-100" aria-hidden /> {t("otherPlatform")}
                </Button>
              )}
              <Button loading={connect.isPending} onClick={() => !connect.isPending && connect.mutate(platform)} data-testid="connect-continue">
                {t("continueTo", { platform: getPlatform(platform).name })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { queryOptions, useQueries, useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/misc";
import { Select, SelectItem } from "@/components/ui/select";
import { api, isApiError, type CreatorAudience, type CreatorInfo, type SocialAccount, type TargetOptions } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { useWorkspace } from "@/features/session/workspace-context";

// TikTok's posting settings, as its Content Sharing Guidelines require (founder's call,
// 2026-11-13; read 2026-11-13 at developers.tiktok.com/doc/content-sharing-guidelines):
// - the creator's nickname, read fresh from TikTok when the screen opens;
// - who can view, from the creator's own options, with nothing chosen for the person;
// - comment, Duet and Stitch off until turned on, and greyed out where the creator turned
//   them off in TikTok;
// - a commercial content disclosure, off by default, with "Your brand" and "Branded content";
//   branded content cannot be "Only me";
// - the video's length checked against the creator's limit.
// The consent sentence sits by the post button (CreatorConsent).

const AUDIENCES: CreatorAudience[] = ["PUBLIC_TO_EVERYONE", "FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"];

function creatorOptions(ws: string, scope: readonly unknown[], accountId: string) {
  return queryOptions({
    queryKey: [...scope, "creator", accountId],
    queryFn: () => api.accounts.creatorInfo(ws, accountId),
    // "Retrieve the latest creator info when rendering the Post page."
    staleTime: 30_000,
    retry: false,
  });
}

// Problems with the creator-controlled accounts that must stop the post (composer problems).
export function useCreatorProblems(accounts: SocialAccount[], options: Record<string, TargetOptions | undefined>, videoSeconds: number | null): string[] {
  const t = useTranslations("composer.creator");
  const { workspace, scope } = useWorkspace();
  const controlled = accounts.filter((a) => getPlatform(a.provider).publishOptions?.creatorControls);
  const infos = useQueries({ queries: controlled.map((a) => creatorOptions(workspace.id, scope, a.id)) });
  const problems: string[] = [];
  controlled.forEach((a, i) => {
    const platform = getPlatform(a.provider).name;
    const info = infos[i];
    const o = options[a.id];
    if (info.isError) problems.push(t("problems.unavailable", { platform }));
    if (info.data && videoSeconds !== null && videoSeconds > info.data.maxVideoSeconds) problems.push(t("problems.tooLong", { platform, max: info.data.maxVideoSeconds }));
    if (!o?.audience) problems.push(t("problems.audience", { platform }));
    if (o?.disclose && !o.ownBrand && !o.paidPartnership) problems.push(t("problems.disclosure"));
  });
  return problems;
}

type Props = { account: SocialAccount; value: TargetOptions | undefined; onChange: (next: TargetOptions) => void; videoSeconds: number | null };

export function CreatorControls({ account, value, onChange, videoSeconds }: Props) {
  const t = useTranslations("composer.creator");
  const { workspace, scope } = useWorkspace();
  const id = useId();
  const info = useQuery(creatorOptions(workspace.id, scope, account.id));
  const o = value ?? {};
  const set = (patch: TargetOptions) => onChange({ ...o, ...patch });
  const branded = !!(o.disclose && o.paidPartnership);

  if (info.isPending) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (info.isError) {
    const reason = isApiError(info.error) ? info.error.details.reason : undefined;
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-bg px-3 py-2.5 text-sm text-warning">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          {reason === "reconnect" ? t("reconnect") : reason === "cannot_post" && isApiError(info.error) ? info.error.message : t("unavailable")}
        </span>
        <Button size="sm" variant="secondary" onClick={() => info.refetch()}>
          <RotateCw aria-hidden /> {t("retry")}
        </Button>
      </div>
    );
  }
  const c: CreatorInfo = info.data;
  const tooLong = videoSeconds !== null && videoSeconds > c.maxVideoSeconds;

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2.5 text-sm">
        {c.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- TikTok's own short-lived avatar link
          <img src={c.avatarUrl} alt="" className="size-8 rounded-full bg-muted object-cover" />
        ) : null}
        <span>
          {t.rich("postingAs", { name: c.nickname, b: (chunks) => <span className="font-semibold">{chunks}</span> })}{" "}
          <span className="text-muted-foreground">@{c.username}</span>
        </span>
      </p>

      {tooLong ? (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {t("tooLong", { max: c.maxVideoSeconds })}
        </p>
      ) : null}

      <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:items-center sm:gap-4">
        <div>
          <p id={`${id}-audience`} className="text-sm font-medium">
            {t("audience")}
          </p>
          <p className="text-xs text-muted-foreground">{branded ? t("brandedNotPrivate") : t("audienceHint")}</p>
        </div>
        {/* No default: TikTok requires the person to choose (guidelines, "Metadata"). */}
        <Select
          value={o.audience ?? ""}
          onValueChange={(v) => set({ audience: v as CreatorAudience })}
          placeholder={t("audiencePlaceholder")}
          aria-labelledby={`${id}-audience`}
          aria-invalid={!o.audience || undefined}
          className="w-full"
        >
          {AUDIENCES.filter((a) => c.privacyOptions.includes(a)).map((a) => (
            <SelectItem key={a} value={a} disabled={a === "SELF_ONLY" && branded}>
              {t(`audiences.${a}`)}
            </SelectItem>
          ))}
        </Select>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">{t("allow")}</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              ["allowComments", "comment", c.commentDisabled],
              ["allowDuet", "duet", c.duetDisabled],
              ["allowStitch", "stitch", c.stitchDisabled],
            ] as const
          ).map(([key, label, off]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox id={`${id}-${key}`} checked={!off && !!o[key]} disabled={off} onCheckedChange={(v) => set({ [key]: v === true })} />
              <label htmlFor={`${id}-${key}`} className={cn("text-sm", off ? "text-muted-foreground" : "cursor-pointer")}>
                {t(`interactions.${label}`)}
              </label>
            </div>
          ))}
        </div>
        {c.commentDisabled || c.duetDisabled || c.stitchDisabled ? <p className="mt-1.5 text-xs text-muted-foreground">{t("offInTiktok")}</p> : null}
      </fieldset>

      <div className="space-y-3 rounded-xl border p-3.5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor={`${id}-disclose`} className="cursor-pointer text-sm font-medium">
              {t("disclose")}
            </label>
            <p className="text-xs text-muted-foreground">{t("discloseHint")}</p>
          </div>
          <Switch
            id={`${id}-disclose`}
            checked={!!o.disclose}
            onCheckedChange={(on) => set(on ? { disclose: true } : { disclose: false, ownBrand: false, paidPartnership: false })}
          />
        </div>
        {o.disclose ? (
          <div className="space-y-3 border-t pt-3">
            {(
              [
                ["ownBrand", "yourBrand"],
                ["paidPartnership", "brandedContent"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-start gap-2">
                <Checkbox
                  id={`${id}-${key}`}
                  checked={!!o[key]}
                  onCheckedChange={(v) => {
                    const next: TargetOptions = { [key]: v === true };
                    // Branded content cannot be "Only me": the choice is cleared so the person
                    // picks a public audience themselves (one of the two ways TikTok allows).
                    if (key === "paidPartnership" && v === true && o.audience === "SELF_ONLY") next.audience = undefined;
                    set(next);
                  }}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor={`${id}-${key}`} className="cursor-pointer text-sm font-medium">
                    {t(`${label}.label`)}
                  </label>
                  <p className="text-xs text-muted-foreground">{t(`${label}.hint`)}</p>
                </div>
              </div>
            ))}
            <p className={cn("text-sm", o.ownBrand || o.paidPartnership ? "text-foreground" : "text-warning")}>
              {o.paidPartnership ? t("labelPaid") : o.ownBrand ? t("labelPromotional") : t("chooseOne")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// The consent TikTok requires right before the post button, worded as its guidelines give it.
export function CreatorConsent({ accounts, options }: { accounts: SocialAccount[]; options: Record<string, TargetOptions | undefined> }) {
  const t = useTranslations("composer.creator");
  const controlled = accounts.filter((a) => getPlatform(a.provider).publishOptions?.creatorControls);
  if (controlled.length === 0) return null;
  const branded = controlled.some((a) => options[a.id]?.disclose && options[a.id]?.paidPartnership);
  const linkClass = "font-medium text-foreground underline underline-offset-2";
  const music = (chunks: ReactNode) => (
    <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer" className={linkClass}>
      {chunks}
    </a>
  );
  const bc = (chunks: ReactNode) => (
    <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener noreferrer" className={linkClass}>
      {chunks}
    </a>
  );
  return <p className="text-xs text-muted-foreground">{branded ? t.rich("consentBranded", { music, bc }) : t.rich("consent", { music })}</p>;
}

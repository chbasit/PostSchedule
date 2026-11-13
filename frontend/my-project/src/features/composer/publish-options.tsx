"use client";

import { Globe, Link2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { Checkbox } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import type { SocialAccount, TargetOptions } from "@/lib/api/client";
import { captionLength } from "@/lib/preflight/rules";
import { cn } from "@/lib/utils";
import { getPlatform, type Privacy } from "@/providers/catalog";
import { CreatorControls } from "./creator-controls";

const PRIVACY_ICON = { public: Globe, unlisted: Link2, private: Lock } as const;

// The first non-empty line of the caption, cut to the title limit.
export function titleFromCaption(caption: string, limit: number) {
  const line = caption.split("\n").find((l) => l.trim())?.trim() ?? "";
  const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(line), (s) => s.segment);
  return graphemes.length > limit ? graphemes.slice(0, limit).join("").trimEnd() : line;
}

// What will actually be sent: the user's choices over the platform's defaults, with the
// title falling back to the caption.
export function effectiveOptions(account: SocialAccount, chosen: TargetOptions | undefined, caption: string): TargetOptions | null {
  const spec = getPlatform(account.provider).publishOptions;
  if (!spec) return null;
  const out: TargetOptions = {};
  if (spec.title) out.title = chosen?.title?.trim() || titleFromCaption(caption, spec.title.limit);
  if (spec.privacy) out.privacy = chosen?.privacy ?? spec.privacy[0];
  if (spec.madeForKids) out.madeForKids = chosen?.madeForKids ?? false;
  if (spec.notifySubscribers) out.notifySubscribers = chosen?.notifySubscribers ?? true;
  if (spec.embeddable) out.embeddable = chosen?.embeddable ?? true;
  if (spec.creatorControls) {
    // Nothing is chosen for the person: no audience, interactions and disclosure off.
    if (chosen?.audience) out.audience = chosen.audience;
    out.allowComments = !!chosen?.allowComments;
    out.allowDuet = !!chosen?.allowDuet;
    out.allowStitch = !!chosen?.allowStitch;
    out.disclose = !!chosen?.disclose;
    out.ownBrand = !!(chosen?.disclose && chosen.ownBrand);
    out.paidPartnership = !!(chosen?.disclose && chosen.paidPartnership);
  }
  return out;
}

type Props = {
  account: SocialAccount;
  value: TargetOptions | undefined;
  caption: string;
  onChange: (next: TargetOptions) => void;
  // The video's length, for platforms that check it against the creator's own limit.
  videoSeconds?: number | null;
};

// Settings this platform asks for, e.g. YouTube's title, visibility and audience, or TikTok's
// creator controls.
export function PublishOptions({ account, value, caption, onChange, videoSeconds = null }: Props) {
  const t = useTranslations("composer.options");
  const tp = useTranslations("composer.privacy");
  const id = useId();
  const platform = getPlatform(account.provider);
  const spec = platform.publishOptions;
  if (!spec) return null;
  const current = effectiveOptions(account, value, caption)!;
  const set = (patch: TargetOptions) => onChange({ ...value, ...patch });
  const titleLength = captionLength(value?.title ?? "");
  const tooLong = spec.title ? titleLength > spec.title.limit : false;

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-4 border-t px-4 py-4 sm:px-5">
      <h3 id={`${id}-title`} className="flex min-w-0 items-center gap-2 text-sm font-semibold">
        <PlatformMark id={platform.id} size="sm" className="rounded-full" />
        {t("title", { platform: platform.name })}
        <span className="truncate font-normal text-muted-foreground" dir="ltr">
          {account.handle}
        </span>
      </h3>

      {spec.creatorControls ? <CreatorControls account={account} value={value} onChange={onChange} videoSeconds={videoSeconds} /> : null}

      {spec.title ? (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${id}-name`} className="text-sm font-medium">
              {t("videoTitle")}
            </label>
            <span className={cn("tabular text-xs", tooLong ? "font-medium text-danger" : "text-muted-foreground")}>
              {titleLength || captionLength(current.title ?? "")} / {spec.title.limit}
            </span>
          </div>
          <Input
            id={`${id}-name`}
            value={value?.title ?? ""}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={current.title || t("titlePlaceholder")}
            aria-invalid={tooLong || undefined}
            aria-describedby={`${id}-name-hint`}
            dir="auto"
          />
          <p id={`${id}-name-hint`} className={cn("text-xs", tooLong ? "text-danger" : "text-muted-foreground")}>
            {tooLong ? t("titleTooLong", { max: spec.title.limit }) : t("titleHint")}
          </p>
        </div>
      ) : null}

      {spec.privacy ? (
        <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:items-center sm:gap-4">
          <div>
            <p id={`${id}-privacy`} className="text-sm font-medium">
              {t("visibility")}
            </p>
            <p className="text-xs text-muted-foreground">{tp(`${current.privacy!}Hint`)}</p>
          </div>
          <Select value={current.privacy!} onValueChange={(v) => set({ privacy: v as Privacy })} aria-labelledby={`${id}-privacy`} className="w-full">
            {spec.privacy.map((p) => {
              const Icon = PRIVACY_ICON[p];
              return (
                <SelectItem key={p} value={p}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-4" aria-hidden /> {tp(p)}
                  </span>
                </SelectItem>
              );
            })}
          </Select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {spec.madeForKids ? (
          <Choice id={`${id}-kids`} label={t("madeForKids")} hint={t("madeForKidsHint")} checked={!!current.madeForKids} onChange={(madeForKids) => set({ madeForKids })} />
        ) : null}
        {spec.notifySubscribers ? (
          <Choice id={`${id}-notify`} label={t("notifySubscribers")} checked={!!current.notifySubscribers} onChange={(notifySubscribers) => set({ notifySubscribers })} />
        ) : null}
        {spec.embeddable ? (
          <Choice id={`${id}-embed`} label={t("embeddable")} checked={!!current.embeddable} onChange={(embeddable) => set({ embeddable })} />
        ) : null}
      </div>
    </section>
  );
}

function Choice({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-describedby={hint ? `${id}-hint` : undefined} className="mt-0.5" />
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

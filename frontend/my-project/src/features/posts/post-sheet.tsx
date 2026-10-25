"use client";

import {
  CalendarClock,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  ExternalLink,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  Trash,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { PostStatusChip } from "@/components/status-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Link } from "@/i18n/navigation";
import { isApiError, type Post, type PostTarget, type SocialAccount, type TargetStatus } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { formatDateTime, utcToZoned } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { resolveWhen } from "@/features/composer/when-panel";
import { useWorkspace } from "@/features/session/workspace-context";
import { TagList } from "@/features/tags/tag-chip";
import { usePostActions } from "./use-post-actions";

const TARGET: Record<TargetStatus, { icon: LucideIcon; className: string; spin?: boolean }> = {
  pending: { icon: Clock, className: "text-muted-foreground" },
  queued: { icon: LoaderCircle, className: "text-info", spin: true },
  publishing: { icon: LoaderCircle, className: "text-info", spin: true },
  published: { icon: CircleCheck, className: "text-success" },
  failed: { icon: CircleX, className: "text-danger" },
  skipped: { icon: CircleMinus, className: "text-muted-foreground" },
  needs_check: { icon: TriangleAlert, className: "text-warning" },
};

function TargetRow({ target, account }: { target: PostTarget; account: SocialAccount | undefined }) {
  const t = useTranslations("posts");
  const tp = useTranslations("composer.privacy");
  const { icon: Icon, className, spin } = TARGET[target.status];
  const privacy = target.options?.privacy;
  return (
    <li className="space-y-2 py-3">
      <div className="flex items-center gap-3">
        <PlatformMark id={target.provider} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{account?.displayName ?? getPlatform(target.provider).name}</p>
          <p className="flex items-center gap-1.5 text-xs">
            <Icon className={cn("size-3.5", className, spin && "animate-spin")} aria-hidden />
            <span className={className}>{t(`target.${target.status}`)}</span>
            {privacy ? <span className="text-muted-foreground">· {tp(privacy)}</span> : null}
          </p>
          {target.options?.title ? (
            <p className="truncate text-xs text-muted-foreground" dir="auto" title={target.options.title}>
              {target.options.title}
            </p>
          ) : null}
        </div>
        {target.providerUrl && target.status === "published" ? (
          <a href={target.providerUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("viewOnPlatform")} <ExternalLink className="rtl:-scale-x-100" aria-hidden />
          </a>
        ) : null}
      </div>
      {target.status === "failed" && target.errorMessage ? (
        <div className="ms-10 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <p>{target.errorMessage}</p>
          {target.errorCode === "permission_revoked" ? (
            <Link href="/dashboard/settings/accounts" className="mt-1 inline-block font-semibold text-foreground transition-opacity hover:opacity-75">
              {t("reconnectAccount")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function RescheduleDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const t = useTranslations("posts.reschedule");
  const { user } = useWorkspace();
  const { reschedule } = usePostActions();
  const zone = post.timezone ?? user.timezone;
  const [now] = useState(() => Date.now());
  const [when, setWhen] = useState(() => {
    // Suggest the current time if it is still ahead, otherwise an hour from now.
    const start = post.scheduledAt && Date.parse(post.scheduledAt) > now ? new Date(post.scheduledAt) : new Date(now + 3600_000);
    return { mode: "schedule" as const, timezone: zone, ...utcToZoned(start, zone) };
  });
  const result = resolveWhen(when, now);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader title={t("title")} description={t("body")} />
        <div className="space-y-4">
          <Field label={t("timezone")}>
            {(p) => <TimezoneSelect {...p} value={when.timezone} onChange={(timezone) => setWhen({ ...when, timezone })} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("date")} error={!result.ok ? t(`errors.${result.reason}`) : undefined}>
              {(p) => <Input {...p} type="date" value={when.date} onChange={(e) => setWhen({ ...when, date: e.target.value })} />}
            </Field>
            <Field label={t("time")}>
              {(p) => <Input {...p} type="time" value={when.time} onChange={(e) => setWhen({ ...when, time: e.target.value })} />}
            </Field>
          </div>
          {reschedule.isError ? (
            <p role="alert" className="text-sm text-danger">
              {isApiError(reschedule.error) && reschedule.error.code === "conflict" ? t("conflict") : t("failed")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("cancel")}</Button>
          </DialogClose>
          <Button
            disabled={!result.ok}
            loading={reschedule.isPending}
            onClick={() => {
              if (result.ok && result.scheduledAt && !reschedule.isPending) {
                reschedule.mutate({ post, scheduledAt: result.scheduledAt }, { onSuccess: onClose });
              }
            }}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ post, onClose, onDeleted }: { post: Post; onClose: () => void; onDeleted: () => void }) {
  const t = useTranslations("posts.delete");
  const { remove } = usePostActions();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader title={t("title")} description={post.status === "scheduled" ? t("bodyScheduled") : t("body")} />
        {remove.isError ? <p role="alert" className="text-sm text-danger">{t("failed")}</p> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("cancel")}</Button>
          </DialogClose>
          <Button variant="destructive" loading={remove.isPending} onClick={() => !remove.isPending && remove.mutate(post, { onSuccess: onDeleted })}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Side sheet with per-platform status, the reason for any failure, and the fix.
export function PostSheet({ post, accounts, onClose }: { post: Post; accounts: SocialAccount[]; onClose: () => void }) {
  const t = useTranslations("posts");
  const tt = useTranslations("tags");
  const locale = useLocale();
  const { user, workspace } = useWorkspace();
  const { retry } = usePostActions();
  const [dialog, setDialog] = useState<"reschedule" | "delete" | null>(null);
  const editable = can(workspace.role, "post.create") && ["draft", "scheduled", "pending_approval", "lapsed", "failed", "paused"].includes(post.status);
  const published = post.targets.filter((tg) => tg.status === "published").length;
  const live = post.targets.filter((tg) => tg.status !== "skipped").length;

  return (
    <>
      <Dialog open={dialog === null} onOpenChange={(o) => !o && dialog === null && onClose()}>
        <DialogContent variant="sheet">
          <DialogHeader
            title={t("detailTitle")}
            description={
              post.scheduledAt
                ? formatDateTime(post.scheduledAt, locale, user.timezone, { dateStyle: "full", timeStyle: "short" })
                : t("noTime")
            }
          />
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <PostStatusChip status={post.status} />
              <span className="text-sm text-muted-foreground">{t(`types.${post.type}`)}</span>
              {post.aiGenerated ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-tint-violet-line bg-tint-violet px-2 py-0.5 text-xs font-medium">
                  <Sparkles className="size-3 text-tint-violet-fg" aria-hidden /> {t("aiGenerated")}
                </span>
              ) : null}
            </div>

            {post.tagIds.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{tt("label")}</h3>
                <TagList tagIds={post.tagIds} max={20} />
              </div>
            ) : null}

            {post.status === "partial" ? (
              <p className="rounded-lg bg-warning-bg px-3 py-2.5 text-sm text-warning">{t("partialSummary", { published, total: live })}</p>
            ) : null}
            {post.status === "lapsed" ? (
              <p className="rounded-lg bg-warning-bg px-3 py-2.5 text-sm text-warning">{t("lapsedSummary")}</p>
            ) : null}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("caption")}</h3>
              <p className="whitespace-pre-wrap wrap-break-word text-sm" dir="auto">
                {post.mainCaption || <span className="text-muted-foreground">{t("noCaption")}</span>}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">{t("platforms")}</h3>
              <ul className="divide-y">
                {post.targets.map((tg) => (
                  <TargetRow key={tg.id} target={tg} account={accounts.find((a) => a.id === tg.socialAccountId)} />
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {post.status === "lapsed" ? (
                <Button loading={retry.isPending} onClick={() => !retry.isPending && retry.mutate(post)}>
                  <Send aria-hidden /> {t("actions.publishNow")}
                </Button>
              ) : null}
              {post.status === "failed" || post.status === "partial" ? (
                <Button loading={retry.isPending} onClick={() => !retry.isPending && retry.mutate(post)}>
                  <RefreshCw aria-hidden /> {t("actions.retry")}
                </Button>
              ) : null}
              {editable && post.status !== "draft" ? (
                <Button variant="secondary" onClick={() => setDialog("reschedule")}>
                  <CalendarClock aria-hidden /> {t("actions.reschedule")}
                </Button>
              ) : null}
              {editable ? (
                <Link href={{ pathname: "/dashboard/create", query: { edit: post.id } }} className={buttonVariants({ variant: "secondary" })}>
                  <Pencil aria-hidden /> {t("actions.edit")}
                </Link>
              ) : null}
              {can(workspace.role, "post.delete") ? (
                <Button variant="ghost" className="text-danger" onClick={() => setDialog("delete")}>
                  <Trash aria-hidden /> {post.status === "lapsed" ? t("actions.discard") : t("actions.delete")}
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {dialog === "reschedule" ? <RescheduleDialog post={post} onClose={() => setDialog(null)} /> : null}
      {dialog === "delete" ? <DeleteDialog post={post} onClose={() => setDialog(null)} onDeleted={onClose} /> : null}
    </>
  );
}

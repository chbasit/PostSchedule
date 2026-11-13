"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, ExternalLink, Heart, MessageCircle, Send, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { api, isApiError, type InsightPost, type PostComment, type SocialAccount } from "@/lib/api/client";
import { formatDateTime } from "@/lib/time";
import { useIntentKey } from "@/lib/use-intent-key";
import { cn } from "@/lib/utils";
import { getPlatform } from "@/providers/catalog";
import { useWorkspace } from "@/features/session/workspace-context";

// People's replies on one post, read and answered without leaving the dashboard (founder's
// call, 2026-11-13). Replies show as a tree; "Reply" on any of them answers that one, and the
// box answers the post itself otherwise.
const MAX = 300; // Bluesky's limit, in characters as people see them

function graphemes(text: string) {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
}

function Avatar({ comment }: { comment: PostComment }) {
  const [broken, setBroken] = useState(false);
  return comment.author.avatarUrl && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element -- the platform's own avatar link
    <img src={comment.author.avatarUrl} alt="" loading="lazy" onError={() => setBroken(true)} className="size-9 shrink-0 rounded-full bg-muted object-cover" />
  ) : (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-card-lavender text-sm font-semibold text-forest">
      {comment.author.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Comment({ comment, onReply }: { comment: PostComment; onReply: (c: PostComment) => void }) {
  const t = useTranslations("insights.replies");
  const locale = useLocale();
  const { user } = useWorkspace();
  return (
    <li>
      <div className="flex gap-3">
        <Avatar comment={comment} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
            <span className="font-semibold">{comment.author.name}</span>
            <span className="text-muted-foreground">@{comment.author.handle}</span>
            {comment.mine ? <span className="rounded-full bg-card-aqua px-2 py-0.5 text-xs font-medium text-forest">{t("you")}</span> : null}
            <span className="text-xs text-muted-foreground">
              · {formatDateTime(comment.createdAt, locale, user.timezone, { dateStyle: "medium", timeStyle: "short", hour12: !user.use24h })}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm" dir="auto">
            {comment.text}
          </p>
          <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" aria-hidden /> <span className="sr-only">{t("likes")}</span>
              {comment.likes}
            </span>
            <button type="button" onClick={() => onReply(comment)} className="inline-flex items-center gap-1 font-medium text-foreground transition-opacity hover:opacity-70">
              <CornerDownRight className="size-3.5 rtl:-scale-x-100" aria-hidden /> {t("reply")}
            </button>
          </div>
          {comment.replies.length > 0 ? (
            <ul className="mt-4 space-y-4 border-s ps-4">
              {comment.replies.map((r) => (
                <Comment key={r.ref} comment={r} onReply={onReply} />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function RepliesDialog({ account, post, onClose }: { account: SocialAccount; post: InsightPost; onClose: () => void }) {
  const t = useTranslations("insights.replies");
  const { workspace, scope, user } = useWorkspace();
  const queryClient = useQueryClient();
  const postRef = post.ref!;
  const key = [...scope, "comments", account.id, postRef];
  const comments = useQuery({ queryKey: key, queryFn: () => api.accounts.comments(workspace.id, account.id, postRef) });
  const [target, setTarget] = useState<PostComment | null>(null);
  const [text, setText] = useState("");
  const intent = useIntentKey();
  const length = graphemes(text.trim());
  const platform = getPlatform(account.provider).name;

  // One answer per press, even if pressed twice (TEST.md DBL-01).
  const send = useMutation({
    mutationFn: () => api.accounts.reply(workspace.id, account.id, { postRef, parentRef: target?.ref ?? postRef, text: text.trim() }, { idempotencyKey: intent.get() }),
    onSuccess: () => {
      intent.renew();
      setText("");
      setTarget(null);
      toast.success(t("sent", { platform }));
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const reconnect = isApiError(send.error) && send.error.details.reason === "reconnect";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <div className="border-b px-6 pt-6 pb-4">
          <DialogHeader className="mb-0" title={t("title")} description={t("subtitle", { count: comments.data?.total ?? post.metrics.comments ?? 0 })} />
          <div className="mt-3 rounded-xl bg-muted/60 p-3">
            <p className="line-clamp-3 whitespace-pre-wrap text-sm" dir="auto">
              {post.caption || t("noCaption")}
            </p>
            {post.url ? (
              <a href={post.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground transition-opacity hover:opacity-70">
                {t("openOn", { platform })} <ExternalLink className="size-3 rtl:-scale-x-100" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>

        <div className="max-h-[50vh] min-h-40 overflow-y-auto px-6 py-5">
          {comments.isPending ? (
            <div className="space-y-4" aria-busy>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : comments.isError ? (
            <ErrorState error={comments.error} onRetry={() => comments.refetch()} />
          ) : comments.data.comments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageCircle className="size-6 text-muted-foreground" aria-hidden />
              <p className="font-medium">{t("empty")}</p>
              <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
            </div>
          ) : (
            <ul className="space-y-5">
              {comments.data.comments.map((c) => (
                <Comment key={c.ref} comment={c} onReply={setTarget} />
              ))}
            </ul>
          )}
        </div>

        <form
          className="border-t bg-muted/40 px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!send.isPending && length > 0 && length <= MAX) send.mutate();
          }}
        >
          {target ? (
            <p className="mb-2 flex items-center gap-2 text-sm">
              <CornerDownRight className="size-4 text-muted-foreground rtl:-scale-x-100" aria-hidden />
              {t("replyingTo", { name: target.author.name })}
              <button type="button" onClick={() => setTarget(null)} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-muted" aria-label={t("cancelTarget")}>
                <X className="size-3.5" aria-hidden />
              </button>
            </p>
          ) : null}
          <label htmlFor="reply-text" className="sr-only">
            {t("label")}
          </label>
          <textarea
            id="reply-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            dir="auto"
            placeholder={target ? t("placeholderReply", { name: target.author.name }) : t("placeholderPost")}
            className="field-control w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
          />
          {send.isError ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {reconnect ? t("reconnect", { platform }) : isApiError(send.error) && send.error.code === "validation_failed" ? send.error.message : t("failed")}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={cn("tabular whitespace-nowrap text-xs", length > MAX ? "font-semibold text-danger" : "text-muted-foreground")}>
              {t("count", { count: length, max: MAX })}
            </span>
            <Button type="submit" loading={send.isPending} disabled={length === 0 || length > MAX}>
              <Send aria-hidden /> {t("send", { as: account.displayName || user.displayName })}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

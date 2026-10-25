"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, type Post } from "@/lib/api/client";
import { useIntentKey } from "@/lib/use-intent-key";
import { useWorkspace } from "@/features/session/workspace-context";

export function usePostActions() {
  const t = useTranslations("posts.actions");
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const retryKey = useIntentKey();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [...scope, "posts"] });

  // Safe to press twice: one key per retry intent (FRONTEND.md F10, TEST.md DBL-22).
  const retry = useMutation({
    mutationFn: (post: Post) => api.posts.retry(workspace.id, post.id, { idempotencyKey: retryKey.get() }),
    onSuccess: () => {
      retryKey.renew();
      toast.success(t("retrying"));
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (post: Post) => api.posts.remove(workspace.id, post.id),
    onSuccess: () => {
      toast.success(t("deleted"));
      void invalidate();
    },
  });

  const reschedule = useMutation({
    mutationFn: ({ post, scheduledAt }: { post: Post; scheduledAt: string }) =>
      api.posts.reschedule(workspace.id, post.id, scheduledAt, post.version),
    onSuccess: () => {
      toast.success(t("rescheduled"));
      void invalidate();
    },
    // A failed move rolls back by refetching the true state (TEST.md DBL-14).
    onError: () => void invalidate(),
  });

  return { retry, remove, reschedule };
}

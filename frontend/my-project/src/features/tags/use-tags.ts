"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api, type Tag, type TagColor } from "@/lib/api/client";
import { useIntentKey } from "@/lib/use-intent-key";
import { tagsOptions } from "@/features/session/query-options";
import { useWorkspace } from "@/features/session/workspace-context";

export function useTags() {
  const { workspace, scope } = useWorkspace();
  return useQuery(tagsOptions(workspace.id, scope));
}

export function useTagMap(): Map<string, Tag> {
  const { data } = useTags();
  return useMemo(() => new Map((data ?? []).map((t) => [t.id, t])), [data]);
}

export function useTagMutations() {
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const intent = useIntentKey();
  const key = tagsOptions(workspace.id, scope).queryKey;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key });
    // Posts carry tag ids; a rename or delete changes what they show.
    void queryClient.invalidateQueries({ queryKey: [...scope, "posts"] });
  };

  const create = useMutation({
    mutationFn: (input: { name: string; color: TagColor }) => api.tags.create(workspace.id, input, { idempotencyKey: intent.get() }),
    onSuccess: (tag) => {
      intent.renew();
      queryClient.setQueryData<Tag[]>(key, (old) => [...(old ?? []), tag].sort((a, b) => a.name.localeCompare(b.name)));
    },
  });

  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; color?: TagColor }) => api.tags.update(workspace.id, id, patch),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.tags.remove(workspace.id, id),
    onSuccess: refresh,
  });

  return { create, update, remove };
}

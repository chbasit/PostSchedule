"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { InsightsRange, Post, PostFilter } from "@/lib/api/client";
import { AI_ENABLED } from "@/config/site";
import { matchesFilter } from "@/lib/api/filter";
import {
  accountsOptions,
  aiCreditsOptions,
  aiImagesOptions,
  insightsOptions,
  invitesOptions,
  membersOptions,
  notificationsOptions,
  postsOptions,
} from "./query-options";
import { useWorkspace } from "./workspace-context";

export function useAccounts() {
  const { workspace, scope } = useWorkspace();
  return useQuery(accountsOptions(workspace.id, scope));
}

/**
 * Filtered post lists show a preview built from the cached "all posts" list right away,
 * then swap in the server's answer. Typing a search keeps the previous results on screen
 * instead of flashing a skeleton.
 */
export function usePosts(filter: PostFilter = {}) {
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const hasFilter = Object.values(filter).some((v) => v !== undefined);
  return useQuery({
    ...postsOptions(workspace.id, scope, filter),
    placeholderData: (previous) => {
      if (!hasFilter) return previous;
      const all = queryClient.getQueryData<Post[]>(postsOptions(workspace.id, scope).queryKey);
      return all ? all.filter((p) => matchesFilter(p, filter)) : previous;
    },
  });
}

export function useNotifications() {
  const { workspace, scope } = useWorkspace();
  return useQuery({ ...notificationsOptions(workspace.id, scope), refetchInterval: 30_000 });
}

export function useMembers() {
  const { workspace, scope } = useWorkspace();
  return useQuery(membersOptions(workspace.id, scope));
}

export function useInvites() {
  const { workspace, scope } = useWorkspace();
  return useQuery(invitesOptions(workspace.id, scope));
}

// Switching the range keeps the same account's previous numbers on screen until the new
// ones arrive; another account never borrows them.
export function useAccountInsights(accountId: string, days: InsightsRange) {
  const { workspace, user, scope } = useWorkspace();
  return useQuery({
    ...insightsOptions(workspace.id, scope, accountId, days, user.timezone),
    placeholderData: (previous) => (previous?.accountId === accountId ? previous : undefined),
  });
}

export function useAiCredits() {
  const { workspace, scope } = useWorkspace();
  return useQuery({ ...aiCreditsOptions(workspace.id, scope), enabled: AI_ENABLED });
}

export function useAiImages() {
  const { workspace, scope } = useWorkspace();
  return useQuery({ ...aiImagesOptions(workspace.id, scope), enabled: AI_ENABLED });
}

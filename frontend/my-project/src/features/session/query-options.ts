import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { api, type InsightsRange, type PostFilter } from "@/lib/api/client";

// One definition per query, shared by the hooks and by prefetching, so a page opened
// after sign-in finds its data already in the cache.

export type Scope = readonly [string, string, string];

export const sessionKey = ["session"] as const;

export const sessionOptions = queryOptions({
  queryKey: sessionKey,
  queryFn: () => api.auth.session(),
  staleTime: 60_000,
});

export const accountsOptions = (ws: string, scope: Scope) =>
  queryOptions({ queryKey: [...scope, "accounts"], queryFn: () => api.accounts.list(ws) });

export const insightsOptions = (ws: string, scope: Scope, accountId: string, days: InsightsRange, timezone: string) =>
  queryOptions({
    queryKey: [...scope, "insights", accountId, days, timezone],
    queryFn: () => api.accounts.insights(ws, accountId, { days, timezone }),
    staleTime: 5 * 60_000,
  });

export const postsOptions = (ws: string, scope: Scope, filter: PostFilter = {}) =>
  queryOptions({ queryKey: [...scope, "posts", filter], queryFn: () => api.posts.list(ws, filter) });

export const notificationsOptions = (ws: string, scope: Scope) =>
  queryOptions({ queryKey: [...scope, "notifications"], queryFn: () => api.notifications.list(ws) });

export const membersOptions = (ws: string, scope: Scope) =>
  queryOptions({ queryKey: [...scope, "members"], queryFn: () => api.members.list(ws) });

export const invitesOptions = (ws: string, scope: Scope) =>
  queryOptions({ queryKey: [...scope, "invites"], queryFn: () => api.members.invites(ws) });

export const aiCreditsOptions = (ws: string, scope: Scope) =>
  queryOptions({ queryKey: [...scope, "ai", "credits"], queryFn: () => api.ai.credits(ws) });

export const aiImagesOptions = (ws: string, scope: Scope) =>
  queryOptions({ queryKey: [...scope, "ai", "images"], queryFn: () => api.ai.images.list(ws), staleTime: 5 * 60_000 });

export const tagsOptions = (ws: string, scope: Scope) =>
  queryOptions({ queryKey: [...scope, "tags"], queryFn: () => api.tags.list(ws), staleTime: 5 * 60_000 });

// Warms the cache for the screens people open first. Safe to call often: fresh data is skipped.
export function prefetchWorkspace(queryClient: QueryClient, ws: string, scope: Scope) {
  void queryClient.prefetchQuery(postsOptions(ws, scope));
  void queryClient.prefetchQuery(accountsOptions(ws, scope));
  void queryClient.prefetchQuery(notificationsOptions(ws, scope));
  void queryClient.prefetchQuery(membersOptions(ws, scope));
  void queryClient.prefetchQuery(tagsOptions(ws, scope));
}

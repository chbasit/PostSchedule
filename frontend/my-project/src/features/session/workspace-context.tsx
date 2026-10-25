"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter as useNextRouter } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Session, User, Workspace } from "@/lib/api/client";
import { prefetchWorkspace, sessionKey, sessionOptions, type Scope } from "./query-options";

export { sessionKey } from "./query-options";

// For screens outside the signed-in shell (verify email, payment polling).
export function useSession() {
  return useQuery(sessionOptions);
}

export type ReadyWorkspace = {
  status: "ready";
  user: User;
  workspace: Workspace;
  workspaces: Workspace[];
  switchWorkspace: (id: string) => void;
  // Every query key starts with this so one user's cache never shows for another (TEST.md AUTHZ-12).
  scope: Scope;
};

export type WorkspaceState =
  | { status: "loading" }
  | { status: "error"; error: unknown; retry: () => void }
  | ReadyWorkspace;

const WorkspaceContext = createContext<WorkspaceState>({ status: "loading" });

const WS_STORAGE_KEY = "ps_workspace";
const wsListeners = new Set<() => void>();

function readStoredWorkspace(): string | null {
  try {
    return localStorage.getItem(WS_STORAGE_KEY);
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => undefined;

// False on the server and during hydration, true afterwards.
function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// Keeps the session fresh (refetch on focus) and stops it being garbage-collected.
// Mounted only in the browser, because useQuery reads the clock while rendering.
function SessionObserver() {
  useQuery(sessionOptions);
  return null;
}

/**
 * Provides the signed-in user and workspace to the app.
 *
 * It always renders its children: pages show their own skeleton until the session is
 * ready (see AppPage). The session is read from the query cache with
 * useSyncExternalStore instead of useQuery, so nothing here touches the clock during
 * prerender and Next.js can validate every page for instant navigation.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const nextRouter = useNextRouter();
  const isClient = useIsClient();

  const sessionState = useSyncExternalStore(
    (onChange) =>
      // TanStack notifies cache listeners synchronously, sometimes while another component
      // is rendering a query. Listen to the session query only, and defer the update.
      queryClient.getQueryCache().subscribe((event) => {
        if (event.query.queryKey[0] === sessionKey[0]) queueMicrotask(onChange);
      }),
    () => queryClient.getQueryState<Session | null>(sessionKey),
    () => undefined,
  );
  const storedWorkspace = useSyncExternalStore(
    (onChange) => {
      wsListeners.add(onChange);
      return () => wsListeners.delete(onChange);
    },
    readStoredWorkspace,
    () => null,
  );

  const switchWorkspace = useCallback(
    (id: string) => {
      try {
        localStorage.setItem(WS_STORAGE_KEY, id);
      } catch {
        // Remembered for this page view only.
      }
      wsListeners.forEach((l) => l());
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === "ws" && q.queryKey[1] !== id });
    },
    [queryClient],
  );

  const retry = useCallback(() => void queryClient.refetchQueries({ queryKey: sessionKey }), [queryClient]);

  const session = sessionState?.status === "success" ? sessionState.data : undefined;

  const value = useMemo<WorkspaceState>(() => {
    if (sessionState?.status === "error" && !session) return { status: "error", error: sessionState.error, retry };
    if (!session) return { status: "loading" };
    // The stored choice is only a hint; it must be one of the user's workspaces.
    const workspace = session.workspaces.find((w) => w.id === storedWorkspace) ?? session.workspaces[0];
    if (!workspace) return { status: "loading" };
    return {
      status: "ready",
      user: session.user,
      workspace,
      workspaces: session.workspaces,
      switchWorkspace,
      scope: ["ws", workspace.id, session.user.id] as const,
    };
  }, [sessionState, session, storedWorkspace, switchWorkspace, retry]);

  // The proxy already redirects signed-out visitors; this covers a session that ends mid-visit.
  const signedOut = sessionState?.status === "success" && sessionState.data === null;
  useEffect(() => {
    if (!signedOut) return;
    const next = encodeURIComponent(location.pathname + location.search);
    nextRouter.replace(`/${document.documentElement.lang}/login?next=${next}`);
  }, [signedOut, nextRouter]);

  // Warm the cache for the screens people open next.
  const readyWs = value.status === "ready" ? value.workspace.id : null;
  const readyUser = value.status === "ready" ? value.user.id : null;
  useEffect(() => {
    if (readyWs && readyUser) prefetchWorkspace(queryClient, readyWs, ["ws", readyWs, readyUser]);
  }, [queryClient, readyWs, readyUser]);

  return (
    <WorkspaceContext value={value}>
      {isClient ? <SessionObserver /> : null}
      {children}
    </WorkspaceContext>
  );
}

export function useWorkspaceState(): WorkspaceState {
  return use(WorkspaceContext);
}

// For components rendered inside a ready AppPage.
export function useWorkspace(): ReadyWorkspace {
  const state = use(WorkspaceContext);
  if (state.status !== "ready") throw new Error("useWorkspace must be used inside a ready AppPage");
  return state;
}

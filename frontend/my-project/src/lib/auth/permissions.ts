// Role matrix from BACKEND.md §5.3. The UI uses this only to hide or explain
// controls; the server enforces the same matrix (CLAUDE.md rule 3).

export type Role = "owner" | "admin" | "editor" | "viewer" | "reviewer";

export type Action =
  | "post.create"
  | "post.delete"
  | "post.approve"
  | "account.connect"
  | "member.manage"
  | "billing.manage"
  | "workspace.delete"
  | "apikey.manage";

const MATRIX: Record<Action, readonly Role[]> = {
  "post.create": ["owner", "admin", "editor"],
  "post.delete": ["owner", "admin", "editor"],
  "post.approve": ["owner", "admin", "editor", "reviewer"],
  "account.connect": ["owner", "admin"],
  "member.manage": ["owner", "admin"],
  "billing.manage": ["owner"],
  "workspace.delete": ["owner"],
  "apikey.manage": ["owner", "admin"],
};

export function can(role: Role | undefined, action: Action): boolean {
  return role ? MATRIX[action].includes(role) : false;
}

export const ROLES: readonly Role[] = ["owner", "admin", "editor", "viewer", "reviewer"];
export const INVITABLE_ROLES: readonly Role[] = ["admin", "editor", "viewer", "reviewer"];

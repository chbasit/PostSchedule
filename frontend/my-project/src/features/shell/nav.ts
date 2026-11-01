import { Building2, CalendarDays, CreditCard, House, List, Plug, SlidersHorizontal, SquarePen, Tag, UserRound, Users, WandSparkles, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  key: "home" | "newPost" | "aiStudio" | "calendar" | "allPosts";
  icon: LucideIcon;
  exact?: boolean;
};

export type SettingsItem = {
  href: string;
  key: "profile" | "preferences" | "workspace" | "team" | "accounts" | "billing" | "tags";
  icon: LucideIcon;
};

// Engage and Operate are hidden until those modules ship (FRONTEND.md §6). Scheduled,
// Posted and Drafts are tabs inside All posts; each account has its own pages, listed
// under these items in the sidebar.
export const NAV: NavItem[] = [
  { href: "/dashboard", key: "home", icon: House, exact: true },
  { href: "/dashboard/create", key: "newPost", icon: SquarePen },
  { href: "/dashboard/ai-studio", key: "aiStudio", icon: WandSparkles },
  { href: "/dashboard/posts/calendar", key: "calendar", icon: CalendarDays },
  { href: "/dashboard/posts", key: "allPosts", icon: List, exact: true },
];

export const SETTINGS_HOME = "/dashboard/settings";

// Settings replace the main navigation while you are in them: your account, the
// workspace, then features. Groups are split by a gap, without headings.
export const SETTINGS_NAV: SettingsItem[][] = [
  [
    { href: "/dashboard/settings/profile", key: "profile", icon: UserRound },
    { href: "/dashboard/settings/preferences", key: "preferences", icon: SlidersHorizontal },
  ],
  [
    { href: "/dashboard/settings/workspace", key: "workspace", icon: Building2 },
    { href: "/dashboard/settings/team", key: "team", icon: Users },
    { href: "/dashboard/settings/accounts", key: "accounts", icon: Plug },
    { href: "/dashboard/settings/billing", key: "billing", icon: CreditCard },
  ],
  [{ href: "/dashboard/settings/tags", key: "tags", icon: Tag }],
];

export function isActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function inSettings(pathname: string) {
  return isActive(pathname, { href: SETTINGS_HOME });
}

export const accountHref = (id: string) => `/dashboard/accounts/${id}`;

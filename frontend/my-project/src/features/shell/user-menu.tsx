"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, LogOut, SlidersHorizontal, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { setTheme, useTheme, type ThemePreference } from "@/components/theme";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { useWorkspace } from "@/features/session/workspace-context";

// The account menu, shared by the sidebar's profile button (desktop) and the header
// avatar (phones and tablets).
export function UserMenuItems() {
  const t = useTranslations("shell");
  const tt = useTranslations("theme");
  const tn = useTranslations("nav.settings");
  const { user } = useWorkspace();
  const queryClient = useQueryClient();
  const router = useRouter();
  const theme = useTheme();
  const signOut = useMutation({
    mutationFn: () => api.auth.signOut(),
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });

  return (
    <>
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-semibold">{user.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings/profile">
          <UserRound aria-hidden /> {tn("profile")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings/preferences">
          <SlidersHorizontal aria-hidden /> {tn("preferences")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings/billing">
          <CreditCard aria-hidden /> {tn("billing")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{tt("label")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
        <DropdownMenuRadioItem value="light">{tt("light")}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">{tt("dark")}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system">{tt("system")}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          if (!signOut.isPending) signOut.mutate();
        }}
      >
        <LogOut aria-hidden /> {t("signOut")}
      </DropdownMenuItem>
    </>
  );
}

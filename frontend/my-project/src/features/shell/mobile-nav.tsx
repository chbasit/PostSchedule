"use client";

import { CalendarDays, House, List, Menu, SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar";

// Drawer with the full navigation, below the lg breakpoint.
export function MobileNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("open")}>
          <Menu aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent variant="drawer" className="bg-shell" aria-describedby={undefined}>
        <div className="mb-6 px-2">
          <Logo />
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Phones: Home, Calendar, Create, Posts, More (FRONTEND.md §6). Like the sidebar, the
// current-page highlight streams in on routes whose URL is only known at runtime.
export function BottomBar() {
  return (
    <Suspense fallback={<BottomBarView pathname="" />}>
      <CurrentBottomBar />
    </Suspense>
  );
}

function CurrentBottomBar() {
  return <BottomBarView pathname={usePathname()} />;
}

function BottomBarView({ pathname }: { pathname: string }) {
  const t = useTranslations("nav.items");
  const items = [
    { href: "/dashboard", label: t("home"), icon: House, exact: true },
    { href: "/dashboard/posts/calendar", label: t("calendar"), icon: CalendarDays },
    { href: "/dashboard/create", label: t("newPost"), icon: SquarePen, primary: true },
    { href: "/dashboard/posts", label: t("allPosts"), icon: List, exact: true },
  ];
  return (
    <nav
      aria-label={t("home")}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors",
              active ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full transition-colors duration-200",
                item.primary ? "size-7 bg-primary text-primary-foreground" : "h-6 w-10",
                active && !item.primary && "bg-sky text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="max-w-full truncate px-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

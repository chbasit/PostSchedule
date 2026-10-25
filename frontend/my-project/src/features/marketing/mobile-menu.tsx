"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  links: Array<{ href: string; label: string }>;
  loginLabel: string;
  startLabel: string;
};

export function MobileMenu({ links, loginLabel, startLabel }: Props) {
  const t = useTranslations("marketing.nav");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("openMenu")}>
          <Menu aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent variant="sheet" aria-describedby={undefined}>
        <div className="mb-8">
          <Logo />
        </div>
        <nav aria-label={t("main")}>
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={close} className="flex h-12 items-center rounded px-3 text-lg hover:bg-muted">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Link href="/signup" onClick={close} className={cn(buttonVariants({ size: "lg" }))}>
            {startLabel}
          </Link>
          <Link href="/login" onClick={close} className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
            {loginLabel}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

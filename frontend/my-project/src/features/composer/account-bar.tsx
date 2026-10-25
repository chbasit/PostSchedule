"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SocialAccount } from "@/lib/api/client";
import { getPlatform, type PostType } from "@/providers/catalog";
import { AccountPicker } from "./account-picker";

type Props = {
  accounts: SocialAccount[];
  type: PostType;
  selected: string[];
  onChange: (ids: string[]) => void;
};

// Chosen accounts as removable chips; the full searchable list lives in a popover.
export function AccountBar({ accounts, type, selected, onChange }: Props) {
  const t = useTranslations("composer.accounts");
  const chosen = accounts.filter((a) => selected.includes(a.id));

  return (
    <section aria-labelledby="account-bar-title">
      <h2 id="account-bar-title" className="sr-only">
        {t("title")}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {chosen.map((a) => (
          <span key={a.id} className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card py-1 pe-1.5 ps-1">
            <PlatformMark id={a.provider} className="rounded-full" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium leading-tight">{a.displayName}</span>
              <span className="block truncate text-xs leading-tight text-muted-foreground" dir="ltr">
                {getPlatform(a.provider).name} · {a.handle}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onChange(selected.filter((id) => id !== a.id))}
              aria-label={t("removeAccount", { name: `${getPlatform(a.provider).name} ${a.handle}` })}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </span>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={chosen.length === 0 ? "primary" : "secondary"} size="sm" className="rounded-full" data-testid="add-accounts">
              <Plus aria-hidden /> {chosen.length === 0 ? t("choose") : t("add")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <AccountPicker accounts={accounts} loading={false} type={type} selected={selected} onChange={onChange} />
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}

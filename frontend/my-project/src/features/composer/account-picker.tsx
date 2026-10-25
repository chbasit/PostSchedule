"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { PlatformMark } from "@/components/platform-badge";
import { Checkbox } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import type { SocialAccount } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { getPlatform, type PostType } from "@/providers/catalog";

type Props = {
  accounts: SocialAccount[] | undefined;
  loading: boolean;
  type: PostType;
  selected: string[];
  onChange: (ids: string[]) => void;
};

// Searchable multi-select. Accounts that cannot take this post are shown disabled with the reason.
export function AccountPicker({ accounts, loading, type, selected, onChange }: Props) {
  const t = useTranslations("composer.accounts");
  const [query, setQuery] = useState("");
  const listId = useId();

  const visible = (accounts ?? []).filter((a) =>
    `${a.displayName} ${a.handle} ${getPlatform(a.provider).name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const reason = (a: SocialAccount): string | null => {
    if (a.status !== "active") return t("needsReconnect");
    if (!getPlatform(a.provider).capabilities[type]) return t("unsupported", { platform: getPlatform(a.provider).name, type: t(`types.${type}`) });
    return null;
  };

  return (
    <section aria-labelledby={`${listId}-title`} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id={`${listId}-title`} className="text-sm font-semibold">
          {t("title")}
        </h2>
        <span className="text-xs text-muted-foreground">{t("selected", { count: selected.length })}</span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-9 ps-9" />
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : accounts && accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {t("none")}{" "}
          <Link href="/dashboard/settings/accounts" className="font-semibold text-foreground transition-opacity hover:opacity-75">
            {t("connect")}
          </Link>
        </p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((a) => {
            const why = reason(a);
            const checked = selected.includes(a.id);
            const id = `${listId}-${a.id}`;
            return (
              <li key={a.id}>
                <label
                  htmlFor={id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    why ? "cursor-not-allowed bg-muted" : "cursor-pointer hover:bg-muted",
                    checked && "border-foreground bg-tint-blue/60",
                  )}
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={!!why}
                    onCheckedChange={(v) => onChange(v ? [...selected, a.id] : selected.filter((s) => s !== a.id))}
                    aria-describedby={why ? `${id}-why` : undefined}
                  />
                  <PlatformMark id={a.provider} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                      {a.handle}
                    </span>
                    {why ? (
                      <span id={`${id}-why`} className="block text-xs font-medium text-warning">
                        {why}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

"use client";

import { Check, ChevronDown, Plus, Search, Settings2, Tag as TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { TINT_ORDER, tints } from "@/components/tint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { selectTrigger, selectTriggerGhost } from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { isApiError } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/features/session/workspace-context";
import { useTagMutations, useTags } from "./use-tags";

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
  // "assign" adds tags to a post (and can create new ones); "filter" narrows a list.
  mode?: "assign" | "filter";
  className?: string;
};

export function TagPicker({ value, onChange, mode = "assign", className }: Props) {
  const t = useTranslations("tags");
  const { workspace } = useWorkspace();
  const tags = useTags();
  const { create } = useTagMutations();
  const [query, setQuery] = useState("");
  const q = query.trim();

  const all = tags.data ?? [];
  const visible = all.filter((tag) => tag.name.toLowerCase().includes(q.toLowerCase()));
  const exact = all.some((tag) => tag.name.toLowerCase() === q.toLowerCase());
  const canCreate = mode === "assign" && q.length > 0 && !exact && can(workspace.role, "post.create");

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  function createTag() {
    if (create.isPending) return;
    // New tags take the next colour in turn so neighbours differ.
    const color = TINT_ORDER[all.length % TINT_ORDER.length];
    create.mutate(
      { name: q, color },
      {
        onSuccess: (tag) => {
          onChange([...value, tag.id]);
          setQuery("");
        },
      },
    );
  }

  return (
    <Popover onOpenChange={(open) => !open && setQuery("")}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            // Filtering sits in a filter bar, so it drops the field border.
            mode === "filter" ? selectTriggerGhost : cn(selectTrigger, "h-9 w-auto shrink-0 gap-1.5 font-medium", value.length > 0 && "border-foreground/60"),
            "[&_svg]:size-4 [&_svg]:shrink-0",
            className,
          )}
        >
          <TagIcon aria-hidden />
          {t("label")}
          {value.length > 0 ? (
            <span className="inline-flex min-w-5 animate-pop items-center justify-center rounded-full bg-sky px-1.5 text-xs font-semibold text-ink">
              {value.length}
            </span>
          ) : null}
          <ChevronDown className="text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                createTag();
              }
            }}
            placeholder={mode === "assign" ? t("search") : t("searchFilter")}
            aria-label={mode === "assign" ? t("search") : t("searchFilter")}
            className="h-9 ps-8"
            maxLength={40}
          />
        </div>

        <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto" aria-label={t("label")}>
          {visible.map((tag) => {
            const checked = value.includes(tag.id);
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-start text-sm hover:bg-muted"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", tints[tag.color].dot)} />
                  <span className="flex-1 truncate">{tag.name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {tags.isPending ? <p className="px-2 py-3 text-sm text-muted-foreground">{t("loading")}</p> : null}
        {tags.isSuccess && all.length === 0 && !q ? <p className="px-2 py-3 text-sm text-muted-foreground">{t("empty")}</p> : null}
        {tags.isSuccess && all.length > 0 && visible.length === 0 && !canCreate ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{t("noMatch")}</p>
        ) : null}

        {canCreate ? (
          <button
            type="button"
            onClick={createTag}
            disabled={create.isPending}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-start text-sm font-medium hover:bg-muted disabled:text-muted-foreground"
          >
            <Plus className="size-4" aria-hidden />
            <span className="truncate">{t("create", { name: q })}</span>
          </button>
        ) : null}
        {create.isError ? (
          <p role="alert" className="px-2 py-1 text-sm text-danger">
            {isApiError(create.error) && create.error.code === "conflict" ? t("exists") : t("createFailed")}
          </p>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
          <Link href="/dashboard/settings/tags" className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
            <Settings2 className="size-4" aria-hidden /> {t("manage")}
          </Link>
          {value.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              {t("clear")}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

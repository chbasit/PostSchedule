"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/states";
import { TINT_ORDER } from "@/components/tint";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, Skeleton } from "@/components/ui/misc";
import { isApiError, type Tag, type TagColor } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { usePosts } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";
import { TagChip } from "./tag-chip";
import { TagColorPicker } from "./tag-color-picker";
import { useTagMutations, useTags } from "./use-tags";

function useErrorText() {
  const t = useTranslations("settings.tags");
  const tt = useTranslations("tags");
  return (error: unknown) =>
    isApiError(error) && error.code === "conflict"
      ? tt("exists")
      : isApiError(error) && error.code === "validation_failed"
        ? t("nameRequired")
        : t("failed");
}

function DeleteTagDialog({ tag, uses, onClose }: { tag: Tag; uses: number; onClose: () => void }) {
  const t = useTranslations("settings.tags");
  const tc = useTranslations("common");
  const { remove } = useTagMutations();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader title={t("deleteTitle", { name: tag.name })} description={t("deleteBody", { count: uses })} />
        {remove.isError ? (
          <p role="alert" className="text-sm text-danger">
            {t("failed")}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tc("cancel")}</Button>
          </DialogClose>
          <Button
            variant="destructive"
            loading={remove.isPending}
            onClick={() =>
              !remove.isPending &&
              remove.mutate(tag.id, {
                onSuccess: () => {
                  toast.success(t("deleted"));
                  onClose();
                },
              })
            }
          >
            {t("deleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagRow({ tag, uses, canEdit }: { tag: Tag; uses: number; canEdit: boolean }) {
  const t = useTranslations("settings.tags");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const { update } = useTagMutations();
  const colourId = useId();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState<TagColor>(tag.color);

  const startEditing = () => {
    setName(tag.name);
    setColor(tag.color);
    update.reset();
    setEditing(true);
  };

  if (editing) {
    return (
      <li className="p-3 sm:p-4">
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || update.isPending) return;
            update.mutate(
              { id: tag.id, name: name.trim(), color },
              {
                onSuccess: () => {
                  toast.success(t("saved"));
                  setEditing(false);
                },
              },
            );
          }}
        >
          <Field label={t("renameLabel")} error={update.isError ? errorText(update.error) : !name.trim() ? t("nameRequired") : undefined}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />}
          </Field>
          <div className="space-y-1.5">
            <p id={colourId} className="text-sm font-medium">
              {t("colour")}
            </p>
            <TagColorPicker value={color} onChange={setColor} labelledBy={colourId} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!name.trim()} loading={update.isPending}>
              {tc("save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <TagChip tag={tag} className="self-start text-sm sm:self-auto" />
        <span className="text-sm text-muted-foreground">{t("usage", { count: uses })}</span>
      </div>
      {canEdit ? (
        <div className="flex shrink-0 gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={t("edit", { name: tag.name })} onClick={startEditing}>
            <Pencil aria-hidden />
          </Button>
          <Button size="icon-sm" variant="ghost" className="text-danger" aria-label={t("delete", { name: tag.name })} onClick={() => setDeleting(true)}>
            <Trash aria-hidden />
          </Button>
        </div>
      ) : null}
      {deleting ? <DeleteTagDialog tag={tag} uses={uses} onClose={() => setDeleting(false)} /> : null}
    </li>
  );
}

// Settings card for the workspace's tags. The composer's tag menu links here (#tags).
export function TagsCard() {
  const t = useTranslations("settings.tags");
  const errorText = useErrorText();
  const { workspace } = useWorkspace();
  const tags = useTags();
  const posts = usePosts();
  const { create } = useTagMutations();
  const canEdit = can(workspace.role, "post.create");
  const colourId = useId();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<TagColor | null>(null);
  // New tags take the next colour in turn unless one is picked.
  const color = picked ?? TINT_ORDER[(tags.data?.length ?? 0) % TINT_ORDER.length];

  const uses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts.data ?? []) for (const id of p.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [posts.data]);

  return (
    <Card className="space-y-4 p-5">

      {canEdit ? (
        <form
          noValidate
          className="flex flex-col gap-4 rounded-lg border border-dashed p-3 sm:p-4 md:flex-row md:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || create.isPending) return;
            create.mutate(
              { name: name.trim(), color },
              {
                onSuccess: () => {
                  setName("");
                  setPicked(null);
                  toast.success(t("added"));
                },
              },
            );
          }}
        >
          <Field label={t("newName")} error={create.isError ? errorText(create.error) : undefined} className="flex-1">
            {(p) => (
              <Input
                {...p}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (create.isError) create.reset();
                }}
                placeholder={t("newPlaceholder")}
                maxLength={40}
              />
            )}
          </Field>
          <div className="space-y-1.5">
            <p id={colourId} className="text-sm font-medium">
              {t("colour")}
            </p>
            <TagColorPicker value={color} onChange={setPicked} labelledBy={colourId} />
          </div>
          <Button type="submit" className="md:mt-7" disabled={!name.trim()} loading={create.isPending}>
            <Plus aria-hidden /> {t("add")}
          </Button>
        </form>
      ) : (
        <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">{t("readOnly")}</p>
      )}

      {tags.isPending ? (
        <div className="space-y-2" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : tags.isError ? (
        <ErrorState error={tags.error} onRetry={() => tags.refetch()} />
      ) : tags.data.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tags.data.map((tag) => (
            <TagRow key={tag.id} tag={tag} uses={uses.get(tag.id) ?? 0} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </Card>
  );
}

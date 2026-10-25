"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Trash, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, Skeleton } from "@/components/ui/misc";
import { Select, SelectItem } from "@/components/ui/select";
import { api, isApiError, type Member } from "@/lib/api/client";
import { can, INVITABLE_ROLES, type Role } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/time";
import { useIntentKey } from "@/lib/use-intent-key";
import { FormAlert } from "@/features/auth/form-alert";
import { useInvites, useMembers } from "@/features/session/queries";
import { useWorkspace } from "@/features/session/workspace-context";

const inviteSchema = z.object({
  email: z.string().trim().min(1, "required").pipe(z.email("email")),
  role: z.enum(["admin", "editor", "viewer", "reviewer"]),
});
type InviteValues = z.infer<typeof inviteSchema>;

function InviteForm({ seatsLeft }: { seatsLeft: number }) {
  const t = useTranslations("teams");
  const tv = useTranslations("validation");
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const intent = useIntentKey();
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: "", role: "editor" } });

  // Double submit sends one email and creates one invite (TEST.md DBL-16).
  const invite = useMutation({
    mutationFn: (values: InviteValues) => api.members.invite(workspace.id, values, { idempotencyKey: intent.get() }),
    onSuccess: (inv) => {
      intent.renew();
      form.reset({ email: "", role: form.getValues("role") });
      toast.success(t("invited", { email: inv.email }));
      void queryClient.invalidateQueries({ queryKey: [...scope, "invites"] });
    },
  });
  const { errors } = form.formState;

  const errorText = invite.isError
    ? isApiError(invite.error) && invite.error.code === "conflict"
      ? t("alreadyInvited")
      : isApiError(invite.error) && invite.error.code === "plan_limit_reached"
        ? t("seatLimit")
        : t("inviteFailed")
    : null;

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-semibold">{t("inviteTitle")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("seatsLeft", { count: seatsLeft })}</p>
      <form
        noValidate
        className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-start"
        onSubmit={form.handleSubmit((values) => {
          if (!invite.isPending) invite.mutate(values);
        })}
        onChange={() => intent.renew()}
      >
        <Field label={t("email")} error={errors.email && tv(errors.email.message as "required")}>
          {(p) => <Input {...p} type="email" autoComplete="off" inputMode="email" {...form.register("email")} />}
        </Field>
        <Field label={t("role")}>
          {(p) => (
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select
                  {...p}
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    intent.renew();
                  }}
                >
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`roles.${r}.name`)}
                    </SelectItem>
                  ))}
                </Select>
              )}
            />
          )}
        </Field>
        <Button type="submit" className="sm:mt-7" loading={invite.isPending} disabled={seatsLeft <= 0} data-testid="invite-member">
          <MailPlus aria-hidden /> {t("send")}
        </Button>
      </form>
      {errorText ? (
        <div className="mt-3">
          <FormAlert>{errorText}</FormAlert>
        </div>
      ) : null}
    </Card>
  );
}

function RemoveMemberDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const t = useTranslations("teams");
  const { workspace, scope } = useWorkspace();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.members.remove(workspace.id, member.userId),
    onSuccess: () => {
      toast.success(t("removed", { name: member.displayName }));
      void queryClient.invalidateQueries({ queryKey: [...scope, "members"] });
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader title={t("removeTitle", { name: member.displayName })} description={t("removeBody")} />
        {remove.isError ? <p role="alert" className="text-sm text-danger">{t("removeFailed")}</p> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("cancel")}</Button>
          </DialogClose>
          <Button variant="destructive" loading={remove.isPending} onClick={() => !remove.isPending && remove.mutate()}>
            {t("remove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamsView() {
  const t = useTranslations("teams");
  const locale = useLocale();
  const { workspace, user, scope } = useWorkspace();
  const members = useMembers();
  const invites = useInvites();
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<Member | null>(null);
  const manage = can(workspace.role, "member.manage");
  const used = (members.data?.length ?? 0) + (invites.data?.length ?? 0);

  const revoke = useMutation({
    mutationFn: (id: string) => api.members.revokeInvite(workspace.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...scope, "invites"] }),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader icon={Users} tint="peach" title={t("title")} description={t("subtitle")} />

      {manage && members.isSuccess && invites.isSuccess ? <InviteForm seatsLeft={workspace.memberLimit - used} /> : null}

      <section aria-labelledby="members-title" className="space-y-3">
        <h2 id="members-title" className="font-semibold">
          {t("members")}
        </h2>
        {members.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => members.refetch()} />
        ) : members.data.length === 0 ? (
          <EmptyState icon={Users} title={t("emptyTitle")} />
        ) : (
          <ul className="divide-y rounded-lg border">
            {members.data.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 p-4">
                <Avatar id={m.userId} name={m.displayName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.displayName} {m.userId === user.id ? <span className="text-muted-foreground">({t("you")})</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="hidden text-end sm:block">
                  <p className="text-sm">{t(`roles.${m.role as Role}.name`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("joined", { date: formatDateTime(m.joinedAt, locale, user.timezone, { dateStyle: "medium" }) })}
                  </p>
                </div>
                {manage && m.role !== "owner" && m.userId !== user.id ? (
                  <Button variant="ghost" size="icon-sm" aria-label={t("removeLabel", { name: m.displayName })} onClick={() => setRemoving(m)}>
                    <Trash aria-hidden />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {invites.data && invites.data.length > 0 ? (
        <section aria-labelledby="invites-title" className="space-y-3">
          <h2 id="invites-title" className="font-semibold">
            {t("pending")}
          </h2>
          <ul className="divide-y rounded-lg border">
            {invites.data.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`roles.${inv.role}.name`)} · {t("expires", { date: formatDateTime(inv.expiresAt, locale, user.timezone, { dateStyle: "medium" }) })}
                  </p>
                </div>
                {manage ? (
                  <Button size="sm" variant="ghost" loading={revoke.isPending && revoke.variables === inv.id} onClick={() => !revoke.isPending && revoke.mutate(inv.id)}>
                    {t("revoke")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="roles-title" className="space-y-3">
        <h2 id="roles-title" className="font-semibold">
          {t("rolesTitle")}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {(["owner", "admin", "editor", "viewer", "reviewer"] as const).map((r) => (
            <div key={r} className="rounded-lg border p-4">
              <dt className="text-sm font-medium">{t(`roles.${r}.name`)}</dt>
              <dd className="text-sm text-muted-foreground">{t(`roles.${r}.body`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {removing ? <RemoveMemberDialog member={removing} onClose={() => setRemoving(null)} /> : null}
    </div>
  );
}

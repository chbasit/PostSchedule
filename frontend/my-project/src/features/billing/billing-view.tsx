"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleCheck, CreditCard, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/i18n/navigation";
import { api, usingMockApi } from "@/lib/api/client";
import { can } from "@/lib/auth/permissions";
import { getPlan, PLANS, type BillingInterval, type PlanKey } from "@/lib/billing/plans";
import { formatDateTime } from "@/lib/time";
import { useIntentKey } from "@/lib/use-intent-key";
import { cn } from "@/lib/utils";
import { FormAlert } from "@/features/auth/form-alert";
import { useAccounts, useMembers } from "@/features/session/queries";
import { sessionKey, useWorkspace } from "@/features/session/workspace-context";
import { IntervalToggle } from "./interval-toggle";
import { PlanCard } from "./plan-card";

const CONFIRM_TIMEOUT_MS = 45_000;

// After checkout: access changes only when the server has the confirmed state (FRONTEND.md F9).
function ConfirmingPayment({ plan }: { plan: PlanKey }) {
  const t = useTranslations("billing.confirming");
  const tp = useTranslations("plans.names");
  const { workspace } = useWorkspace();
  const [started] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const confirmed = workspace.planKey === plan && workspace.subscription.status === "active";

  // Poll the session until the webhook has been processed.
  useQuery({
    queryKey: sessionKey,
    queryFn: () => api.auth.session(),
    refetchInterval: confirmed || timedOut ? false : 1500,
  });

  useEffect(() => {
    if (confirmed) return;
    const id = setTimeout(() => setTimedOut(true), Math.max(0, CONFIRM_TIMEOUT_MS - (Date.now() - started)));
    return () => clearTimeout(id);
  }, [confirmed, started]);

  return (
    <Card className="mx-auto max-w-lg space-y-4 p-8 text-center" role="status" aria-live="polite">
      {confirmed ? (
        <>
          <CircleCheck className="mx-auto size-10 text-success" aria-hidden />
          <h2 className="text-xl font-semibold">{t("doneTitle", { plan: tp(plan) })}</h2>
          <p className="text-muted-foreground">{t("doneBody")}</p>
          <Link href="/dashboard" className={buttonVariants()}>
            {t("continue")}
          </Link>
        </>
      ) : timedOut ? (
        <>
          <h2 className="text-xl font-semibold">{t("slowTitle")}</h2>
          <p className="text-muted-foreground">{t("slowBody")}</p>
          <a href="mailto:support@example.com" className={buttonVariants({ variant: "secondary" })}>
            {t("contact")}
          </a>
        </>
      ) : (
        <>
          <Spinner className="mx-auto size-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("body")}</p>
        </>
      )}
    </Card>
  );
}

// A usage pill in the Monthly/Yearly style: the label, then the count in a filled tag that
// turns amber once the limit is reached.
function UsageTag({ label, used, limit }: { label: string; used: number | undefined; limit: number }) {
  const t = useTranslations("billing");
  const full = used !== undefined && used >= limit;
  return (
    <li className="inline-flex items-center gap-2 rounded-full border p-1 ps-3 text-sm font-medium">
      {label}
      <span className={cn("tabular rounded-full px-2.5 py-0.5 text-xs font-semibold", full ? "bg-tint-amber text-tint-amber-fg" : "bg-muted")}>
        {used === undefined ? "…" : t("usage", { used, limit })}
      </span>
    </li>
  );
}

export function BillingView() {
  const t = useTranslations("billing");
  const tp = useTranslations("plans.names");
  const locale = useLocale();
  const { workspace, user } = useWorkspace();
  const params = useSearchParams();
  const accounts = useAccounts();
  const members = useMembers();
  const [interval, setInterval] = useState<BillingInterval>(workspace.subscription.interval ?? "month");
  const intent = useIntentKey();
  const owner = can(workspace.role, "billing.manage");
  const returning = params.get("checkout") === "return" ? (params.get("plan") as PlanKey | null) : null;

  // One checkout per intent; repeat clicks are ignored (TEST.md PAY-03, DBL-01).
  const checkout = useMutation({
    mutationFn: (plan: PlanKey) => api.billing.createCheckout(workspace.id, plan, interval, { idempotencyKey: intent.get() }),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  // Invoices, card and cancellation live in Lemon Squeezy's portal; its link is fetched fresh each time.
  const portal = useMutation({
    mutationFn: () => api.billing.portal(workspace.id),
    onSuccess: ({ url }) => window.location.assign(url),
  });

  if (returning && PLANS.some((p) => p.key === returning)) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <PageHeader icon={CreditCard} tint="amber" title={t("title")} />
        <ConfirmingPayment plan={returning} />
      </div>
    );
  }

  const sub = workspace.subscription;
  const plan = getPlan(workspace.planKey);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader icon={CreditCard} tint="amber" title={t("title")} description={t("subtitle")} />

      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-semibold">{tp(plan.key)}</h2>
              <span className="rounded-full bg-highlight px-2.5 py-0.5 text-xs font-semibold text-highlight-foreground">{t("currentPlan")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
            {sub.status === "trialing" && sub.trialEndsAt
              ? t("trialUntil", { date: formatDateTime(sub.trialEndsAt, locale, user.timezone, { dateStyle: "long" }) })
              : sub.cancelAt
                ? t("endsOn", { date: formatDateTime(sub.cancelAt, locale, user.timezone, { dateStyle: "long" }) })
                : sub.currentPeriodEnd
                  ? t("renewsOn", { date: formatDateTime(sub.currentPeriodEnd, locale, user.timezone, { dateStyle: "long" }) })
                  : t("freeForever")}
            </p>
          </div>
          <ul aria-label={t("usageTitle")} className="flex flex-wrap gap-2">
            <UsageTag label={t("accounts")} used={accounts.data?.length} limit={workspace.accountLimit} />
            <UsageTag label={t("seats")} used={members.data?.length} limit={workspace.memberLimit} />
          </ul>
          {sub.status === "past_due" ? <FormAlert>{t("pastDue")}</FormAlert> : null}
        </div>
        {owner && (usingMockApi || workspace.planKey !== "free") ? (
          <Button
            variant="secondary"
            className="self-start md:self-center"
            disabled={usingMockApi}
            title={usingMockApi ? t("portalUnavailable") : undefined}
            loading={portal.isPending}
            onClick={() => !portal.isPending && portal.mutate()}
          >
            {t("manage")}
          </Button>
        ) : null}
      </Card>

      {!owner ? (
        <p className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
          <Lock className="size-4" aria-hidden /> {t("ownerOnly")}
        </p>
      ) : null}

      <section aria-labelledby="plans-title" className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="plans-title" className="text-lg font-semibold">
            {t("plansTitle")}
          </h2>
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>
        {checkout.isError ? <FormAlert>{t("checkoutFailed")}</FormAlert> : null}
        {portal.isError ? <FormAlert>{t("portalFailed")}</FormAlert> : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {PLANS.map((p, i) => {
            const current = p.key === workspace.planKey && sub.status !== "trialing";
            return (
              <PlanCard
                key={p.key}
                plan={p}
                interval={interval}
                previous={PLANS[i - 1]}
                current={current}
                action={
                  current || p.key === "free" ? null : (
                    <Button
                      className="w-full"
                      variant={p.highlighted ? "primary" : "secondary"}
                      disabled={!owner || (checkout.isPending && checkout.variables !== p.key)}
                      loading={checkout.isPending && checkout.variables === p.key}
                      onClick={() => !checkout.isPending && checkout.mutate(p.key)}
                      data-testid={`upgrade-${p.key}`}
                    >
                      {p.priceMonthly > plan.priceMonthly ? t("upgrade") : t("switch")}
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("checkoutNote")} {t("downgradeNote")}
        </p>
      </section>
    </div>
  );
}

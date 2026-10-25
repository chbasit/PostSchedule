import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Hourglass,
  LoaderCircle,
  Pause,
  TriangleAlert,
  Unplug,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { AccountStatus, PostStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "review" | "outline" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  review: "bg-review-bg text-review dark:border dark:border-review/40",
  outline: "border border-foreground/70 text-foreground",
  success: "bg-success-bg text-success dark:border dark:border-success/40",
  warning: "bg-warning-bg text-warning dark:border dark:border-warning/40",
  danger: "bg-danger-bg text-danger dark:border dark:border-danger/40",
  info: "bg-info-bg text-info dark:border dark:border-info/40",
};

const postStatus: Record<PostStatus, { tone: Tone; icon: LucideIcon }> = {
  draft: { tone: "neutral", icon: CircleDashed },
  pending_approval: { tone: "review", icon: UserCheck },
  scheduled: { tone: "outline", icon: Clock },
  publishing: { tone: "info", icon: LoaderCircle },
  published: { tone: "success", icon: CircleCheck },
  partial: { tone: "warning", icon: TriangleAlert },
  failed: { tone: "danger", icon: CircleX },
  lapsed: { tone: "warning", icon: Hourglass },
  paused: { tone: "neutral", icon: Pause },
};

function Chip({ tone, icon: Icon, label, spin, className }: { tone: Tone; icon: LucideIcon; label: string; spin?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      <Icon className={cn("size-3.5", spin && "animate-spin")} aria-hidden />
      {label}
    </span>
  );
}

// Always icon + text, never colour alone (FRONTEND.md §5).
export function PostStatusChip({ status, className }: { status: PostStatus; className?: string }) {
  const t = useTranslations("status");
  const { tone, icon } = postStatus[status];
  return <Chip tone={tone} icon={icon} label={t(status)} spin={status === "publishing"} className={className} />;
}

export function AccountStatusChip({ status }: { status: AccountStatus }) {
  const t = useTranslations("status");
  if (status === "active") return <Chip tone="success" icon={CircleCheck} label={t("connected")} />;
  return <Chip tone="warning" icon={Unplug} label={t("needs_reconnect")} />;
}

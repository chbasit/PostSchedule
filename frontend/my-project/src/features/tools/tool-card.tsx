import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlatformMark } from "@/components/platform-badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toolHref, type ToolInfo } from "./registry";

// The tool's icon on a coral wash, with the platform's mark in the corner.
export function ToolGlyph({ tool, size = "md" }: { tool: ToolInfo; size?: "md" | "lg" }) {
  const Icon = tool.icon;
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-highlight text-highlight-foreground",
        size === "lg" ? "size-14" : "size-11",
      )}
    >
      <Icon className={size === "lg" ? "size-6" : "size-5"} />
      {tool.platform ? (
        <PlatformMark id={tool.platform} size="sm" className="absolute -bottom-1 -end-1 rounded-md ring-2 ring-card" />
      ) : null}
    </span>
  );
}

// One tool in a grid: the whole card is the link.
export function ToolCard({ tool }: { tool: ToolInfo }) {
  const t = useTranslations("tools");
  return (
    <Link
      href={toolHref(tool)}
      className="card-surface group flex h-full flex-col gap-4 p-5 transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <ToolGlyph tool={tool} />
      <div className="flex-1 space-y-1">
        <h3 className="font-semibold">{t(`${tool.key}.name`)}</h3>
        <p className="text-sm text-muted-foreground">{t(`${tool.key}.description`)}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
        {t("common.open")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

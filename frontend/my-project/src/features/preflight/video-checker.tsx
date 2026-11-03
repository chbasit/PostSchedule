"use client";

import { ArrowRight, Lock, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { probeMedia, ProbeError, type MediaProbe } from "@/lib/preflight/probe";
import { aspectLabel, checkMedia, formatBytes, formatDuration, worstStatus } from "@/lib/preflight/rules";
import { PLATFORMS } from "@/providers/catalog";
import { Dropzone } from "./dropzone";
import { PlatformReport, StatusIcon } from "./preflight-report";
import { PreviewFrame } from "./preview-frame";

type State =
  | { phase: "idle" }
  | { phase: "checking"; name: string }
  | { phase: "error"; code: ProbeError["code"] }
  | { phase: "done"; probe: MediaProbe };

export function VideoChecker() {
  const t = useTranslations("tools.videoChecker");
  const tp = useTranslations("preflight");
  const locale = useLocale();
  const [state, setState] = useState<State>({ phase: "idle" });

  const probe = state.phase === "done" ? state.probe : null;

  // Release the local preview URL when a new file replaces it or the tool unmounts.
  useEffect(() => {
    return () => {
      if (probe) URL.revokeObjectURL(probe.objectUrl);
    };
  }, [probe]);

  const reports = useMemo(() => {
    if (!probe) return [];
    return PLATFORMS.filter((p) => (probe.kind === "video" ? p.capabilities.video : p.capabilities.image)).map((platform) => ({
      platform,
      checks: checkMedia(probe, platform),
    }));
  }, [probe]);

  async function onFile(file: File) {
    setState({ phase: "checking", name: file.name });
    try {
      const result = await probeMedia(file);
      setState({ phase: "done", probe: result });
    } catch (e) {
      setState({ phase: "error", code: e instanceof ProbeError ? e.code : "unreadable" });
    }
  }

  const number = (n: number) => new Intl.NumberFormat(locale).format(n);

  return (
    <div className="space-y-8">
      {state.phase !== "done" ? (
        <div className="space-y-3">
          {state.phase === "checking" ? (
            <div role="status" className="flex animate-fade-in flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-progress-from bg-highlight/50 py-14 text-center">
              <Spinner className="size-6" />
              <p className="font-medium">{t("checking", { name: state.name })}</p>
            </div>
          ) : (
            <Dropzone onFile={onFile} hint={t("hint")} />
          )}
          {state.phase === "error" ? (
            <p role="alert" className="text-sm text-danger">
              {t(`errors.${state.code}`)}
            </p>
          ) : null}
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" aria-hidden /> {t("privacy")}
          </p>
        </div>
      ) : null}

      {probe ? (
        <>
          <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium" dir="auto">
                {probe.name}
              </p>
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div className="flex gap-1.5">
                  <dt className="text-muted-foreground">{t("facts.resolution")}</dt>
                  <dd className="tabular">
                    {number(probe.width)}×{number(probe.height)} ({aspectLabel(probe.width, probe.height)})
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-muted-foreground">{t("facts.size")}</dt>
                  <dd className="tabular">{formatBytes(probe.bytes)}</dd>
                </div>
                {probe.kind === "video" ? (
                  <>
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground">{t("facts.duration")}</dt>
                      <dd className="tabular">{probe.durationSec !== null ? formatDuration(probe.durationSec) : t("facts.unavailable")}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground">{t("facts.bitrate")}</dt>
                      <dd className="tabular">
                        {probe.bitrateKbps !== null ? `${(probe.bitrateKbps / 1000).toFixed(1)} Mbps` : t("facts.unavailable")}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </div>
            <Button variant="secondary" onClick={() => setState({ phase: "idle" })}>
              <RotateCcw aria-hidden /> {t("another")}
            </Button>
          </div>

          <Tabs defaultValue={reports[0]?.platform.id}>
            <TabsList aria-label={t("platformsLabel")}>
              {reports.map(({ platform, checks }) => (
                <TabsTrigger key={platform.id} value={platform.id}>
                  <StatusIcon status={worstStatus(checks)} />
                  {platform.name}
                  <span className="sr-only">: {tp(`summary.${worstStatus(checks)}`)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {reports.map(({ platform, checks }) => (
              <TabsContent key={platform.id} value={platform.id}>
                <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
                  <PreviewFrame
                    platform={platform}
                    media={{ kind: probe.kind, url: probe.objectUrl, width: probe.width, height: probe.height }}
                    caption=""
                    handle="@yourbrand"
                  />
                  <div className="space-y-4">
                    <PlatformReport platform={platform} checks={checks} />
                    <p className="text-xs text-muted-foreground">
                      {platform.source.verifiedAt
                        ? t("sourceChecked", { date: platform.source.verifiedAt })
                        : t("sourcePending")}{" "}
                      <a href={platform.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground transition-opacity hover:opacity-75">
                        {t("sourceLink", { platform: platform.name })}
                      </a>
                    </p>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex flex-col items-start gap-3 rounded-3xl bg-highlight p-6 text-highlight-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-lg font-semibold">{t("ctaTitle")}</p>
              <p className="text-sm text-highlight-foreground/80">{t("ctaBody")}</p>
            </div>
            <Link href="/signup?from=video-checker" className={cn(buttonVariants({ size: "lg" }), "shrink-0 rounded-full px-7")}>
              {t("cta")} <ArrowRight className="rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

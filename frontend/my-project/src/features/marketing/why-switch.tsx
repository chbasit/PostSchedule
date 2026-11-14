import { useFormatter, useTranslations } from "next-intl";
import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/providers/catalog";
import socialApps from "@/assets/images/landing/social-apps.webp";
import videoEditing from "@/assets/images/landing/video-editing.webp";

// "Why switch" (founder's call, 2026-11-14): on white, cards in the brand's pastels inside a
// thin white frame, medium-weight type, and two real photos (Unsplash License, see
// src/assets/images/landing/CREDITS.md). Every number is a fact about the product anyone can
// check: platforms, one-click fixes, the trial, no watermarks. No customer results: we have
// none to quote (DECISIONS.md, honesty rule).

function Card({ tint, className, children }: { tint: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-3xl bg-card p-1.5 ring-1 ring-border", className)}>
      <div className={cn("flex h-full flex-col overflow-hidden rounded-[1.2rem] p-6 text-forest md:p-8", tint)}>{children}</div>
    </div>
  );
}

function Fact({ value, label, body }: { value: string; label: string; body: string }) {
  return (
    <div>
      <p className="tabular font-heading text-5xl font-medium tracking-tight md:text-6xl">{value}</p>
      <p className="mt-3 text-lg font-medium md:text-xl">{label}</p>
      <p className="mt-2 max-w-md text-sm text-forest/80 md:text-base">{body}</p>
    </div>
  );
}

function Photo({ src, alt, className }: { src: StaticImageData; alt: string; className?: string }) {
  return <Image src={src} alt={alt} sizes="(min-width: 1024px) 40vw, 100vw" className={cn("w-full rounded-xl object-cover", className)} />;
}

export function WhySwitch() {
  const t = useTranslations("marketing.home.facts");
  const format = useFormatter();
  const platforms = format.list(
    PLATFORMS.map((p) => p.name),
    { type: "conjunction" },
  );
  return (
    <section aria-labelledby="facts-title" className="py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-8">
        <p className="mx-auto w-fit rounded-full bg-card px-3.5 py-1.5 text-sm font-medium ring-1 ring-border">{t("eyebrow")}</p>
        <h2 id="facts-title" className="display mx-auto mt-5 max-w-3xl text-center text-3xl text-balance sm:text-4xl md:text-5xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-balance text-muted-foreground sm:text-lg">{t("sub")}</p>

        <div className="mt-10 grid gap-4 md:mt-12 lg:grid-cols-3">
          <Card tint="bg-card-lavender" className="lg:col-span-2">
            <div className="grid h-full items-center gap-6 sm:grid-cols-2">
              <Fact value={t("platforms.value", { count: PLATFORMS.length })} label={t("platforms.label")} body={t("platforms.body", { platforms })} />
              <Photo src={socialApps} alt={t("platforms.photo")} className="aspect-[4/3]" />
            </div>
          </Card>
          <Card tint="bg-card-aqua" className="lg:row-span-2">
            <Fact value={t("fix.value")} label={t("fix.label")} body={t("fix.body")} />
            <Photo src={videoEditing} alt={t("fix.photo")} className="mt-6 aspect-[4/3] lg:mt-auto lg:aspect-[4/5]" />
          </Card>
          <Card tint="bg-card-salmon">
            <Fact value={t("trial.value", { days: TRIAL_DAYS })} label={t("trial.label")} body={t("trial.body")} />
          </Card>
          <Card tint="bg-card-yellow">
            <Fact value={t("watermark.value")} label={t("watermark.label")} body={t("watermark.body")} />
          </Card>
        </div>
      </div>
    </section>
  );
}

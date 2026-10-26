import { useTranslations } from "next-intl";
import calendar from "@/assets/clips/calendar.webp";
import compose from "@/assets/clips/compose.webp";
import home from "@/assets/clips/home.webp";
import previews from "@/assets/clips/previews.webp";
import tools from "@/assets/clips/tools.webp";
import { ViewportVideo } from "./viewport-video";

// Screen recordings of the sample workspace, made by scripts/clips (see its README). The MP4s
// live in public/clips with a smaller copy for phones; each poster is the clip's first
// frame, imported so its URL carries a content hash.
const POSTERS = { compose, previews, calendar, home, tools } as const;

export type ClipName = keyof typeof POSTERS;

export function Clip({ name, className }: { name: ClipName; className?: string }) {
  const t = useTranslations("marketing.home.clips");
  const poster = POSTERS[name];
  return (
    <ViewportVideo
      src={`/clips/${name}.mp4`}
      smallSrc={`/clips/${name}-sm.mp4`}
      poster={poster.src}
      width={poster.width}
      height={poster.height}
      label={t(name)}
      className={className}
    />
  );
}

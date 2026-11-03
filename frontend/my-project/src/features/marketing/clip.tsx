import { useTranslations } from "next-intl";
import calendar from "@/assets/images/posters/calendar.webp";
import compose from "@/assets/images/posters/compose.webp";
import home from "@/assets/images/posters/home.webp";
import previews from "@/assets/images/posters/previews.webp";
import tools from "@/assets/images/posters/tools.webp";
import { ViewportVideo } from "./viewport-video";

// Screen recordings of the sample workspace, made by scripts/clips (see its README). The MP4s
// live in public/videos with a smaller copy for phones; each poster is the clip's first
// frame, imported so its URL carries a content hash.
const POSTERS = { compose, previews, calendar, home, tools } as const;

export type ClipName = keyof typeof POSTERS;

export function Clip({ name, className }: { name: ClipName; className?: string }) {
  const t = useTranslations("marketing.home.clips");
  const poster = POSTERS[name];
  return (
    <ViewportVideo
      src={`/videos/${name}.mp4`}
      smallSrc={`/videos/${name}-sm.mp4`}
      poster={poster.src}
      width={poster.width}
      height={poster.height}
      label={t(name)}
      className={className}
    />
  );
}

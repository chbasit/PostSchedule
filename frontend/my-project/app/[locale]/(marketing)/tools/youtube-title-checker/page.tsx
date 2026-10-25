import { TITLE_LIMIT } from "@/lib/tools/title";
import { toolMetadata } from "@/features/tools/metadata";
import { ToolPage } from "@/features/tools/tool-page";
import { YouTubeTitleChecker } from "@/features/tools/youtube-title-checker";

export async function generateMetadata() {
  return toolMetadata("youtubeTitle");
}

export default function YouTubeTitleCheckerPage() {
  return (
    <ToolPage toolKey="youtubeTitle" values={{ limit: TITLE_LIMIT }}>
      <YouTubeTitleChecker />
    </ToolPage>
  );
}

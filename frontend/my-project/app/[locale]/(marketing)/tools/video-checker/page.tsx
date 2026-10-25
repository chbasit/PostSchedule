import { VideoChecker } from "@/features/preflight/video-checker";
import { toolMetadata } from "@/features/tools/metadata";
import { ToolPage } from "@/features/tools/tool-page";

export async function generateMetadata() {
  return toolMetadata("videoChecker");
}

export default function VideoCheckerPage() {
  return (
    <ToolPage toolKey="videoChecker">
      <VideoChecker />
    </ToolPage>
  );
}

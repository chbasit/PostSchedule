import { toolMetadata } from "@/features/tools/metadata";
import { ToolPage } from "@/features/tools/tool-page";
import { UsernameChecker } from "@/features/tools/username-checker";

export async function generateMetadata() {
  return toolMetadata("tiktokUsername");
}

export default function TikTokUsernamePage() {
  return (
    <ToolPage toolKey="tiktokUsername">
      <UsernameChecker platform="tiktok" />
    </ToolPage>
  );
}

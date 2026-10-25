import { toolMetadata } from "@/features/tools/metadata";
import { ToolPage } from "@/features/tools/tool-page";
import { UsernameChecker } from "@/features/tools/username-checker";

export async function generateMetadata() {
  return toolMetadata("instagramUsername");
}

export default function InstagramUsernamePage() {
  return (
    <ToolPage toolKey="instagramUsername">
      <UsernameChecker platform="instagram" />
    </ToolPage>
  );
}

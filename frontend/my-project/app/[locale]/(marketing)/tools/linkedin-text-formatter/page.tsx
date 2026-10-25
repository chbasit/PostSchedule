import { LinkedInFormatter } from "@/features/tools/linkedin-formatter";
import { toolMetadata } from "@/features/tools/metadata";
import { ToolPage } from "@/features/tools/tool-page";

export async function generateMetadata() {
  return toolMetadata("linkedinFormatter");
}

export default function LinkedInFormatterPage() {
  return (
    <ToolPage toolKey="linkedinFormatter">
      <LinkedInFormatter />
    </ToolPage>
  );
}

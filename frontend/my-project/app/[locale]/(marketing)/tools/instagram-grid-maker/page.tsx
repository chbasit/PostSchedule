import { GridMaker } from "@/features/tools/grid-maker";
import { toolMetadata } from "@/features/tools/metadata";
import { ToolPage } from "@/features/tools/tool-page";

export async function generateMetadata() {
  return toolMetadata("gridMaker");
}

export default function GridMakerPage() {
  return (
    <ToolPage toolKey="gridMaker">
      <GridMaker />
    </ToolPage>
  );
}

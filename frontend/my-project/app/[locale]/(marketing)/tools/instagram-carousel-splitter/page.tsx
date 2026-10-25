import { CarouselSplitter } from "@/features/tools/carousel-splitter";
import { toolMetadata } from "@/features/tools/metadata";
import { ToolPage } from "@/features/tools/tool-page";

export async function generateMetadata() {
  return toolMetadata("carouselSplitter");
}

export default function CarouselSplitterPage() {
  return (
    <ToolPage toolKey="carouselSplitter">
      <CarouselSplitter />
    </ToolPage>
  );
}

import { Composition } from "remotion";
import { DURATION, ProductVideo } from "./product-video";
import { FPS, HEIGHT, WIDTH } from "./theme";

export function Root() {
  return <Composition id="ProductVideo" component={ProductVideo} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />;
}

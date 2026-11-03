import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import type { ReactElement } from "react";
import { FEATURES } from "./content";
import { FeatureScene } from "./scenes/feature";
import { Intro } from "./scenes/intro";
import { Outro } from "./scenes/outro";
import { Platforms } from "./scenes/platforms";
import { FPS } from "./theme";

const TRANSITION = 15;

const SCENES: Array<{ id: string; frames: number; node: ReactElement }> = [
  { id: "intro", frames: 4 * FPS, node: <Intro /> },
  { id: "platforms", frames: Math.round(3.6 * FPS), node: <Platforms /> },
  ...FEATURES.map((feature, i) => ({ id: feature.clip, frames: Math.round(feature.seconds * FPS), node: <FeatureScene feature={feature} index={i + 1} /> })),
  { id: "outro", frames: 5 * FPS, node: <Outro /> },
];

// Scenes overlap during each transition, so the total is shorter than their sum.
export const DURATION = SCENES.reduce((sum, s) => sum + s.frames, 0) - TRANSITION * (SCENES.length - 1);

export function ProductVideo() {
  const timing = linearTiming({ durationInFrames: TRANSITION });
  return (
    <TransitionSeries>
      {SCENES.flatMap((scene, i) => {
        const items = [
          <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.frames}>
            {scene.node}
          </TransitionSeries.Sequence>,
        ];
        const next = SCENES[i + 1];
        if (next) {
          // Slides between the product scenes, fades into and out of them.
          const slides = i >= 1 && next.id !== "outro";
          items.push(<TransitionSeries.Transition key={`${scene.id}-to-${next.id}`} presentation={slides ? slide({ direction: "from-right" }) : fade()} timing={timing} />);
        }
        return items;
      })}
    </TransitionSeries>
  );
}

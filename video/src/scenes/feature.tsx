import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CLIPS, type Feature } from "../content";
import { Check, ClipCard, DotGrid } from "../parts";
import { colors, fonts, weights } from "../theme";

// One feature: the words on the left, the real screen recording on the right.
export function FeatureScene({ feature, index }: { feature: Feature; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const card = spring({ frame: frame - 6, fps, config: { damping: 18, mass: 0.9 } });
  const portrait = CLIPS[feature.clip].height > CLIPS[feature.clip].width;
  const rise = (s: number, by = 30) => ({ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [by, 0])}px)` });

  return (
    <AbsoluteFill style={{ background: feature.surface }}>
      <DotGrid opacity={0.13} mask="radial-gradient(ellipse 60% 80% at 20% 50%, black, transparent)" />
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 0,
          bottom: 0,
          width: portrait ? 860 : 600,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            alignSelf: "flex-start",
            padding: "8px 18px",
            borderRadius: 99,
            background: "rgba(255,255,255,0.7)",
            fontFamily: fonts.heading,
            fontWeight: weights.title,
            fontSize: 26,
            color: colors.foreground,
            ...rise(enter(0), 16),
          }}
        >
          {String(index).padStart(2, "0")}
        </span>
        <h2
          style={{
            margin: "28px 0 0",
            fontFamily: fonts.heading,
            fontWeight: weights.headline,
            fontSize: 72,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            color: colors.foreground,
            ...rise(enter(4)),
          }}
        >
          {feature.title}
        </h2>
        <p style={{ margin: "28px 0 0", fontFamily: fonts.text, fontSize: 32, lineHeight: 1.4, color: "rgba(17,18,20,0.75)", ...rise(enter(12)) }}>{feature.body}</p>
        <ul style={{ margin: "36px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 18 }}>
          {feature.points.map((point, i) => (
            <li key={point} style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: fonts.text, fontWeight: 500, fontSize: 28, color: colors.foreground, ...rise(enter(22 + i * 6), 20) }}>
              <Check size={34} />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div
        style={{
          position: "absolute",
          right: portrait ? 200 : 100,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          opacity: card,
          transform: `translateX(${interpolate(card, [0, 1], [140, 0])}px) scale(${interpolate(card, [0, 1], [0.94, 1])})`,
        }}
      >
        <ClipCard clip={feature.clip} width={portrait ? 540 : 1080} playbackRate={feature.playbackRate} />
      </div>
    </AbsoluteFill>
  );
}

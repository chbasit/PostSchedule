import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HEADLINE, PRODUCT, SUB } from "../content";
import { DotGrid, Logo } from "../parts";
import { colors, fonts, weights } from "../theme";

// The promise: the mark springs in, the name follows, then the headline word by word.
export function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const name = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  const sub = spring({ frame: frame - 62, fps, config: { damping: 200 } });
  const words = HEADLINE.split(" ");

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(55% 70% at 0% 0%, ${colors.lavender}, transparent 70%), radial-gradient(45% 60% at 100% 10%, ${colors.pink}, transparent 70%), radial-gradient(50% 60% at 60% 110%, ${colors.aqua}, transparent 70%), #fff`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <DotGrid opacity={0.1} />
      <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `scale(${0.6 + 0.4 * logo})`, opacity: logo }}>
        <Logo size={112} />
        <span
          style={{
            fontFamily: fonts.heading,
            fontWeight: weights.title,
            fontSize: 72,
            letterSpacing: "-0.03em",
            color: colors.foreground,
            opacity: name,
            transform: `translateX(${interpolate(name, [0, 1], [-24, 0])}px)`,
          }}
        >
          {PRODUCT}
        </span>
      </div>
      <h1
        style={{
          margin: "64px 0 0",
          maxWidth: 1500,
          textAlign: "center",
          fontFamily: fonts.heading,
          fontWeight: weights.headline,
          fontSize: 96,
          lineHeight: 1.04,
          letterSpacing: "-0.035em",
          color: colors.foreground,
        }}
      >
        {words.map((word, i) => {
          const s = spring({ frame: frame - 22 - i * 3, fps, config: { damping: 200 } });
          return (
            <span key={i} style={{ display: "inline-block", marginRight: "0.25em", opacity: s, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)` }}>
              {word}
            </span>
          );
        })}
      </h1>
      <p style={{ margin: "36px 0 0", fontFamily: fonts.text, fontSize: 38, color: "rgba(17,18,20,0.7)", opacity: sub, transform: `translateY(${interpolate(sub, [0, 1], [20, 0])}px)` }}>
        {SUB}
      </p>
    </AbsoluteFill>
  );
}

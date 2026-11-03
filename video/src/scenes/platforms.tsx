import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PLATFORMS } from "../content";
import { DotGrid, PlatformMark } from "../parts";
import { colors, fonts, weights } from "../theme";

// Every platform the app publishes to, popping in one after another.
export function Platforms() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame, fps, config: { damping: 200 } });
  const note = spring({ frame: frame - 40, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: colors.muted, alignItems: "center", justifyContent: "center" }}>
      <DotGrid opacity={0.12} />
      <h2
        style={{
          margin: 0,
          fontFamily: fonts.heading,
          fontWeight: weights.headline,
          fontSize: 84,
          letterSpacing: "-0.035em",
          color: colors.foreground,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [30, 0])}px)`,
        }}
      >
        One dashboard. Every platform.
      </h2>
      <div style={{ display: "flex", gap: 56, marginTop: 80 }}>
        {PLATFORMS.map((p, i) => {
          const s = spring({ frame: frame - 10 - i * 5, fps, config: { damping: 11, mass: 0.7 } });
          return (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: Math.min(1, s * 1.5), transform: `scale(${s})` }}>
              <PlatformMark id={p.id} size={150} style={{ boxShadow: "0 24px 50px rgba(17,18,20,0.18)" }} />
              <span style={{ fontFamily: fonts.text, fontWeight: 500, fontSize: 30, color: colors.foreground }}>{p.name}</span>
            </div>
          );
        })}
      </div>
      <p style={{ margin: "72px 0 0", fontFamily: fonts.text, fontSize: 36, color: "rgba(17,18,20,0.7)", opacity: note }}>
        Connect your personal and brand accounts once.
      </p>
    </AbsoluteFill>
  );
}

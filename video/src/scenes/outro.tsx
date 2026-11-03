import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DOMAIN, OFFER, PLATFORMS, PRODUCT } from "../content";
import { DotGrid, Logo, PlatformMark } from "../parts";
import { colors, fonts, weights } from "../theme";

// The call to action, on ink with the address in lavender, like the landing's dark plan card.
export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const rise = (s: number, by = 30) => ({ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [by, 0])}px)` });

  return (
    <AbsoluteFill style={{ background: colors.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, filter: "invert(1)" }}>
        <DotGrid opacity={0.1} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 22, ...rise(enter(0)) }}>
        <Logo size={84} />
        <span style={{ fontFamily: fonts.heading, fontWeight: weights.title, fontSize: 52, letterSpacing: "-0.03em", color: "#fff" }}>{PRODUCT}</span>
      </div>
      <h2 style={{ margin: "56px 0 0", fontFamily: fonts.heading, fontWeight: weights.headline, fontSize: 120, letterSpacing: "-0.04em", color: "#fff", ...rise(enter(8)) }}>
        Start free today
      </h2>
      <p style={{ margin: "28px 0 0", fontFamily: fonts.heading, fontWeight: weights.title, fontSize: 64, letterSpacing: "-0.02em", color: colors.lavender, ...rise(enter(16)) }}>{DOMAIN}</p>
      <p style={{ margin: "26px 0 0", fontFamily: fonts.text, fontSize: 34, color: "rgba(255,255,255,0.72)", ...rise(enter(24)) }}>{OFFER}</p>
      <div style={{ display: "flex", gap: 18, marginTop: 64, ...rise(enter(32), 20) }}>
        {PLATFORMS.map((p) => (
          <PlatformMark key={p.id} id={p.id} size={64} style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.25)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

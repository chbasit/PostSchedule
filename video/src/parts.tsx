import type { CSSProperties } from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";
import { CLIPS, DOMAIN, PLATFORMS, type ClipName } from "./content";
import { colors, fonts } from "./theme";

// The app's logo mark (frontend/my-project/src/assets/images/brand/logo-mark.png, copied by
// `npm run sync`), transparent so it works on the light and the ink scenes. size is its height.
export function Logo({ size }: { size: number }) {
  return <Img src={staticFile("logo-mark.png")} style={{ height: size, width: "auto" }} />;
}

// A platform's logo, white on its brand colour, as in the app's PlatformMark.
export function PlatformMark({ id, size, style }: { id: string; size: number; style?: CSSProperties }) {
  const p = PLATFORMS.find((x) => x.id === id)!;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: p.background ?? p.color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="currentColor">
        <path d={p.logo} />
      </svg>
    </div>
  );
}

// A screen recording in a window. Landscape clips get a slim browser bar with the address;
// the portrait preview clip sits in a phone-like card.
export function ClipCard({ clip, width, playbackRate }: { clip: ClipName; width: number; playbackRate: number }) {
  const meta = CLIPS[clip];
  const portrait = meta.height > meta.width;
  const height = Math.round((width * meta.height) / meta.width);
  return (
    <div
      style={{
        width,
        borderRadius: portrait ? 40 : 22,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 40px 90px rgba(17,18,20,0.22), 0 0 0 1px rgba(17,18,20,0.06)",
      }}
    >
      {portrait ? null : (
        <div style={{ height: 46, background: colors.muted, display: "flex", alignItems: "center", gap: 9, padding: "0 20px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 13, height: 13, borderRadius: 99, background: c }} />
          ))}
          <span
            style={{
              marginLeft: 18,
              flex: 1,
              maxWidth: 420,
              height: 28,
              borderRadius: 99,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              fontFamily: fonts.text,
              fontSize: 16,
              color: "rgba(17,18,20,0.6)",
            }}
          >
            {DOMAIN}/dashboard
          </span>
        </div>
      )}
      <OffthreadVideo src={staticFile(`clips/${clip}.mp4`)} playbackRate={playbackRate} muted style={{ width, height, display: "block" }} />
    </div>
  );
}

// The landing page's dotted texture, faded towards the edges.
export function DotGrid({ opacity = 0.14, mask = "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)" }: { opacity?: number; mask?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(rgba(17,18,20,${opacity}) 1.6px, transparent 1.6px)`,
        backgroundSize: "30px 30px",
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}

export function Check({ size }: { size: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke={colors.foreground} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

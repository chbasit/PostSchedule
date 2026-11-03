import { loadFont } from "@remotion/google-fonts/DMSans";

// The product's face and colours (frontend/my-project: app/[locale]/layout.tsx and
// app/globals.css), so the video looks like the site: DM Sans throughout, headlines in
// medium weight (500), names and titles in semibold (600).
const dmSans = loadFont("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;

export const fonts = { heading: dmSans, text: dmSans };

export const weights = { headline: 500, title: 600 };

export const colors = {
  ink: "#1d1e20",
  foreground: "#111214",
  muted: "#f4f4f5",
  sky: "#addaff",
  mint: "#90d788",
  aqua: "#a4f1e9",
  yellow: "#ffd88a",
  pink: "#fac3ff",
  salmon: "#ffb2a8",
  lavender: "#d4c2ff",
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";

// The public site's faces: DM Sans for text, Plus Jakarta Sans for headlines. Loaded by the
// marketing layout only, so the app keeps Inter and does not download these.
const text = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-site-text", display: "swap" });
const heading = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-site-heading", display: "swap" });

// Defines both variables and switches the font stacks (see .site-fonts in globals.css).
export const SITE_FONTS = `${text.variable} ${heading.variable} site-fonts`;

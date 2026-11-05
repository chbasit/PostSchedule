// Tailwind runs as a PostCSS plugin, so both bundlers process the CSS the same way: Turbopack
// in `npm run dev` and webpack in `npm run build` (DECISIONS.md 2026-11-05).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

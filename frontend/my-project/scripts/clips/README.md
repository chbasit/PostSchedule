# Landing page clips

The videos on the landing page are screen recordings of the real app (the sample workspace
on the mock API, `NEXT_PUBLIC_MOCK_API=true`), made by these scripts. Re-run them when the
screens they show change. Build without that setting afterwards: a mock build saves nothing.

Needs Node 24 and Chrome. Set `CHROME_PATH` if Chrome is not at the default Windows path.
Nothing is installed; working files go to `.clips/` (ignored by git).

```sh
NEXT_PUBLIC_MOCK_API=true npm run build && npx next start -p 3100   # a production build on the sample data
node scripts/clips/samples.mjs                       # the clip and panorama the flows upload
node scripts/clips/record.mjs http://localhost:3100 compose
node scripts/clips/record.mjs http://localhost:3100 calendar
node scripts/clips/record.mjs http://localhost:3100 carousel
node scripts/clips/record.mjs http://localhost:3100 dashboard
node scripts/clips/encode.mjs --install              # or name clips: encode.mjs --install home
```

- **record.mjs** drives the app with a drawn cursor at 1440 × 900 CSS pixels and 1.5× device
  pixels, in slow motion (headless Chrome only captures about 8 frames a second at that
  size), and saves the frames with their times and named markers.
- **encode.mjs** crops, speeds up and joins parts of a recording as described in
  `clips.json`, encodes H.264 with WebCodecs and writes a standard MP4 (`mp4.mjs`): the
  full size, a `-sm` copy for phones and a WebP poster of the first frame.
- Parts can start at a marker, so a clip can loop from its most telling moment (the
  poster) instead of an empty screen.

The page side is `src/features/marketing/clip.tsx` (one entry per clip) and
`viewport-video.tsx` (plays while in view, pauses out of view, respects reduced motion and
data saving). If you add a clip, add its poster import there and its label under
`marketing.home.clips` in every locale.

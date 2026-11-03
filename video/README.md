# Product video

A 56-second product video (1920 × 1080, 30 fps, no sound) made with
[Remotion](https://www.remotion.dev): React components rendered frame by frame into an MP4.
It is a separate package, so nothing here is installed into the app.

The footage is the landing page's screen recordings of the real app
(`frontend/my-project/public/videos`, made by `frontend/my-project/scripts/clips`). Around them
are title cards in the site’s font (DM Sans) and colours.

```sh
npm install
npm run sync      # copy the clips and the platform logos from the app
npm run studio    # preview and scrub the video in the browser
npm run render    # writes out/agentiqsocial-product.mp4
```

## Changing it

- **Words, order and scene lengths:** `src/content.ts`. The headline and feature titles
  follow the landing page (`messages/en.json`).
- **Look of each scene:** `src/scenes/`. Shared pieces (logo, platform marks, the clip window)
  are in `src/parts.tsx`; fonts and colours in `src/theme.ts`.
- **New screens:** re-record the app's clips, then `npm run sync` and `npm run render`.
- **Music:** add an MP3 to `public/` and an `<Audio src={staticFile("music.mp3")} />` in
  `src/product-video.tsx`. Use a track you have the rights to.

Remotion is free for individuals and companies with up to 3 people; larger companies need a
Remotion company licence.

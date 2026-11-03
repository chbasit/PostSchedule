import assets from "./assets.json";
import { colors } from "./theme";

// Everything the video says. The words follow the landing page (messages/en.json); the clips
// are the landing page's screen recordings, copied by `npm run sync`.
export type ClipName = keyof typeof assets.clips;

export type Feature = {
  clip: ClipName;
  surface: string;
  title: string;
  body: string;
  points: string[];
  // Clips are sped up a little so each scene stays short; seconds is the scene length.
  playbackRate: number;
  seconds: number;
};

export const PRODUCT = "AgentiqSocial";
export const DOMAIN = "agentiqsocial.com";
export const HEADLINE = "Post to all your social accounts from one dashboard";
export const SUB = "Publish, schedule and manage every post in one place.";
// TRIAL_DAYS in frontend/my-project/src/lib/billing/plans.ts.
export const OFFER = "14-day Pro trial · No card needed";

export const FEATURES: Feature[] = [
  {
    clip: "compose",
    surface: colors.lavender,
    title: "Post to every platform at once",
    body: "Write your post once, pick your accounts, and publish everywhere with one click.",
    points: ["One caption for all, or one per platform", "Personal and brand accounts together", "Post now or schedule for later"],
    playbackRate: 1.5,
    seconds: 15.5,
  },
  {
    clip: "previews",
    surface: colors.pink,
    title: "See every platform before you post",
    body: "Phone previews show how each app will display your post, and video checks warn you before quality drops.",
    points: ["Crop and covered areas shown", "Ratio, resolution, bitrate, length and size checked", "A 9:16 copy in one click, original kept"],
    playbackRate: 1.25,
    seconds: 11,
  },
  {
    clip: "calendar",
    surface: colors.aqua,
    title: "Schedule posts in advance",
    body: "Plan your content calendar weeks ahead, and let every post go out on time.",
    points: ["Month, week and list views", "Drag a post to another day", "Open any post to see every detail"],
    playbackRate: 1.25,
    seconds: 10,
  },
  {
    clip: "home",
    surface: colors.salmon,
    title: "Manage all your content in one place",
    body: "See what goes out next, what was published, and anything that needs you today.",
    points: ["Scheduled and published posts together", "Failed posts flagged, with a retry", "This week's numbers at a glance"],
    playbackRate: 1.15,
    seconds: 9.5,
  },
];

export const PLATFORMS = assets.platforms;
export const CLIPS = assets.clips;

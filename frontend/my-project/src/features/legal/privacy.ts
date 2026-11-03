import { PRODUCT_DOMAIN, PRODUCT_NAME, SUPPORT_EMAIL } from "@/config/site";
import { mailLink } from "./inline";
import type { LegalDocument } from "./types";

const EMAIL = mailLink(SUPPORT_EMAIL);

export const privacy: LegalDocument = {
  updated: "2026-11-02",
  intro: [
    `This policy explains what ${PRODUCT_NAME} collects when you use ${PRODUCT_DOMAIN}, why we collect it, who we share it with, and how you can see, export or delete it.`,
    "We do not sell your personal data, we do not use it for advertising, and we do not use your content to train AI models.",
  ],
  sections: [
    {
      id: "who-we-are",
      heading: "Who we are",
      blocks: [
        `${PRODUCT_NAME} ("we", "us") is a social media management service run from Pakistan. It lets you plan, preview, schedule and publish posts to the social accounts you connect, and see how they perform.`,
        `For any privacy question or request, email ${EMAIL}.`,
      ],
    },
    {
      id: "what-we-collect",
      heading: "What we collect",
      blocks: [
        [
          "Account details: your name, email address and password. Passwords are stored only as a secure hash. If you sign in with Google, we receive your name, email address and profile picture from Google.",
          "Your preferences: language, time zone and display theme.",
          "Workspace content: the posts, captions, photos, videos, schedules, tags, comments and approvals you create, and the names, email addresses and roles of the team members you invite.",
          "Connected social accounts: when you connect an account, the platform gives us an access token and basic profile details, such as the account ID, name, username and profile picture, and the pages or channels you choose. With your permission we also read post and account statistics, such as views, reach, likes, comments and followers, to show your insights.",
          "Bluesky: your handle and the app password you create for us.",
          "Billing: your plan, billing status, country and invoice history. Payments are handled by Lemon Squeezy; we never see or store your full card number.",
          "AI features: the prompts you write and the text and images you ask us to create.",
          "Technical data: IP address, browser and device type, and logs of errors and sign-in attempts, which we need to run the service and keep it secure.",
        ],
        "Our free tools work inside your browser. The files and text you use in them are not uploaded to us.",
      ],
    },
    {
      id: "how-we-use",
      heading: "How we use it",
      blocks: [
        [
          "To run the service: publish your posts at the time you choose, show previews and quality checks, and show your accounts' insights.",
          "To sign you in, keep your account secure and prevent abuse.",
          "To bill you for your plan.",
          "To send you service emails, such as sign-in codes, failed-post alerts and billing notices.",
          "To answer your support requests and to find and fix problems.",
        ],
        "We do not sell your data, we do not show you ads based on it, and we do not use your content, your platform data or your AI prompts to train AI models.",
      ],
    },
    {
      id: "platform-data",
      heading: "Data from social platforms",
      blocks: [
        "We use only each platform's official API. We use the data a platform gives us only to provide the features you asked for: publishing, showing your accounts and showing insights. We do not sell it, give it to data brokers or use it for advertising. Access tokens are encrypted when stored, and we never write them to logs.",
        "YouTube: our YouTube features use YouTube API Services. By connecting a YouTube channel you agree to the [YouTube Terms of Service](https://www.youtube.com/t/terms). Google's handling of your data is covered by the [Google Privacy Policy](https://policies.google.com/privacy). You can remove our access at any time on the [Google security settings page](https://myaccount.google.com/permissions).",
        `Google: ${PRODUCT_NAME}'s use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.`,
        "Facebook, Instagram, TikTok, LinkedIn and Bluesky: when you publish, we send your post to the platform, and that platform's own privacy policy applies to it there. You can remove our access in each platform's settings; the [data deletion page](/data-deletion) explains how.",
      ],
    },
    {
      id: "sharing",
      heading: "Who we share it with",
      blocks: [
        "We share data only with the service providers that help us run the service, and only what each one needs:",
        [
          "Supabase: database, sign-in and file storage.",
          "Cloudflare (R2): storage for your photos and videos.",
          "Inngest: running scheduled jobs, so posts go out at the right time.",
          "Lemon Squeezy: payments, invoices and tax.",
          "Resend: sending emails.",
          "OpenAI or Google (Gemini): only when you use an AI feature, and only the prompt and files that request needs.",
          "Our hosting provider, which runs the website and the app.",
        ],
        "We also send your posts to the social platforms you choose when you publish. We may disclose data if the law requires it, or to protect the safety and rights of our users or of us. If our business is sold or merged, your data would move with it, and we would tell you first.",
      ],
    },
    {
      id: "storage",
      heading: "Where your data is stored",
      blocks: [
        "Our service providers may store and process data outside Pakistan, for example in the United States or the European Union. We choose providers that protect data with strong security and contractual safeguards.",
      ],
    },
    {
      id: "retention",
      heading: "How long we keep it",
      blocks: [
        [
          "Your account data and workspace content: for as long as your account is open.",
          "Posts and media you delete: removed from the service when you delete them.",
          "Access tokens of a social account you remove: deleted straight away.",
          "When you delete your account: your data is deleted within 30 days, and backup copies are overwritten within a further 30 days.",
          "Billing records: for as long as tax and accounting law requires.",
          "Logs: for a short time, only as long as needed for security and fixing problems.",
        ],
      ],
    },
    {
      id: "security",
      heading: "How we protect it",
      blocks: [
        "All traffic uses HTTPS. Access tokens and app passwords are encrypted when stored. Each workspace's data is kept separate, and only members of a workspace can see it. Only the people who run the service can reach the systems behind it. No system is perfectly secure, so we will tell you promptly if a breach affects your data.",
      ],
    },
    {
      id: "your-rights",
      heading: "Your rights and choices",
      blocks: [
        `You can ask to see, correct, export or delete your data, or object to how we use it. Email ${EMAIL} from the address on your account. We may ask you to confirm it is you, and we will reply within 30 days.`,
        "Depending on where you live, for example in the European Union, the United Kingdom or California, you may have more rights under local law, including the right to complain to your data protection authority.",
        "You can remove a connected account or delete posts and media yourself at any time. The [data deletion page](/data-deletion) shows how.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      blocks: [
        "We use only the cookies and browser storage the service needs: to keep you signed in, and to remember your language, theme, current workspace and the notices you have closed. We do not use advertising cookies or track you across other websites. If we add analytics, we will update this policy first and ask for your consent where the law requires it.",
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        `${PRODUCT_NAME} is for businesses and people aged 18 or over. We do not knowingly collect data from children. If you think a child has given us data, email ${EMAIL} and we will delete it.`,
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        'When we change this policy, we update the "last updated" date above. For important changes, we will tell you by email or in the app before they take effect.',
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [`Questions or requests about your data: ${EMAIL}.`],
    },
  ],
};

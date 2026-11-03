import { PRODUCT_DOMAIN, PRODUCT_NAME, SUPPORT_EMAIL } from "@/config/site";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { mailLink } from "./inline";
import type { LegalDocument } from "./types";

const EMAIL = mailLink(SUPPORT_EMAIL);

export const terms: LegalDocument = {
  updated: "2026-11-02",
  intro: [
    `These terms are the agreement between you and ${PRODUCT_NAME} ("we", "us") for using ${PRODUCT_DOMAIN}, the app and our free tools. By creating an account or using the service, you accept them. Please also read our [privacy policy](/privacy).`,
  ],
  sections: [
    {
      id: "account",
      heading: "Your account",
      blocks: [
        [
          "You must be 18 or over to create an account.",
          "If you use the service for a company or a client, you confirm you are allowed to accept these terms for them, and \"you\" includes them.",
          "Give accurate details, keep your password safe, and tell us straight away if you think someone else is using your account.",
          "You are responsible for what happens in your workspaces. Workspace owners and admins decide who joins and what each member can do.",
        ],
      ],
    },
    {
      id: "platforms",
      heading: "Connected social accounts",
      blocks: [
        "You may connect only accounts you own or are allowed to manage. We connect through each platform's official API, and that platform's own rules also apply to what you post there:",
        [
          "YouTube: by connecting a YouTube channel, you agree to be bound by the [YouTube Terms of Service](https://www.youtube.com/t/terms).",
          "Facebook and Instagram: the [Meta Terms of Service](https://www.facebook.com/terms.php) and [Instagram Terms of Use](https://help.instagram.com/581066165581870).",
          "TikTok: the [TikTok Terms of Service](https://www.tiktok.com/legal/terms-of-service).",
          "LinkedIn: the [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement).",
          "Bluesky: the [Bluesky Terms of Service](https://bsky.social/about/support/tos).",
        ],
        "Platforms can change or limit their APIs, and can reject a post. When that happens, a feature may stop working for that platform, and we cannot always prevent it.",
      ],
    },
    {
      id: "publishing",
      heading: "Scheduling and publishing",
      blocks: [
        "We publish your posts at the time you choose, try again when a platform has a short outage, and tell you when a post could not be published. We cannot promise that every post goes out exactly on time, for example when a platform is down, a connection has expired or a platform rejects the content. Our previews and checks help, but please review each post before you schedule it.",
      ],
    },
    {
      id: "content",
      heading: "Your content",
      blocks: [
        "You own the posts, captions, photos and videos you add. You give us permission to store, copy, process and convert them (for example to resize a video), and to send them to the platforms you choose, only so we can run the service for you. This permission ends when you delete the content or your account.",
        "You are responsible for your content and for having the rights to publish it. We do not claim ownership of it and we do not use it to train AI models.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "What you must not do",
      blocks: [
        [
          "Publish anything illegal, or content that harasses, threatens or promotes hate or violence.",
          "Send spam, or post misleading content or content that infringes someone else's rights.",
          "Pretend to be someone else, or connect accounts you are not allowed to manage.",
          "Break the rules of the platforms you publish to.",
          "Attack, overload, scrape or reverse engineer the service, upload malware, or get around plan limits or security.",
          "Resell or share access to the service without our written permission.",
        ],
        "We may remove content or suspend an account that breaks these rules.",
      ],
    },
    {
      id: "ai",
      heading: "AI features",
      blocks: [
        "AI-written captions and AI images can be wrong, or similar to things others have made. Review them before you publish; you are responsible for what you post. What you send to an AI feature is shared with our AI provider only to create the result, as our [privacy policy](/privacy) explains.",
      ],
    },
    {
      id: "billing",
      heading: "Plans and payment",
      blocks: [
        [
          "Plans and prices are listed on our [pricing page](/pricing). Prices are in US dollars, and taxes may be added at checkout.",
          `Paid plans start with a ${TRIAL_DAYS}-day trial, with no card needed.`,
          "Payments are handled by Lemon Squeezy, our reseller and merchant of record. Its buyer terms also apply to your purchase.",
          "Subscriptions renew automatically until you cancel. You can cancel at any time; you keep your plan until the end of the period you paid for, then move to the Free plan.",
          "When you move to a smaller plan, nothing is deleted. Items above the new plan's limits become read-only.",
          "We will tell you at least 30 days before a price change affects you. Price locks promised in an offer are kept for the period stated in that offer.",
          `If you think you were charged by mistake, email ${EMAIL} and we will look into it.`,
        ],
      ],
    },
    {
      id: "free",
      heading: "Free plan and free tools",
      blocks: [
        "The Free plan and our free tools are offered as they are, and we may change or limit them.",
      ],
    },
    {
      id: "changes-to-service",
      heading: "Changes to the service",
      blocks: [
        "We improve the service all the time, so features may change. If we remove a major paid feature, we will tell you in advance. We sometimes need short maintenance windows, and we try to keep them rare.",
      ],
    },
    {
      id: "ending",
      heading: "Closing your account",
      blocks: [
        "You can stop using the service at any time. To delete your account and its data, follow our [data deletion page](/data-deletion).",
        "We may suspend or close your account if you break these terms, do not pay, or if the law requires it. Where it is reasonable, we will warn you first and give you time to export your content. After an account is closed, its data is deleted as our [privacy policy](/privacy) describes.",
      ],
    },
    {
      id: "disclaimer",
      heading: "No guarantees",
      blocks: [
        "The service is provided \"as is\". To the extent the law allows, we do not promise that it will be free of errors or always available, or that it will bring you any particular reach, followers or sales.",
      ],
    },
    {
      id: "liability",
      heading: "Limit of our liability",
      blocks: [
        "To the extent the law allows, we are not liable for indirect or consequential losses, such as lost profits, lost data or lost business, and our total liability for any claim is limited to the amount you paid us in the 12 months before the event that led to it. Nothing in these terms limits any liability that cannot be limited by law.",
        "You agree to cover our reasonable costs if someone makes a claim against us because of your content or because you broke these terms.",
      ],
    },
    {
      id: "law",
      heading: "Governing law",
      blocks: [
        "These terms are governed by the laws of Pakistan, and the courts of Pakistan handle any dispute. If you are a consumer, you keep any protection that the law of your own country gives you and that cannot be waived.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      blocks: [
        'When we change these terms, we update the "last updated" date above. For important changes, we will tell you by email or in the app at least 30 days before they take effect. If you keep using the service after that, you accept the new terms.',
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [`Questions about these terms: ${EMAIL}.`],
    },
  ],
};

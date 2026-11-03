import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/config/site";
import { mailLink } from "./inline";
import type { LegalDocument } from "./types";

const EMAIL = mailLink(SUPPORT_EMAIL);

// Meta's "data deletion instructions URL" points here, so keep the steps accurate to the app.
export const dataDeletion: LegalDocument = {
  updated: "2026-11-02",
  intro: [
    `This page explains how to delete your data from ${PRODUCT_NAME}, including the data we receive from Facebook, Instagram, TikTok, YouTube, LinkedIn and Bluesky, and how to remove our access on each platform.`,
  ],
  sections: [
    {
      id: "remove-account",
      heading: "Remove one connected account",
      blocks: [
        [
          "Sign in and go to Settings, then Accounts.",
          "Next to the account, choose Remove account and confirm.",
        ],
        "The account's access tokens are deleted straight away, and its scheduled posts will not be published. Posts it already published stay in your workspace until you delete them or your account. Only workspace owners and admins can remove accounts.",
      ],
    },
    {
      id: "delete-content",
      heading: "Delete posts and media",
      blocks: [
        "Open All posts and choose Delete on any post. To delete an AI image, open AI Studio, find it in your library and choose Delete. Deleted posts and images are removed from the service.",
      ],
    },
    {
      id: "delete-everything",
      heading: "Delete your whole account",
      blocks: [
        `Email ${EMAIL} from the address on your account, with the subject "Delete my account". We may ask you to confirm it is you. Within 30 days we delete:`,
        [
          "your account and profile;",
          "the workspaces you own, with their posts, photos, videos, tags and invites;",
          "every connected social account and its access tokens, including the data we received from each platform;",
          "your AI images.",
        ],
        "Backup copies are overwritten within a further 30 days. We keep billing records only as long as tax law requires. Content in a workspace someone else owns belongs to that workspace; ask its owner to remove it.",
      ],
    },
    {
      id: "revoke-access",
      heading: "Remove our access on the platform",
      blocks: [
        "You can also take back our access from the platform itself. This stops us from reading or posting to that account. To delete the data we already hold, also follow the steps above.",
        [
          `Facebook: Settings and privacy, then Settings, then Apps and websites (or Business integrations). Select ${PRODUCT_NAME} and remove it.`,
          `Instagram: Settings, then Website permissions, then Apps and websites. Select ${PRODUCT_NAME} and remove it.`,
          `YouTube and Google: open the [Google security settings page](https://myaccount.google.com/permissions), choose ${PRODUCT_NAME} and remove its access.`,
          `TikTok: Settings and privacy, then Security and permissions, then the apps with access to your account. Select ${PRODUCT_NAME} and remove it.`,
          `LinkedIn: Settings, then Data privacy, then Permitted services. Remove ${PRODUCT_NAME}.`,
          `Bluesky: Settings, then Privacy and security, then App passwords. Delete the app password you created for ${PRODUCT_NAME}.`,
        ],
        "Platforms move these menus from time to time, so the names may differ slightly.",
      ],
    },
    {
      id: "contact",
      heading: "Questions",
      blocks: [`If anything here does not work for you, email ${EMAIL} and we will help.`],
    },
  ],
};

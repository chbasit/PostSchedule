import { dataDeletion } from "./data-deletion";
import { privacy } from "./privacy";
import { terms } from "./terms";
import type { LegalDocument } from "./types";

// The legal pages (FRONTEND.md §6). The footer and the sitemap read this list.
export const LEGAL_PAGES = [
  { key: "privacy", href: "/privacy", doc: privacy },
  { key: "terms", href: "/terms", doc: terms },
  { key: "dataDeletion", href: "/data-deletion", doc: dataDeletion },
] as const satisfies readonly { key: string; href: string; doc: LegalDocument }[];

export type LegalKey = (typeof LEGAL_PAGES)[number]["key"];

export function getLegalPage(key: LegalKey) {
  const page = LEGAL_PAGES.find((p) => p.key === key);
  if (!page) throw new Error(`unknown_legal_page:${key}`);
  return page;
}

import type { CheckStatus } from "@/lib/preflight/rules";
import { youtube } from "@/providers/youtube/limits";

// Checks for the free YouTube title checker. The length limit and the forbidden angle
// brackets are YouTube's rules (VERIFY against the Data API's snippet.title); the rest are
// style tips, so they only warn.

export const TITLE_LIMIT = youtube.publishOptions?.title?.limit ?? 100;

export type TitleCheckId = "length" | "angleBrackets" | "caps" | "punctuation" | "spaces";
export type TitleCheck = { id: TitleCheckId; status: CheckStatus };

export function titleLength(title: string): number {
  return [...title].length;
}

export function cleanSpaces(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

// Share of capital letters among letters that have case (scripts without case are ignored).
function capsShare(title: string): { cased: number; share: number } {
  const cased = [...title].filter((ch) => ch.toLowerCase() !== ch.toUpperCase());
  const upper = cased.filter((ch) => ch === ch.toUpperCase());
  return { cased: cased.length, share: cased.length ? upper.length / cased.length : 0 };
}

export function checkTitle(title: string, limit = TITLE_LIMIT): TitleCheck[] {
  const caps = capsShare(title);
  return [
    { id: "length", status: titleLength(title) > limit ? "block" : "pass" },
    { id: "angleBrackets", status: /[<>]/.test(title) ? "block" : "pass" },
    { id: "caps", status: caps.cased >= 8 && caps.share > 0.6 ? "warn" : "pass" },
    { id: "punctuation", status: /([!?])\1{2,}/.test(title) ? "warn" : "pass" },
    { id: "spaces", status: title !== cleanSpaces(title) ? "warn" : "pass" },
  ];
}

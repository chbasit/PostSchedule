import { describe, expect, it } from "vitest";
import { SUPPORT_EMAIL } from "@/config/site";
import { parseInline } from "./inline";
import { LEGAL_PAGES } from "./registry";
import type { LegalDocument } from "./types";

const texts = (doc: LegalDocument) => [...doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.blocks.flat()])];
const links = (doc: LegalDocument) => texts(doc).flatMap((text) => parseInline(text).flatMap((seg) => (seg.href ? [seg.href] : [])));
const docOf = (key: string) => LEGAL_PAGES.find((p) => p.key === key)!.doc;

describe("parseInline", () => {
  it("splits text around [label](href) links", () => {
    expect(parseInline("Read the [terms](/terms) and [email us](mailto:a@b.c).")).toEqual([
      { text: "Read the " },
      { text: "terms", href: "/terms" },
      { text: " and " },
      { text: "email us", href: "mailto:a@b.c" },
      { text: "." },
    ]);
  });

  it("leaves text without links as one segment", () => {
    expect(parseInline("No links here (none).")).toEqual([{ text: "No links here (none)." }]);
  });
});

describe("legal pages", () => {
  it("give every section a unique anchor", () => {
    for (const { doc } of LEGAL_PAGES) {
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("link only to https, email or pages that exist", () => {
    const internal = new Set(["/pricing", ...LEGAL_PAGES.map((p) => p.href)]);
    for (const { doc } of LEGAL_PAGES) {
      for (const href of links(doc)) {
        expect(href.startsWith("https://") || href.startsWith("mailto:") || internal.has(href), href).toBe(true);
      }
    }
  });

  it("leave no broken link markup", () => {
    for (const { doc } of LEGAL_PAGES) {
      for (const text of texts(doc)) {
        for (const seg of parseInline(text)) expect(seg.href ? seg.text : seg.text.includes("]("), text).not.toBe(true);
      }
    }
  });

  // Google (YouTube API Services and the User Data Policy) and Meta reviewers look for these.
  it("keep the statements platform reviews require", () => {
    const privacy = links(docOf("privacy"));
    expect(privacy).toContain("https://policies.google.com/privacy");
    expect(privacy).toContain("https://myaccount.google.com/permissions");
    expect(privacy).toContain("https://developers.google.com/terms/api-services-user-data-policy");
    expect(texts(docOf("privacy")).join(" ")).toContain("Limited Use requirements");
    expect(links(docOf("terms"))).toContain("https://www.youtube.com/t/terms");
    for (const { doc } of LEGAL_PAGES) expect(links(doc)).toContain(`mailto:${SUPPORT_EMAIL}`);
  });
});

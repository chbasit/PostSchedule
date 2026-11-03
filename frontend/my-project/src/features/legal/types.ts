// A block is a paragraph, or a list when it is an array. Text may hold [label](href) links.
export type LegalBlock = string | readonly string[];

export type LegalSection = { id: string; heading: string; blocks: readonly LegalBlock[] };

// The legal text is English only, shown with a notice in other languages (DECISIONS.md
// 2026-11-02, TEST.md I18N-12). `updated` is the ISO date of the last change.
export type LegalDocument = { updated: string; intro: readonly string[]; sections: readonly LegalSection[] };

// Legal text marks links as [label](href): an https or mailto address, or a path on this site.
export type InlineSegment = { text: string; href?: string };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) out.push({ text: text.slice(last, match.index) });
    out.push({ text: match[1], href: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export const mailLink = (email: string) => `[${email}](mailto:${email})`;

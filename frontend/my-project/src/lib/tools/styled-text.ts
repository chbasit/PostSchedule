// "Bold" and "italic" for plain-text fields such as LinkedIn posts: Latin letters and digits
// swapped for their Unicode Mathematical Alphanumeric Symbols (sans-serif sets, which read
// best next to the feed's own font). Only A-Z, a-z and 0-9 have styled forms; accented
// letters and other scripts stay as they are. Underline and strikethrough are combining
// marks added after each character.

export type TextStyle = "bold" | "italic" | "boldItalic" | "mono";
export type TextMark = "underline" | "strike";

// First code point of each run: capital A, small a, digit zero (null: the set has no digits).
const BASES: Record<TextStyle, { upper: number; lower: number; digit: number | null }> = {
  bold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  italic: { upper: 0x1d608, lower: 0x1d622, digit: null },
  boldItalic: { upper: 0x1d63c, lower: 0x1d656, digit: null },
  mono: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
};

const MARKS: Record<TextMark, string> = { underline: "̲", strike: "̶" };
const ALL_MARKS = new RegExp(`[${Object.values(MARKS).join("")}]`, "gu");

// Styled code point -> [style, plain character].
const STYLED = new Map<number, [TextStyle, string]>();
for (const [style, base] of Object.entries(BASES) as Array<[TextStyle, (typeof BASES)[TextStyle]]>) {
  for (let i = 0; i < 26; i++) {
    STYLED.set(base.upper + i, [style, String.fromCharCode(65 + i)]);
    STYLED.set(base.lower + i, [style, String.fromCharCode(97 + i)]);
  }
  if (base.digit !== null) for (let i = 0; i < 10; i++) STYLED.set(base.digit + i, [style, String.fromCharCode(48 + i)]);
}

function styleChar(ch: string, style: TextStyle): string {
  const code = ch.charCodeAt(0);
  const base = BASES[style];
  if (code >= 65 && code <= 90) return String.fromCodePoint(base.upper + code - 65);
  if (code >= 97 && code <= 122) return String.fromCodePoint(base.lower + code - 97);
  if (code >= 48 && code <= 57 && base.digit !== null) return String.fromCodePoint(base.digit + code - 48);
  return ch;
}

// Back to plain letters and digits; marks are kept.
export function unstyle(text: string): string {
  let out = "";
  for (const ch of text) out += STYLED.get(ch.codePointAt(0)!)?.[1] ?? ch;
  return out;
}

// Plain letters and digits, no marks.
export function clearFormatting(text: string): string {
  return unstyle(text).replace(ALL_MARKS, "");
}

export function applyStyle(text: string, style: TextStyle): string {
  let out = "";
  for (const ch of unstyle(text)) out += styleChar(ch, style);
  return out;
}

// True when every styleable character already has this style (and there is at least one).
export function hasStyle(text: string, style: TextStyle): boolean {
  let seen = false;
  for (const ch of text) {
    const styled = STYLED.get(ch.codePointAt(0)!);
    if (styled) {
      if (styled[0] !== style) return false;
      seen = true;
    } else if (/[A-Za-z0-9]/.test(ch) && styleChar(ch, style) !== ch) {
      return false;
    }
  }
  return seen;
}

export function toggleStyle(text: string, style: TextStyle): string {
  return hasStyle(text, style) ? unstyle(text) : applyStyle(text, style);
}

export function hasMark(text: string, mark: TextMark): boolean {
  const chars = [...text.replace(ALL_MARKS, "")].filter((ch) => !/\s/.test(ch));
  const marks = [...text].filter((ch) => ch === MARKS[mark]).length;
  return chars.length > 0 && marks >= chars.length;
}

// Adds (or, when every character has it, removes) a mark after each visible character.
export function toggleMark(text: string, mark: TextMark): string {
  const m = MARKS[mark];
  const without = text.split(m).join("");
  if (hasMark(text, mark)) return without;
  let out = "";
  for (const ch of without) {
    out += ch;
    if (!/\s/.test(ch) && !Object.values(MARKS).includes(ch)) out += m;
  }
  return out;
}

export type ListKind = "bullet" | "number";
const BULLET = "• ";
const NUMBERED = /^\d+\.\s/;

// Starts (or removes) a list on every line the selection touches. Returns the new text and
// the selection covering the changed lines.
export function toggleList(text: string, start: number, end: number, kind: ListKind): { text: string; start: number; end: number } {
  const lineStart = start === 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  // A selection that ends right after a line break does not touch the next line.
  const last = end > start && text[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = text.indexOf("\n", last);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const isList = (line: string) => (kind === "bullet" ? line.startsWith(BULLET) : NUMBERED.test(line));
  const strip = (line: string) => line.replace(/^(• |\d+\.\s)/, "");
  const filled = lines.filter((l) => l.trim());
  const removing = filled.length > 0 && filled.every(isList);
  let n = 0;
  const changed = lines
    .map((line) => {
      if (removing) return strip(line);
      // Blank lines stay blank, unless there is nothing else (start a list on an empty line).
      if (!line.trim() && filled.length > 0) return line;
      n += 1;
      return (kind === "bullet" ? BULLET : `${n}. `) + strip(line);
    })
    .join("\n");
  const result = text.slice(0, lineStart) + changed + text.slice(lineEnd);
  return { text: result, start: lineStart, end: lineStart + changed.length };
}

// Characters counted conservatively, as UTF-16 units: styled letters count as two.
export function countUnits(text: string): number {
  return text.length;
}

import { describe, expect, it } from "vitest";
import { applyStyle, clearFormatting, countUnits, hasStyle, toggleList, toggleMark, toggleStyle, unstyle } from "./styled-text";

describe("styles", () => {
  it("maps letters and digits to the sans-serif sets", () => {
    expect(applyStyle("Bold 2026", "bold")).toBe("𝗕𝗼𝗹𝗱 𝟮𝟬𝟮𝟲");
    expect(applyStyle("Italic", "italic")).toBe("𝘐𝘵𝘢𝘭𝘪𝘤");
    expect(applyStyle("Both", "boldItalic")).toBe("𝘽𝙤𝙩𝙝");
    expect(applyStyle("Code 42", "mono")).toBe("𝙲𝚘𝚍𝚎 𝟺𝟸");
  });

  it("leaves accented letters, other scripts, emoji and punctuation alone", () => {
    expect(applyStyle("Café, ñ! مرحبا 🚀", "bold")).toBe("𝗖𝗮𝗳é, ñ! مرحبا 🚀");
  });

  it("italic has no digits, so they stay plain", () => {
    expect(applyStyle("Top 10", "italic")).toBe("𝘛𝘰𝘱 10");
  });

  it("switches style without stacking, and round-trips to plain", () => {
    const bold = applyStyle("Hello 5", "bold");
    expect(applyStyle(bold, "mono")).toBe("𝙷𝚎𝚕𝚕𝚘 𝟻");
    expect(unstyle(bold)).toBe("Hello 5");
  });

  it("toggles: a second press removes the style", () => {
    const once = toggleStyle("Launch day", "bold");
    expect(hasStyle(once, "bold")).toBe(true);
    expect(toggleStyle(once, "bold")).toBe("Launch day");
    // Partly bold text becomes fully bold first.
    expect(toggleStyle(`${applyStyle("Half", "bold")} plain`, "bold")).toBe("𝗛𝗮𝗹𝗳 𝗽𝗹𝗮𝗶𝗻");
  });
});

describe("marks", () => {
  it("underlines visible characters only, and a second press removes it", () => {
    const underlined = toggleMark("a b", "underline");
    expect(underlined).toBe("a̲ b̲");
    expect(toggleMark(underlined, "underline")).toBe("a b");
  });

  it("clears every style and mark", () => {
    const busy = toggleMark(applyStyle("Done", "bold"), "strike");
    expect(clearFormatting(busy)).toBe("Done");
  });
});

describe("toggleList", () => {
  it("bullets every selected line and skips blank ones", () => {
    const text = "Intro\nfirst\n\nsecond\nOutro";
    const start = text.indexOf("first");
    const end = text.indexOf("second") + "second".length;
    const r = toggleList(text, start, end, "bullet");
    expect(r.text).toBe("Intro\n• first\n\n• second\nOutro");
    expect(r.text.slice(r.start, r.end)).toBe("• first\n\n• second");
  });

  it("numbers lines and removes the list on a second press", () => {
    const numbered = toggleList("a\nb\nc", 0, 5, "number");
    expect(numbered.text).toBe("1. a\n2. b\n3. c");
    expect(toggleList(numbered.text, numbered.start, numbered.end, "number").text).toBe("a\nb\nc");
  });

  it("works on the line under the cursor when nothing is selected", () => {
    const text = "one\ntwo";
    expect(toggleList(text, 5, 5, "bullet").text).toBe("one\n• two");
  });

  it("starts a list in an empty box, and switches bullets to numbers", () => {
    expect(toggleList("", 0, 0, "bullet").text).toBe("• ");
    expect(toggleList("• a\n• b", 0, 7, "number").text).toBe("1. a\n2. b");
  });
});

describe("countUnits", () => {
  it("counts styled letters as two", () => {
    expect(countUnits("ab")).toBe(2);
    expect(countUnits(applyStyle("ab", "bold"))).toBe(4);
  });
});

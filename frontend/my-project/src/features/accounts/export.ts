"use client";

// Turns an account's insights into a CSV, a Markdown file or a printable page (saved as
// PDF from the print dialog, which handles every script and emoji). The caller passes
// translated, formatted text; this file only lays it out.

export type Report = {
  fileBase: string;
  locale: string;
  dir: "ltr" | "rtl";
  title: string;
  periodLine: string;
  exportedLine: string;
  summaryTitle: string;
  postsTitle: string;
  emptyPosts: string;
  headers: { metric: string; thisPeriod: string; previousPeriod: string; post: string; published: string; link: string };
  summary: Array<{ label: string; value: string; previous: string }>;
  columns: string[];
  // Spreadsheet headers, with units where the raw number needs one.
  rawColumns: string[];
  posts: Array<{
    caption: string;
    published: string;
    publishedIso: string;
    link: string | null;
    // Formatted for people (Markdown, PDF) and raw for spreadsheets (CSV).
    values: string[];
    raw: Array<number | null>;
  }>;
};

export function reportFileBase(name: string, platform: string, from: string, to: string) {
  const slug = `${name}-${platform}`
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "account"}-insights-${from}-to-${to}`;
}

function oneLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

// Quotes every field, and neutralises cells a spreadsheet would run as a formula.
function csvCell(value: string | number | null) {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(r: Report) {
  const head = [r.headers.post, r.headers.published, r.headers.link, ...r.rawColumns];
  const rows = r.posts.map((p) => [oneLine(p.caption), p.publishedIso, p.link, ...p.raw]);
  // The byte-order mark makes Excel read the file as UTF-8.
  return "﻿" + [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function mdCell(text: string) {
  return oneLine(text).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function mdTable(head: string[], rows: string[][]) {
  return [`| ${head.map(mdCell).join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(mdCell).join(" | ")} |`)].join("\n");
}

export function toMarkdown(r: Report) {
  const summary = mdTable(
    [r.headers.metric, r.headers.thisPeriod, r.headers.previousPeriod],
    r.summary.map((s) => [s.label, s.value, s.previous]),
  );
  const posts = r.posts.length
    ? mdTable(
        [r.headers.post, r.headers.published, ...r.columns],
        r.posts.map((p) => [p.link ? `[${mdCell(p.caption)}](${p.link})` : p.caption, p.published, ...p.values]),
      )
    : r.emptyPosts;
  return `# ${r.title}\n\n${r.periodLine}\n\n## ${r.summaryTitle}\n\n${summary}\n\n## ${r.postsTitle}\n\n${posts}\n\n_${r.exportedLine}_\n`;
}

function esc(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function toHtml(r: Report) {
  const th = (cells: string[]) => `<tr>${cells.map((c, i) => `<th class="${i ? "n" : ""}">${esc(c)}</th>`).join("")}</tr>`;
  const summary = r.summary.map((s) => `<tr><td>${esc(s.label)}</td><td class="n">${esc(s.value)}</td><td class="n">${esc(s.previous)}</td></tr>`).join("");
  const posts = r.posts
    .map(
      (p) =>
        `<tr><td><div class="cap">${esc(p.caption)}</div><div class="sub">${esc(p.published)}</div></td>${p.values.map((v) => `<td class="n">${esc(v)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<!doctype html><html lang="${esc(r.locale)}" dir="${r.dir}"><head><meta charset="utf-8"><title>${esc(r.fileBase)}</title><style>
@page { margin: 16mm; }
* { box-sizing: border-box; }
body { font: 12px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; color: #111214; margin: 0; }
h1 { font-size: 20px; margin: 0 0 4px; }
h2 { font-size: 14px; margin: 24px 0 8px; }
p { margin: 0; color: #44464b; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 6px 8px; border-bottom: 1px solid #e4e4e7; text-align: start; vertical-align: top; }
th { font-weight: 600; background: #f4f4f5; }
.n { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
.cap { max-width: 360px; }
.sub { color: #44464b; font-size: 11px; }
tr { break-inside: avoid; }
footer { margin-top: 24px; color: #44464b; font-size: 11px; }
</style></head><body>
<h1>${esc(r.title)}</h1><p>${esc(r.periodLine)}</p>
<h2>${esc(r.summaryTitle)}</h2>
<table><thead>${th([r.headers.metric, r.headers.thisPeriod, r.headers.previousPeriod])}</thead><tbody>${summary}</tbody></table>
<h2>${esc(r.postsTitle)}</h2>
${r.posts.length ? `<table><thead>${th([r.headers.post, ...r.columns])}</thead><tbody>${posts}</tbody></table>` : `<p>${esc(r.emptyPosts)}</p>`}
<footer>${esc(r.exportedLine)}</footer>
</body></html>`;
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Prints the report from a hidden frame, so the page itself is left alone.
export function printReport(r: Report) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return;
  }
  win.document.open();
  win.document.write(toHtml(r));
  win.document.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener("afterprint", cleanup, { once: true });
  // Give the frame a moment to lay out before the dialog opens.
  setTimeout(() => {
    win.focus();
    win.print();
    // Browsers without afterprint still clean up eventually.
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  }, 100);
}

// Fails when a locale has missing or extra keys, placeholders that differ from
// English, or invalid ICU syntax (TEST.md I18N-01). Usage: node scripts/check-messages.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { IntlMessageFormat } from "intl-messageformat";

const dir = join(import.meta.dirname, "..", "messages");
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]],
  );
// Top-level argument names ({name}, {count, plural, …}) and rich-text tags (<link>).
const tokens = (s) => {
  const out = new Set();
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") {
      if (depth === 0) out.add(`{${/^[\w]+/.exec(s.slice(i + 1))?.[0]}}`);
      depth++;
    } else if (s[i] === "}") depth--;
  }
  for (const m of s.matchAll(/<(\w+)>/g)) out.add(`<${m[1]}>`);
  return [...out].sort().join(" ");
};

const en = new Map(flatten(JSON.parse(readFileSync(join(dir, "en.json"), "utf8"))));
let problems = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const tag = file.replace(/\.json$/, "");
  for (const [k, v] of flatten(JSON.parse(readFileSync(join(dir, file), "utf8")))) {
    try {
      new IntlMessageFormat(v, tag);
    } catch (e) {
      console.error(`${file}: invalid ICU in ${k}: ${e.message}`);
      problems++;
    }
  }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const locale = new Map(flatten(JSON.parse(readFileSync(join(dir, file), "utf8"))));
  const missing = [...en.keys()].filter((k) => !locale.has(k));
  const extra = [...locale.keys()].filter((k) => !en.has(k));
  const mismatched = [...locale.entries()].filter(([k, v]) => en.has(k) && tokens(v) !== tokens(en.get(k)));
  for (const k of missing) console.error(`${file}: missing ${k}`);
  for (const k of extra) console.error(`${file}: extra ${k}`);
  for (const [k, v] of mismatched) console.error(`${file}: placeholders differ in ${k}: "${tokens(v)}" vs "${tokens(en.get(k))}"`);
  problems += missing.length + extra.length + mismatched.length;
  console.log(`${file}: ${locale.size}/${en.size} keys`);
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log("All locales match English.");

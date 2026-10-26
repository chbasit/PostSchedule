// Records a scripted session in the real app (sample workspace, mock API) as screencast
// frames plus a manifest of their times. A drawn cursor follows real mouse events, so hovers
// and clicks show. Usage: node scripts/clips/record.mjs <base url> <flow>
// Flows: compose, calendar, carousel, dashboard. Run `next build` + `next start` first.
//
// Slow motion: headless Chrome delivers only ~8 frames a second at 1.5x device pixels, so
// the page runs at 1/SLOW speed (CSS and Web Animations through the CDP Animation domain,
// media through playbackRate, the script's own pacing through wait()) and the manifest
// stores times divided back to normal speed. JavaScript timers are not slowed; the app uses
// one only for the dashboard count-up, which ends before recording starts.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launch, signIn, sleep, WORK } from "./chrome.mjs";

const [base, flowName] = process.argv.slice(2);
const SLOW = 4;
// Screencast frames only carry device pixels when Chrome itself runs at that scale; an
// emulated device scale factor still yields CSS-size frames.
const DSF = 1.5;
const VIEWPORT = [1440, 900];
const out = join(WORK, "rec", flowName ?? "");
const samples = join(WORK, "samples");
// Pause for `ms` of recorded (normal-speed) time.
const wait = (ms) => sleep(ms * SLOW);

const CURSOR = `(() => {
  if (document.getElementById("__demo-cursor")) return true;
  const c = document.createElement("div");
  c.id = "__demo-cursor";
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 19.5 12l-6.6 1.8-3.4 6.2z" fill="#111214" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none",
    transform: "translate(" + (window.__cx ?? innerWidth / 2) + "px," + (window.__cy ?? innerHeight / 2) + "px)",
    transition: "transform 0ms", filter: "drop-shadow(0 2px 3px rgb(0 0 0 / .25))" });
  const ring = document.createElement("div");
  ring.id = "__demo-ring";
  Object.assign(ring.style, { position: "fixed", left: "0", top: "0", width: "34px", height: "34px", margin: "-17px 0 0 -17px", borderRadius: "999px",
    background: "rgb(173 218 255 / .55)", border: "2px solid rgb(47 111 228 / .7)", zIndex: "2147483646", pointerEvents: "none", opacity: "0", transform: "scale(.4)" });
  document.body.append(ring, c);
  return true;
})()`;

// Media in the page plays at the same slowed rate as everything else.
const SLOW_MEDIA = `(() => {
  if (window.__slowMedia) return true;
  window.__slowMedia = true;
  const apply = (el) => { if (el instanceof HTMLMediaElement) { el.defaultPlaybackRate = ${1 / SLOW}; el.playbackRate = ${1 / SLOW}; } };
  document.querySelectorAll("video, audio").forEach(apply);
  for (const type of ["loadedmetadata", "play", "ratechange"]) document.addEventListener(type, (e) => { if (e.target.playbackRate !== ${1 / SLOW}) apply(e.target); }, true);
  return true;
})()`;

// Clean sample workspace: no reconnect banner, no lapsed post.
const TIDY = `(() => {
  const key = "ps_mock_db_v2";
  const db = JSON.parse(localStorage.getItem(key));
  for (const a of db.accounts) if (a.status === "needs_reconnect") a.status = "active";
  for (const p of db.posts) if (p.status === "lapsed") { p.status = "scheduled"; p.scheduledAt = new Date(Date.now() + 3 * 86400000 + 2 * 3600000).toISOString(); }
  db.notifications = db.notifications.filter((n) => n.kind !== "needs_reconnect");
  localStorage.setItem(key, JSON.stringify(db));
  return true;
})()`;

class Demo {
  constructor(page) {
    this.page = page;
    this.x = VIEWPORT[0] / 2;
    this.y = VIEWPORT[1] / 2;
    this.frames = [];
    this.markers = {};
  }
  // After every full page load: the slowed clock and the drawn cursor.
  async prepare() {
    await this.page.s.send("Animation.enable");
    await this.page.s.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW });
    await this.page.eval(SLOW_MEDIA);
    await this.page.eval(`(window.__cx = ${this.x}, window.__cy = ${this.y}, true)`);
    await this.page.eval(CURSOR);
  }
  async start() {
    this.page.s.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      this.frames.push({ data, t: metadata?.timestamp ?? Date.now() / 1000 });
      this.page.s.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    // Without a maximum the frames come at CSS size; this lets them keep the device pixels.
    await this.page.s.send("Page.startScreencast", { format: "jpeg", quality: 85, everyNthFrame: 1, maxWidth: 4000, maxHeight: 4000 });
  }
  async stop() {
    await wait(400);
    await this.page.s.send("Page.stopScreencast");
  }
  mark(name) {
    this.markers[name] = Date.now() / 1000;
  }
  // A CSS selector, or a JavaScript expression that yields an element.
  expr(selector) {
    return /^(document|\[\.\.\.|\(|window)/.test(selector) ? selector : `document.querySelector(${JSON.stringify(selector)})`;
  }
  async center(selector) {
    const box = await this.page.eval(`(() => { const el = ${this.expr(selector)}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    if (!box) throw new Error(`no element for ${selector}`);
    return box;
  }
  // Glides the cursor (and the real pointer, for hover styles) to a point. The CSS
  // transition runs on the slowed clock, so its duration stays in normal time.
  async moveTo(x, y, ms = 700) {
    await this.page.eval(`(() => { const c = document.getElementById("__demo-cursor"); if (!c) return false; c.style.transition = "transform ${ms}ms cubic-bezier(.22,.61,.36,1)"; c.style.transform = "translate(${x}px, ${y}px)"; window.__cx = ${x}; window.__cy = ${y}; return true; })()`);
    const steps = Math.max(6, Math.round(ms / 40));
    for (let i = 1; i <= steps; i++) {
      const e = 1 - Math.pow(1 - i / steps, 3);
      await this.page.s.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: this.x + (x - this.x) * e, y: this.y + (y - this.y) * e });
      await wait(ms / steps);
    }
    this.x = x;
    this.y = y;
  }
  async hover(selector, ms) {
    const p = await this.center(selector);
    await this.moveTo(p.x, p.y, ms);
  }
  async click(selector, ms = 700) {
    if (selector) await this.hover(selector, ms);
    await this.page.eval(`(() => { const r = document.getElementById("__demo-ring"); if (!r) return false; r.style.left = "${this.x}px"; r.style.top = "${this.y}px"; r.animate([{ opacity: 1, transform: "scale(.4)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: 450, easing: "ease-out" }); return true; })()`);
    await this.page.s.send("Input.dispatchMouseEvent", { type: "mousePressed", x: this.x, y: this.y, button: "left", clickCount: 1 });
    await wait(70);
    await this.page.s.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: this.x, y: this.y, button: "left", clickCount: 1 });
  }
  async drag(dx, dy, ms = 900) {
    await this.page.s.send("Input.dispatchMouseEvent", { type: "mousePressed", x: this.x, y: this.y, button: "left", clickCount: 1 });
    const steps = Math.round(ms / 40);
    const from = { x: this.x, y: this.y };
    for (let i = 1; i <= steps; i++) {
      const x = from.x + (dx * i) / steps;
      const y = from.y + (dy * i) / steps;
      await this.page.eval(`(() => { const c = document.getElementById("__demo-cursor"); c.style.transition = "transform 40ms linear"; c.style.transform = "translate(${x}px, ${y}px)"; return true; })()`);
      await this.page.s.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", buttons: 1 });
      await wait(40);
    }
    this.x = from.x + dx;
    this.y = from.y + dy;
    await this.page.s.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: this.x, y: this.y, button: "left", clickCount: 1 });
  }
  async type(text, perChar = 38) {
    for (const ch of text) {
      await this.page.s.send("Input.insertText", { text: ch });
      await wait(ch === " " ? perChar * 1.6 : perChar);
    }
  }
  async key(key, code, keyCode) {
    await this.page.s.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode });
    await this.page.s.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode });
  }
  // Scrolls an element in eased steps (native smooth scrolling would ignore the slow clock).
  // `top` is a number or an expression evaluated in the page.
  async scroll(selector, top, ms = 650) {
    const el = this.expr(selector);
    const from = await this.page.eval(`(${el}).scrollTop`);
    const to = typeof top === "number" ? top : await this.page.eval(top);
    const steps = Math.max(10, Math.round(ms / 30));
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      await this.page.eval(`((el) => { el.scrollTop = ${from + (to - from) * e}; return true; })(${el})`);
      await wait(ms / steps);
    }
  }
}

const textNode = (tag, text) => `[...document.querySelectorAll(${JSON.stringify(tag)})].find((el) => el.textContent.trim().startsWith(${JSON.stringify(text)}))`;
// The dashboard's scroll container.
const PANEL = `document.querySelector('main').parentElement`;

const flows = {
  // Write once, preview every platform, fix the crop, schedule.
  async compose(demo, page) {
    await page.goto("/en/dashboard/create", { settle: 600 });
    await page.waitFor(`!!document.querySelector('[data-testid="add-accounts"]')`, { label: "composer" });
    await demo.prepare();
    await demo.start();
    await wait(700);
    await demo.click('[data-testid="add-accounts"]', 800);
    await wait(500);
    for (const platform of ["Instagram", "TikTok", "YouTube"]) {
      await demo.click(`[data-radix-popper-content-wrapper] label:has([title="${platform}"])`, 450);
      await wait(250);
    }
    await wait(300);
    await demo.key("Escape", "Escape", 27);
    await wait(300);
    await demo.click('[data-testid="caption-main"]', 700);
    await demo.type("Behind the scenes of our autumn shoot. Three days, one van, a lot of coffee ☕", 28);
    await wait(300);
    await demo.hover(textNode("button", "Add photos"), 600);
    await wait(200);
    demo.mark("upload");
    await page.upload('main input[type="file"]', join(samples, "autumn-shoot.mp4"));
    await page.waitFor(`[...document.querySelectorAll('aside [role="tab"]')].length > 2 && !!document.querySelector('aside video')`, { label: "preview" });
    await wait(2000);
    demo.mark("previews");
    await demo.click(textNode('aside [role="tab"]', "TikTok"), 700);
    await wait(1300);
    await demo.click(textNode('aside [role="tab"]', "YouTube"), 600);
    await wait(1300);
    await demo.click(textNode('aside [role="tab"]', "Instagram"), 600);
    await wait(800);
    // Bring each platform's fix to the middle of the panel, then press it.
    demo.mark("fix");
    for (const id of ["instagram", "tiktok", "youtube"]) {
      const fix = `[...document.querySelectorAll('aside section[aria-labelledby="pf-${id}"] button')].find((b) => b.textContent.trim().startsWith("Make"))`;
      if (!(await page.eval(`!!(${fix})`))) continue;
      await demo.scroll(PANEL, `(() => { const p = ${PANEL}; const b = ${fix}; return p.scrollTop + b.getBoundingClientRect().top - p.getBoundingClientRect().top - p.clientHeight / 2; })()`, 700);
      await wait(150);
      await demo.click(fix, 550);
      await wait(650);
    }
    demo.mark("fixed");
    await demo.scroll(PANEL, 0, 900);
    await wait(900);
    demo.mark("schedule");
    await demo.click('[data-testid="schedule-post"]', 800);
    await page.waitFor(`document.body.innerText.includes("Your post is scheduled")`, { label: "scheduled" });
    demo.mark("scheduled");
    await wait(2400);
  },

  // Month and week views, and a post opened for its details.
  async calendar(demo, page) {
    await page.goto("/en/dashboard/posts/calendar", { settle: 800 });
    await page.waitFor(`!!${textNode("button", "Week")}`, { label: "calendar" });
    await demo.prepare();
    await demo.start();
    await wait(800);
    const posts = `[...document.querySelectorAll('main button[class*="border-s-"]')]`;
    await demo.hover(`${posts}[0]`, 800).catch(() => {});
    await wait(500);
    await demo.hover(`${posts}[2]`, 700).catch(() => {});
    await wait(500);
    demo.mark("week");
    await demo.click(textNode("button", "Week"), 800);
    await wait(1400);
    await demo.hover(`${posts}[1]`, 800).catch(() => {});
    await wait(400);
    demo.mark("open");
    await demo.click(`${posts}[1]`, 300).catch(() => {});
    await wait(2600);
    await demo.key("Escape", "Escape", 27);
    await wait(700);
    demo.mark("month");
    await demo.click(textNode("button", "Month"), 800);
    await wait(1400);
  },

  // The free carousel splitter, signed out.
  async carousel(demo, page) {
    await page.goto("/en/tools/instagram-carousel-splitter", { settle: 600 });
    await page.eval(`window.scrollTo(0, 300) || true`);
    await demo.prepare();
    await demo.start();
    await wait(600);
    await demo.hover("main button.group", 700);
    await wait(300);
    demo.mark("upload");
    // 7200 × 1500 fills six portrait slides exactly; five leaves room to slide sideways.
    await page.upload('input[type="file"]', join(samples, "panorama-wide.jpg"));
    await page.waitFor(`!!document.querySelector('canvas[role="img"]')`, { label: "strip" });
    demo.mark("strip");
    await wait(1300);
    await demo.click(`document.querySelector('[role="group"] button:first-of-type')`, 800);
    await wait(1000);
    await demo.hover(`document.querySelector('canvas[role="img"]')`, 700);
    await demo.drag(-150, 0, 1100);
    await wait(600);
    await demo.drag(260, 0, 1300);
    await wait(700);
    demo.mark("swipe");
    await demo.scroll("document.scrollingElement", "document.scrollingElement.scrollTop + 420", 900);
    await wait(300);
    for (let i = 0; i < 3; i++) {
      await demo.click(`document.querySelector('[aria-label="Next slide"]')`, i === 0 ? 800 : 300);
      await wait(650);
    }
    await wait(800);
  },

  // A look around the home screen.
  async dashboard(demo, page) {
    await page.goto("/en/dashboard", { settle: 1500 });
    await demo.prepare();
    await demo.start();
    await wait(900);
    await demo.hover(`document.querySelectorAll('main a[href*="/dashboard/posts"]')[0]`, 900);
    await wait(500);
    await demo.hover(`document.querySelectorAll('main a[href*="/dashboard/posts"]')[2]`, 700);
    await wait(500);
    await demo.hover(textNode("main button", "Retry"), 800);
    await wait(700);
    demo.mark("scroll");
    await demo.scroll(PANEL, 520, 900);
    await wait(1200);
    await demo.hover(`document.querySelector('main ul li button')`, 800).catch(() => {});
    await wait(900);
    await demo.scroll(PANEL, 0, 900);
    await wait(1100);
  },
};

const flow = flows[flowName];
if (!base || !flow) {
  console.error(`Usage: node scripts/clips/record.mjs <base url> <${Object.keys(flows).join(" | ")}>`);
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const { page, close } = await launch({
  base,
  profile: join(WORK, "profiles", `rec-${flowName}`),
  args: [`--force-device-scale-factor=${DSF}`, `--window-size=${VIEWPORT.join(",")}`],
});
try {
  await page.viewport(VIEWPORT[0], VIEWPORT[1], 0);
  if (flowName === "carousel") {
    await page.goto("/en", { settle: 200 });
  } else {
    await signIn(page);
    // Off the app (same origin, no scripts) so the mock cannot write its old copy back.
    await page.goto("/robots.txt", { settle: 200 });
    await page.eval(TIDY);
  }
  // Storage only exists once the page is on the app's origin.
  await page.theme("light");
  const demo = new Demo(page);
  await flow(demo, page);
  await demo.stop();
  const t0 = demo.frames[0]?.t ?? 0;
  // Back to normal speed: recorded seconds / SLOW.
  const frames = demo.frames.map((f, i) => {
    const file = `f${String(i).padStart(5, "0")}.jpg`;
    writeFileSync(join(out, file), Buffer.from(f.data, "base64"));
    return { file, t: +((f.t - t0) / SLOW).toFixed(4) };
  });
  const markers = Object.fromEntries(Object.entries(demo.markers).map(([k, v]) => [k, +((v - t0) / SLOW).toFixed(3)]));
  const dpr = await page.eval("devicePixelRatio");
  writeFileSync(join(out, "manifest.json"), JSON.stringify({ flow: flowName, viewport: { w: VIEWPORT[0], h: VIEWPORT[1], dpr }, frames, markers }, null, 2));
  const duration = frames.at(-1)?.t ?? 0;
  console.log(`${flowName}: ${frames.length} frames over ${duration}s (${(frames.length / duration).toFixed(1)} fps)`, markers);
  if (page.errors.length) console.log(`errors:\n${page.errors.join("\n")}`);
} finally {
  await close();
}

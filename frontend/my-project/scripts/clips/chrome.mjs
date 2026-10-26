// A small Chrome DevTools Protocol driver for the clip scripts: headless Chrome and Node's
// built-in WebSocket, no dependencies. Set CHROME_PATH if Chrome is not in the default
// Windows location.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Working files (samples, recordings, encodes, browser profiles); git ignores it.
export const WORK = join(import.meta.dirname, "..", "..", ".clips");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Session {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, method } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
}

class Page {
  constructor(session, base) {
    this.s = session;
    this.base = base;
    this.errors = [];
    session.on("Runtime.exceptionThrown", (p) => this.errors.push(`exception: ${p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text}`));
    session.on("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error") this.errors.push(`console.error: ${p.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
    });
    session.on("Log.entryAdded", (p) => {
      if (p.entry.level === "error" && !p.entry.url?.endsWith("/favicon.ico")) this.errors.push(`log: ${p.entry.text} ${p.entry.url ?? ""}`);
    });
  }

  async init() {
    await this.s.send("Page.enable");
    await this.s.send("Runtime.enable");
    await this.s.send("Log.enable");
  }

  async eval(expression) {
    const r = await this.s.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }

  async waitFor(expression, { timeout = 60_000, label = expression } = {}) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try {
        if (await this.eval(expression)) return;
      } catch {
        // Navigation in progress: try again.
      }
      await sleep(150);
    }
    throw new Error(`timed out waiting for: ${label}`);
  }

  async goto(path, { settle = 1000 } = {}) {
    await this.s.send("Page.navigate", { url: /^[a-z][a-z0-9+.-]*:/i.test(path) ? path : this.base + path });
    await this.waitFor("document.readyState === 'complete'", { label: "load" });
    await this.eval("document.fonts.ready.then(() => true)");
    await sleep(settle);
  }

  // A scale of 0 keeps Chrome's own device scale factor (see --force-device-scale-factor).
  async viewport(width, height, scale = 1) {
    await this.s.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
  }

  // The app keeps the choice in localStorage ("theme") and applies a class before paint.
  async theme(value) {
    await this.s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value }] });
    await this.eval(`(() => { localStorage.setItem("theme", ${JSON.stringify(value)}); document.documentElement.classList.toggle("dark", ${value === "dark"}); return true; })()`);
  }

  // Focus, select what is there, then type through the browser's input pipeline so React sees it.
  async fill(selector, text) {
    await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select?.(); return true; })()`);
    await this.s.send("Input.insertText", { text });
  }

  async click(selector) {
    const ok = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`no element for ${selector}`);
  }

  // Puts a file on disk into an <input type="file"> (hidden ones too) and fires its change event.
  async upload(selector, path) {
    const { root } = await this.s.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await this.s.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`no element for ${selector}`);
    await this.s.send("DOM.setFileInputFiles", { nodeId, files: [path] });
  }
}

export async function launch({ base = "about:blank", port = 9333, profile, args = [] }) {
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const chrome = spawn(
    CHROME,
    [
      "--headless",
      `--remote-debugging-port=${port}`,
      "--remote-allow-origins=*",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--mute-audio",
      "--force-color-profile=srgb",
      ...args,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch {
      // Not listening yet.
    }
    if (!target) await sleep(200);
  }
  if (!target) throw new Error(`Chrome did not start (${CHROME})`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const page = new Page(new Session(ws), base);
  await page.init();
  return {
    page,
    async close() {
      ws.close();
      chrome.kill();
      await sleep(300);
    },
  };
}

// A local HTTP server: Chrome's fetch() cannot read file:// URLs, and WebCodecs needs a
// secure context (localhost counts). `handle` returns { type, body } or null for a 404.
export async function serve(handle) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const found = await handle(path).catch(() => null);
    if (!found) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { "content-type": found.type });
    res.end(found.body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

// The mock API: any password works for the demo account.
export async function signIn(page) {
  await page.goto("/en/login", { settle: 300 });
  await page.waitFor(`!!document.querySelector('input[type="email"]')`, { label: "login form" });
  await page.fill('input[type="email"]', "demo@example.com");
  await page.fill('input[autocomplete="current-password"]', "preview-password");
  await page.click('[data-testid="sign-in"]');
  await page.waitFor("location.pathname.includes('/dashboard')", { label: "dashboard after sign-in" });
}

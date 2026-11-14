// Loads rcm-all.user.js into the running dev app with headless Chromium (Playwright) and prints the results.
// Not part of the app. Usage:
//   npm i playwright-core   (in any temp folder, e.g. /tmp/pw; set PW_DIR to that folder)
//   node tools/tm-tests/verify-playwright.mjs [baseUrl] [sliceNumber|all] [testId]
// Env: PW_DIR (folder containing node_modules/playwright-core), CHROME (path to chrome/msedge executable).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire((process.env.PW_DIR || process.cwd()) + "/");
const { chromium } = require("playwright-core");

const base = process.argv[2] || "http://localhost:5199";
const which = process.argv[3] || "all";
const single = process.argv[4];
const exe = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const bundle = readFileSync(join(here, "rcm-all.user.js"), "utf8");

const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// act like a logged-in user and like Tampermonkey (script injected into every document)
await context.addInitScript(() => {
  try { if (!localStorage.getItem("auth_token")) localStorage.setItem("auth_token", "dummy_token"); } catch (e) {}
});
await context.addInitScript({ content: bundle });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
await page.goto(base + "/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.RcmTm && window.__rcm, null, { timeout: 30000 });

const startExpr = single
  ? `RcmTm.start(["${single}"], "${single}")`
  : which === "all"
  ? `RcmTm.start(RcmTm.tests.map(t => t.id), "all")`
  : `RcmTm.start(RcmTm.queueFor(t => t.slice === ${Number(which)}), "slice ${Number(which)}")`;
page.evaluate(startExpr).catch(() => {}); // the page may navigate away mid-run; the harness resumes itself

const t0 = Date.now();
for (;;) {
  await new Promise((r) => setTimeout(r, 1500));
  if (Date.now() - t0 > 20 * 60 * 1000) { console.log("TIMEOUT"); break; }
  try {
    const st = await page.evaluate(() => { const r = JSON.parse(sessionStorage.getItem("__rcmtest_run") || "null"); return r ? { running: r.running, done: r.idx, total: r.queue.length } : null; });
    if (st && !st.running) break;
  } catch (e) { /* navigating */ }
}
await new Promise((r) => setTimeout(r, 500));
const md = await page.evaluate(() => RcmTm.markdown());
console.log(md);
await browser.close();

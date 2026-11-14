// Builds rcm-all.user.js: userscript header + harness + every slice test file.
// Usage: node tools/tm-tests/build.mjs   (from the repo root)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
const parts = ["s1-instances-permissions.js", "s2-setup-tasks.js", "s3-eligibility-prior-auth.js", "s4-claims.js", "s5-remittance-denials-invoices.js", "s6-overview-reports-permissions.js"];

const harness = readFileSync(join(here, "rcm-harness.user.js"), "utf8").replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, "");
const header = `// ==UserScript==
// @name         MantraAssist RCM tests
// @namespace    mantra-assist-rcm-tests
// @version      ${today}
// @description  Browser tests for the RCM slices 1-6 (needs the Vite dev server: they use window.__rcm)
// @match        http://localhost:*/*
// @match        http://127.0.0.1:*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
`;
let out = header + "\n" + harness + "\n";
for (const p of parts) {
  const f = join(here, p);
  if (!existsSync(f)) { console.warn("missing part (skipped): " + p); continue; }
  out += `\n// ───── ${p} ─────\n` + readFileSync(f, "utf8") + "\n";
}
writeFileSync(join(here, "rcm-all.user.js"), out);
console.log("wrote tools/tm-tests/rcm-all.user.js (" + out.length + " bytes, version " + today + ")");

// ==UserScript==
// @name         MantraAssist RCM tests (harness only)
// @namespace    mantra-assist-rcm-tests
// @version      2026.11.14
// @description  Shared harness for the RCM browser tests. Install rcm-all.user.js (the bundle) instead of this file.
// @match        http://localhost:*/*
// @match        http://127.0.0.1:*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* eslint-disable */
(function () {
  "use strict";
  if (window.RcmTm) return;

  const LS_BACKUP = "__rcmtest_backup";
  const SS_RUN = "__rcmtest_run";
  const SS_UI = "__rcmtest_ui";
  const HARNESS_KEYS = [LS_BACKUP, SS_RUN, SS_UI];

  // ── signals ───────────────────────────────────────────────────────────────────────────────
  class SkipSignal extends Error { constructor(m) { super(m); this.kind = "SKIP"; } }
  class ManualSignal extends Error { constructor(m) { super(m); this.kind = "MANUAL"; } }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jstr = (v) => { try { return JSON.stringify(v); } catch (e) { return String(v); } };

  const T = {
    tests: [],
    log: [],
    sleep,
    jstr,
    skip(reason) { throw new SkipSignal(reason); },
    manual(note) { throw new ManualSignal(note); },
    assert(cond, msg) { if (!cond) throw new Error("Assertion failed: " + (msg || "(no message)")); },
    eq(actual, expected, msg) {
      if (jstr(actual) !== jstr(expected)) throw new Error("Expected " + jstr(expected) + " but got " + jstr(actual) + (msg ? " (" + msg + ")" : ""));
    },
    match(obj, partial, msg) {
      for (const k of Object.keys(partial)) {
        if (jstr(obj == null ? undefined : obj[k]) !== jstr(partial[k])) {
          throw new Error("Field '" + k + "': expected " + jstr(partial[k]) + " but got " + jstr(obj == null ? undefined : obj[k]) + (msg ? " (" + msg + ")" : ""));
        }
      }
    },
    async waitFor(fn, opts) {
      const o = Object.assign({ timeout: 4000, interval: 60, msg: "condition" }, opts || {});
      const t0 = Date.now();
      let last;
      while (Date.now() - t0 < o.timeout) {
        try { last = await fn(); if (last) return last; } catch (e) { if (e instanceof SkipSignal || e instanceof ManualSignal) throw e; }
        await sleep(o.interval);
      }
      throw new Error("Timed out after " + o.timeout + "ms waiting for " + o.msg);
    },
    rcm() {
      if (!window.__rcm) throw new SkipSignal("window.__rcm is missing: the dev test hook only exists on the Vite dev server (npm run dev), not on a production build");
      return window.__rcm;
    },
    // register tests of one slice. Each: {id, title, run(ctx)} OR {id, title, arrange(ctx), phases:[{nav, verify(ctx)}]}
    slice(n, tests) {
      tests.forEach((t, i) => T.tests.push(Object.assign({ slice: n, id: "S" + n + "." + String(i + 1).padStart(2, "0") }, t)));
    },
  };

  // ── UI helpers (real clicks via data-testid) ─────────────────────────────────────────────────
  T.ui = {
    q(id) { return document.querySelector('[data-testid="' + id + '"]'); },
    has(id) { return !!T.ui.q(id); },
    async wait(id, timeout) { return T.waitFor(() => T.ui.q(id), { timeout: timeout || 6000, msg: "[data-testid=" + id + "]" }); },
    async click(id, timeout) {
      const el = await T.ui.wait(id, timeout);
      if (el.disabled) throw new Error("[data-testid=" + id + "] is disabled");
      el.click();
      await sleep(150);
      return el;
    },
    async waitText(text, timeout) {
      return T.waitFor(() => document.body && document.body.innerText.includes(text), { timeout: timeout || 6000, msg: "text '" + text + "' on the page" });
    },
    textOf(id) { const el = T.ui.q(id); return el ? el.innerText : ""; },
    path() { return location.pathname + location.search; },
    async clickByText(selector, text, timeout) {
      const el = await T.waitFor(() => Array.from(document.querySelectorAll(selector)).find((e) => (e.innerText || "").trim().includes(text)), { timeout: timeout || 6000, msg: selector + " containing '" + text + "'" });
      el.click();
      await sleep(150);
      return el;
    },
    setInput(el, value) {
      const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
      el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    },
  };

  // ── persistent state (survives reloads) ──────────────────────────────────────────────────────────
  const getRun = () => { try { return JSON.parse(sessionStorage.getItem(SS_RUN) || "null"); } catch (e) { return null; } };
  const setRun = (r) => { if (r) sessionStorage.setItem(SS_RUN, JSON.stringify(r)); else sessionStorage.removeItem(SS_RUN); };
  const getUi = () => { try { return JSON.parse(sessionStorage.getItem(SS_UI) || "{}"); } catch (e) { return {}; } };
  const setUi = (o) => sessionStorage.setItem(SS_UI, JSON.stringify(Object.assign(getUi(), o)));

  // ── backup / restore ──────────────────────────────────────────────────────────────────────────
  function takeSnapshot() {
    const dump = (s) => { const o = {}; for (let i = 0; i < s.length; i++) { const k = s.key(i); if (HARNESS_KEYS.indexOf(k) < 0) o[k] = s.getItem(k); } return o; };
    return { at: new Date().toISOString(), local: dump(localStorage), session: dump(sessionStorage) };
  }
  T.backup = {
    exists() { return !!localStorage.getItem(LS_BACKUP); },
    ensure() {
      if (T.backup.exists()) return { ok: true, fresh: false };
      try { localStorage.setItem(LS_BACKUP, JSON.stringify(takeSnapshot())); return { ok: true, fresh: true }; }
      catch (e) { return { ok: false, fresh: false, error: String(e) }; }
    },
    restore(clearBackup) {
      const raw = localStorage.getItem(LS_BACKUP);
      if (!raw) return false;
      const snap = JSON.parse(raw);
      const keepRun = sessionStorage.getItem(SS_RUN), keepUi = sessionStorage.getItem(SS_UI);
      localStorage.clear(); sessionStorage.clear();
      Object.keys(snap.local).forEach((k) => localStorage.setItem(k, snap.local[k]));
      Object.keys(snap.session).forEach((k) => sessionStorage.setItem(k, snap.session[k]));
      if (!clearBackup) localStorage.setItem(LS_BACKUP, raw);
      if (keepUi) sessionStorage.setItem(SS_UI, keepUi);
      if (keepRun && !clearBackup) sessionStorage.setItem(SS_RUN, keepRun);
      return true;
    },
  };

  // ── per-test context ─────────────────────────────────────────────────────────────────────────────
  const AUTH_KEYS = ["user_role", "user_data", "login_email", "auth_token"];
  function makeCtx(test) {
    const ctx = {
      test,
      T,
      rcm: T.rcm,
      note: (m) => { ctx.notes.push(m); T.logLine("    · " + m); },
      notes: [],
      /** clear the RCM data, reset one-time flags and mock scenarios; returns {clientId}. */
      fresh(opts) {
        const r = T.rcm();
        const w = r.freshWorld(opts);
        try { r.processLogs.__resetInstanceMigrationForTests(); } catch (e) {}
        try { r.actionRuns.__resetActionRunsForTests(); } catch (e) {}
        try { r.claims.__resetClaimMigrationForTests(); } catch (e) {}
        try { r.eligibility.setMockScenario("auto"); } catch (e) {}
        try { r.claimActions.clearinghouseSettingsStore.save({ scenario: "auto" }); } catch (e) {}
        return w;
      },
    };
    return ctx;
  }

  // ── running ─────────────────────────────────────────────────────────────────────────────────────────
  T.logLine = (s) => {
    T.log.push(s);
    if (T.logEl) { T.logEl.textContent += s + "\n"; T.logEl.scrollTop = T.logEl.scrollHeight; }
  };

  function record(results, test, status, detail) {
    results[test.id] = { id: test.id, slice: test.slice, title: test.title, status, detail: String(detail || "").replace(/\s+/g, " ").slice(0, 400) };
    T.logLine((status === "PASS" ? "PASS " : status === "FAIL" ? "FAIL " : status === "SKIP" ? "SKIP " : "MANU ") + test.id + "  " + test.title + (detail ? "  -- " + String(detail).slice(0, 160) : ""));
  }

  function classify(e) {
    if (e instanceof SkipSignal) return ["SKIP", e.message];
    if (e instanceof ManualSignal) return ["MANUAL", e.message];
    return ["FAIL", (e && e.message) || String(e)];
  }

  async function withTimeout(p, ms, id) {
    let t;
    const to = new Promise((_, rej) => { t = setTimeout(() => rej(new Error("Test " + id + " timed out after " + ms + "ms")), ms); });
    try { return await Promise.race([p, to]); } finally { clearTimeout(t); }
  }

  /** Run (or resume) the queue stored in sessionStorage. Navigations reload the page; the harness re-enters here. */
  async function pump() {
    if (T.pumping) return;
    T.pumping = true;
    try {
      for (;;) {
        const run = getRun();
        if (!run || !run.running) break;
        const test = T.tests.find((t) => t.id === run.queue[run.idx]);
        if (!test) { run.idx++; if (run.idx >= run.queue.length) { finish(run); break; } setRun(run); continue; }

        let status = null, detail = "";
        try {
          if (run.pending && run.pending.id === test.id) {
            // resuming after a navigation: run the next phase's verify
            const ctx = makeCtx(test);
            const phase = test.phases[run.pending.phase];
            await withTimeout(Promise.resolve(phase.verify(ctx)), 20000, test.id);
            if (run.pending.phase + 1 < test.phases.length) {
              run.pending.phase++;
              setRun(run);
              await goto(test.phases[run.pending.phase].nav);
              return; // page unloads
            }
            run.pending = null;
            status = "PASS"; detail = "";
            restoreAuth(run, test);
          } else {
            T.logLine("... " + test.id + "  " + test.title);
            const ctx = makeCtx(test);
            if (test.usesAuth) run.savedAuth = AUTH_KEYS.reduce((o, k) => { o[k] = localStorage.getItem(k); return o; }, {});
            if (test.phases) {
              await withTimeout(Promise.resolve(test.arrange ? test.arrange(ctx) : null), 20000, test.id);
              run.pending = { id: test.id, phase: 0 };
              setRun(run);
              await goto(test.phases[0].nav);
              return; // page unloads; pump() runs again after the reload
            }
            await withTimeout(Promise.resolve(test.run(ctx)), 30000, test.id);
            status = "PASS"; detail = ctx.notes.join(" | ");
          }
        } catch (e) {
          const c = classify(e); status = c[0]; detail = c[1];
          run.pending = null;
          restoreAuth(run, test);
        }
        record(run.results, test, status, detail);
        run.idx++;
        if (test.reloadAfter && run.idx < run.queue.length) { setRun(run); location.assign("/"); return; }
        if (run.idx >= run.queue.length) { finish(run); break; }
        setRun(run);
        await sleep(30);
      }
    } finally { T.pumping = false; }
  }

  function restoreAuth(run, test) {
    if (!test.usesAuth || !run.savedAuth) return;
    AUTH_KEYS.forEach((k) => { const v = run.savedAuth[k]; if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); });
    run.savedAuth = null;
  }

  async function goto(path) {
    const target = new URL(path, location.origin);
    if (target.pathname + target.search === location.pathname + location.search) location.reload();
    else location.assign(target.href);
    await sleep(60000); // the page unloads before this resolves
  }

  function finish(run) {
    run.running = false;
    run.finishedAt = new Date().toISOString();
    setRun(run);
    T.logLine(T.summaryLine(run.results));
    T.renderResults && T.renderResults();
  }

  T.summaryLine = (results) => {
    const all = Object.keys(results).map((k) => results[k]);
    const n = (s) => all.filter((r) => r.status === s).length;
    return "SUMMARY: " + all.length + " tests | PASS " + n("PASS") + " | FAIL " + n("FAIL") + " | SKIP " + n("SKIP") + " | MANUAL " + n("MANUAL");
  };

  T.start = async function (ids, label) {
    if (!window.__rcm) {
      T.logLine("The test hook (window.__rcm) is missing. Open the app from the Vite dev server (npm run dev).");
    }
    try { await T.waitFor(() => window.__rcm, { timeout: 8000, msg: "window.__rcm" }); } catch (e) {}
    const b = T.backup.ensure();
    if (b.fresh) T.logLine("Backup of localStorage/sessionStorage stored (use 'Restore backup' to undo everything the tests changed).");
    if (!b.ok) T.logLine("WARNING: could not store the backup (" + b.error + "). Back up your data yourself before running; tests overwrite RCM data.");
    const run = { running: true, queue: ids, idx: 0, results: {}, startedAt: new Date().toISOString(), label: label || "run", pending: null };
    setRun(run);
    T.logLine("== " + (label || "run") + ": " + ids.length + " test(s) ==");
    await pump();
  };

  T.markdown = function () {
    const run = getRun();
    if (!run) return "(no results yet)";
    const order = T.tests.map((t) => t.id);
    const rows = Object.keys(run.results).sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((k) => run.results[k]);
    const esc = (s) => String(s || "").replace(/\|/g, "\\|");
    return ["| id | slice | title | status | detail |", "|---|---|---|---|---|"]
      .concat(rows.map((r) => "| " + r.id + " | " + r.slice + " | " + esc(r.title) + " | " + r.status + " | " + esc(r.detail) + " |"))
      .concat(["", T.summaryLine(run.results) + (run.running ? " (still running)" : "")]).join("\n");
  };

  T.queueFor = (filter) => T.tests.filter(filter).map((t) => t.id);

  // ── panel ─────────────────────────────────────────────────────────────────────────────────────────
  function buildPanel() {
    if (document.getElementById("rcmtm-panel")) return;
    const ui = getUi();
    const el = document.createElement("div");
    el.id = "rcmtm-panel";
    el.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;width:420px;max-width:96vw;background:#0f172a;color:#e2e8f0;font:12px/1.4 ui-monospace,Consolas,monospace;border:1px solid #334155;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.4)";
    el.innerHTML =
      '<div id="rcmtm-head" style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;cursor:pointer;background:#1e293b;border-radius:10px 10px 0 0"><b>RCM tests</b><span id="rcmtm-sum"></span><span id="rcmtm-tog">' + (ui.collapsed ? "+" : "−") + "</span></div>" +
      '<div id="rcmtm-body" style="padding:8px;display:' + (ui.collapsed ? "none" : "block") + '">' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>' +
      '<div style="display:flex;gap:4px;margin-bottom:6px"><select id="rcmtm-single" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:3px"></select></div>' +
      '<pre id="rcmtm-log" style="margin:0;height:200px;overflow:auto;background:#020617;padding:6px;border-radius:6px;white-space:pre-wrap"></pre></div>';
    document.body.appendChild(el);
    const btnRow = el.querySelector("#rcmtm-body > div");
    const mk = (label, fn, title) => {
      const b = document.createElement("button");
      b.textContent = label; b.title = title || label;
      b.style.cssText = "background:#2563eb;color:#fff;border:0;border-radius:6px;padding:4px 8px;cursor:pointer;font:inherit";
      b.onclick = fn; btnRow.appendChild(b); return b;
    };
    mk("Run all", () => T.start(T.tests.map((t) => t.id), "all"));
    for (let n = 1; n <= 6; n++) mk("S" + n, () => T.start(T.queueFor((t) => t.slice === n), "slice " + n), "Run slice " + n);
    mk("Run single", () => { const id = el.querySelector("#rcmtm-single").value; T.start([id], id); });
    mk("Reset test data", () => { if (!T.backup.exists()) return T.logLine("No backup yet: run a test first."); T.backup.restore(false); T.logLine("Data reset to the backup taken before the first run. Reloading."); setTimeout(() => location.reload(), 300); }, "Restore the data as it was before the first run (backup stays)");
    mk("Restore & delete backup", () => { if (T.backup.restore(true)) { T.logLine("Restored and backup deleted. Reloading."); setTimeout(() => location.reload(), 300); } else T.logLine("No backup."); });
    mk("Copy results", async () => { const md = T.markdown(); try { await navigator.clipboard.writeText(md); T.logLine("Results copied to the clipboard."); } catch (e) { T.logLine("Clipboard blocked; results are in the console (RcmTm.markdown())."); console.log(md); } });
    const sel = el.querySelector("#rcmtm-single");
    T.tests.forEach((t) => { const o = document.createElement("option"); o.value = t.id; o.textContent = t.id + "  " + t.title; sel.appendChild(o); });
    el.querySelector("#rcmtm-head").onclick = () => {
      const body = el.querySelector("#rcmtm-body"); const hidden = body.style.display === "none";
      body.style.display = hidden ? "block" : "none"; el.querySelector("#rcmtm-tog").textContent = hidden ? "−" : "+"; setUi({ collapsed: !hidden });
    };
    T.logEl = el.querySelector("#rcmtm-log");
    T.renderResults = () => { const run = getRun(); el.querySelector("#rcmtm-sum").textContent = run ? T.summaryLine(run.results).replace("SUMMARY: ", "") : ""; };
    T.log.forEach((l) => { T.logEl.textContent += l + "\n"; });
    T.renderResults();
  }

  // ── shared arrange/assert helpers (all go through window.__rcm) ──────────────────────────────────
  const DAY = 86400000;
  T.h = {
    DAY,
    ymd(offsetDays) { return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10); },
    settle(ms) { return sleep(ms || 400); },
    setServices(list) {
      for (const k of ["ma_services_store", "ma_services_demo", "ma_services_store_signup"]) localStorage.setItem(k, JSON.stringify(list));
    },
    standardServices() {
      T.h.setServices([
        { id: 701, name: "RCMTEST MRI brain", description: "", cptCode: "70553", duration: 30, price: 1200, currency: "USD", isActive: true },
        { id: 702, name: "RCMTEST Office visit", description: "", cptCode: "99214", duration: 30, price: 150, currency: "USD", isActive: true },
        { id: 703, name: "RCMTEST Cataract surgery", description: "", cptCode: "66984", duration: 60, price: 2400, currency: "USD", isActive: true },
      ]);
    },
    /** fresh world + standard services + sample templates + a BCBS coverage for the test client. */
    rcmWorld(ctx, opts) {
      opts = opts || {};
      const w = ctx.fresh(opts.client ? { client: opts.client } : undefined);
      const r = T.rcm();
      T.h.standardServices();
      r.sampleBundles.loadSampleTemplates();
      if (opts.coverage !== false) r.coverages.saveCoverage({ clientId: w.clientId, payerId: "payer-bcbs", memberId: opts.memberId || "RCMTEST-M100", priority: "primary", effectiveDate: "2025-01-01" });
      return w;
    },
    async book(clientId, serviceId, date, opts) {
      const r = T.rcm();
      const a = r.appointments.appointmentService.createAppointment(
        { clientName: (opts && opts.clientName) || "RCMTEST-Patient One", clientEmail: "rcmtest@example.test", clientPhone: "5550001111", employeeId: (opts && opts.employeeId) || 1, serviceId, date, time: "10:00", duration: 30, clientId },
        { force: true, createdBy: "user" }
      );
      await T.h.settle((opts && opts.settle) || 700);
      return String(a.id !== undefined ? a.id : a.appointment && a.appointment.id);
    },
    instanceFor(apptId, processId) {
      const r = T.rcm();
      return r.processLogs.getProcessInstances().find((i) => i.source && i.source.type === "appointment" && String(i.source.id) === String(apptId) && (!processId || i.processId === processId));
    },
    coverageProcessId() { return T.rcm().sampleIds.SAMPLE_COVERAGE_PROCESS_ID; },
    W() { return T.rcm().claimSamples.SAMPLE_CLAIM_WORKFLOW_IDS; },
    stageId(proc, name) { return T.rcm().claimSamples.claimStageId(proc, name); },
    claim(id) { return T.rcm().claims.getStoredClaims().find((c) => c.id === id); },
    claimsOf(clientId) { return T.rcm().claims.getStoredClaims().filter((c) => c.patientId === clientId && c.sourceType); },
    tasks() { return T.rcm().tasks.getStoredTasks().filter((t) => t.entityRef); },
    openTasks(queueId) { return T.h.tasks().filter((t) => t.queueId === queueId && t.status !== "completed"); },
    smsTexts(clientId) {
      const c = T.rcm().conversations.getStoredConversations().find((x) => x.clientId === clientId && x.channel === "sms");
      return c ? c.messages.map((m) => m.text) : [];
    },
    /** save a client process with named stages (ids are "<procId>-<slug>") and return it. */
    addProcess(id, name, stageNames) {
      const r = T.rcm();
      const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const proc = { id, name, description: "", assignedToUserId: 1, entityType: "client", aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1, voice: "Ava", tone: "Professional", style: "Balanced" },
        stages: stageNames.map((n, i) => ({ id: id + "-" + slug(n), name: n, description: "", status: "active", isInitial: i === 0 })) };
      r.processStore.saveStoredProcesses(r.processStore.getStoredProcesses().concat([proc]));
      return proc;
    },
    sid(procId, name) { return procId + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-"); },
    /** move an instance and emit the stage events like the Deals board does. */
    moveInstance(instanceId, stageName) {
      const r = T.rcm();
      const before = r.processLogs.getProcessInstanceById(instanceId);
      const moved = r.processLogs.updateProcessInstanceStage(instanceId, stageName);
      r.processLogs.logInstanceStageMove(moved, before.currentStage, { type: "manual" });
      return moved;
    },
    /** save a sample-style rule directly (enabled). */
    saveRule(partial) {
      const r = T.rcm();
      const now = new Date().toISOString();
      const rule = Object.assign({ orgId: "default", enabled: true, createdAt: now, updatedAt: now, action: { type: "moveToStage", processId: "", stageId: "" }, actions: [] }, partial);
      r.automation.saveStoredRules([rule].concat(r.automation.getStoredRules().filter((x) => x.id !== rule.id)));
      return rule;
    },
    rulesOn(prefixOrIds) { return T.rcm().automation.getStoredRules().filter((x) => x.enabled && (Array.isArray(prefixOrIds) ? prefixOrIds.indexOf(x.id) >= 0 : x.id.indexOf(prefixOrIds) === 0)); },
  };

  window.RcmTm = T;

  function boot() {
    buildPanel();
    const run = getRun();
    if (!window.__rcm) T.logLine("Note: window.__rcm not found (yet). The hook loads with the dev bundle; if this stays, you are not on the Vite dev server.");
    if (run && run.running) {
      T.logLine("Resuming after navigation at " + location.pathname + " ...");
      // give the SPA a moment to mount before the next phase runs
      T.waitFor(() => window.__rcm, { timeout: 8000, msg: "window.__rcm" }).catch(() => {}).then(() => setTimeout(() => pump(), 1200));
    }
  }
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(boot, 300);
  else window.addEventListener("DOMContentLoaded", () => setTimeout(boot, 300));
})();

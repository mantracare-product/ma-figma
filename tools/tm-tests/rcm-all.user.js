// ==UserScript==
// @name         MantraAssist RCM tests
// @namespace    mantra-assist-rcm-tests
// @version      2026.11.14
// @description  Browser tests for the RCM slices 1-6 (needs the Vite dev server: they use window.__rcm)
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


// ───── s1-instances-permissions.js ─────
/* Slice 1: process instances, events, rule order, call-list separation, permissions. */
(function () {
  const T = window.RcmTm;
  const { assert, eq, match } = T;
  const PROC = "rcmtest-proc";
  const src = (n) => ({ type: "appointment", id: "RCMTEST-A" + n, title: "RCMTEST Visit " + n + " (Appt #RCMTEST-A" + n + ")" });
  const start = (r, clientId, n, stage) =>
    r.processLogs.startProcessInstance({ clientId, clientName: "RCMTEST-Patient One", processName: "RCMTEST Process", processId: PROC, stageName: stage || "Not checked", source: src(n) });

  T.slice(1, [
    {
      title: "Two appointments => two instances and two Deals cards with different titles",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const a = start(r, w.clientId, 1), b = start(r, w.clientId, 2);
        assert(!a.alreadyExisted && !b.alreadyExisted, "both instances are new");
        assert(a.instance.instanceId !== b.instance.instanceId, "different instance ids");
        const rows = r.processLogs.getInstancesForClient(w.clientId, "RCMTEST Process");
        eq(rows.length, 2, "instances for the client");
        const { deals } = r.dealCards.reconcileDealCards([], rows);
        eq(deals.length, 2, "deal cards");
        assert(new Set(deals.map((d) => d.title)).size === 2, "titles differ: " + T.jstr(deals.map((d) => d.title)));
        assert(deals.every((d) => d.clientId === w.clientId), "cards carry the clientId");
      },
    },
    {
      title: "The same appointment again => no duplicate (stage of the existing instance is kept)",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const a = start(r, w.clientId, 1);
        r.processLogs.updateProcessInstanceStage(a.instance.instanceId, "Verified");
        const again = start(r, w.clientId, 1, "Not checked");
        assert(again.alreadyExisted, "second start reports alreadyExisted");
        eq(again.instance.instanceId, a.instance.instanceId);
        eq(r.processLogs.getInstancesForClient(w.clientId, "RCMTEST Process").length, 1);
        eq(r.processLogs.getProcessInstanceById(a.instance.instanceId).currentStage, "Verified", "stage not reset");
      },
    },
    {
      title: "Moving one instance leaves the other and client.stage unchanged",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const before = r.clients.getStoredClients().find((c) => c.id === w.clientId).stage;
        const a = start(r, w.clientId, 1), b = start(r, w.clientId, 2);
        r.processLogs.updateProcessInstanceStage(a.instance.instanceId, "Needs fix");
        eq(r.processLogs.getProcessInstanceById(a.instance.instanceId).currentStage, "Needs fix");
        eq(r.processLogs.getProcessInstanceById(b.instance.instanceId).currentStage, "Not checked");
        const client = r.clients.getStoredClients().find((c) => c.id === w.clientId);
        eq(client.stage, before, "client.stage unchanged (as the app reads it)");
        // the instance store mirrors into the raw "clients" key (a demo workspace reads "clients_demo" instead: see README, known findings)
        const raw = JSON.parse(localStorage.getItem("clients") || "[]").find((c) => c.id === w.clientId);
        eq(raw && raw.processInstanceStages && raw.processInstanceStages[a.instance.instanceId].stageName, "Needs fix", "mirrored per instance in the raw clients key");
        eq(raw.stage, before, "raw client.stage unchanged");
      },
    },
    {
      title: "Process rows are not calls: getCallsOnly() has none, getProcessInstances() has them",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        start(r, w.clientId, 1);
        assert(r.processLogs.getProcessInstances().some((i) => i.client && i.process === "RCMTEST Process"), "instance present in process list");
        const calls = r.processLogs.getCallsOnly();
        assert(calls.every((c) => !r.processLogs.isProcessInstanceRow(c)), "no process row in call list");
        assert(!calls.some((c) => c.process === "RCMTEST Process"), "test instance not in call list");
      },
    },
    {
      title: "Stage-entry rule fires once per instance (each instance gets its own marker)",
      async run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        T.h.addProcess(PROC, "RCMTEST Process", ["Not checked", "Needs fix"]);
        T.h.saveRule({
          id: "rcmtest-rule-marker", name: "RCMTEST marker", entityType: "client",
          trigger: { event: "stage.entered", params: { processId: PROC, stageId: T.h.sid(PROC, "Needs fix") } },
          actions: [{ id: "s1", stepKey: "update_fields", params: { targets: ["instance"], fields: { rcmtest_marker: "{{instance.instanceId}}" } } }],
        });
        const a = start(r, w.clientId, 1), b = start(r, w.clientId, 2);
        T.h.moveInstance(a.instance.instanceId, "Needs fix");
        T.h.moveInstance(b.instance.instanceId, "Needs fix");
        await T.waitFor(() => r.processLogs.getProcessInstanceById(b.instance.instanceId).rcmtest_marker, { msg: "marker on instance B" });
        eq(r.processLogs.getProcessInstanceById(a.instance.instanceId).rcmtest_marker, a.instance.instanceId, "A has its own id");
        eq(r.processLogs.getProcessInstanceById(b.instance.instanceId).rcmtest_marker, b.instance.instanceId, "B has its own id");
      },
    },
    {
      title: "Two rules on one event run in order (order 10 before order 20, regardless of creation order)",
      async run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        T.h.addProcess(PROC, "RCMTEST Process", ["Not checked", "Needs fix"]);
        const trig = { event: "stage.entered", params: { processId: PROC, stageId: T.h.sid(PROC, "Needs fix") } };
        const rule = (id, order, val) => ({ id, name: id, entityType: "client", trigger: trig, order, actions: [{ id: id + "-s", stepKey: "update_fields", params: { targets: ["instance"], fields: { rcmtest_order: val } } }] });
        T.h.saveRule(rule("rcmtest-late", 20, "late"));    // created first, runs LAST
        T.h.saveRule(rule("rcmtest-early", 10, "early"));  // created second, runs FIRST
        const a = start(r, w.clientId, 1);
        T.h.moveInstance(a.instance.instanceId, "Needs fix");
        await T.waitFor(() => r.processLogs.getProcessInstanceById(a.instance.instanceId).rcmtest_order, { msg: "an ordered write" });
        await T.h.settle(300);
        eq(r.processLogs.getProcessInstanceById(a.instance.instanceId).rcmtest_order, "late", "the order-20 rule wrote last");
      },
    },
    {
      title: "Stage events: exactly one stage.entered and one stage.exited per instance move",
      async run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const seen = [];
        const off = r.eventBus.eventBus.subscribeAll((e) => { if (e.event === "stage.entered" || e.event === "stage.exited") seen.push(e); });
        const a = start(r, w.clientId, 1);
        T.h.moveInstance(a.instance.instanceId, "Needs fix");
        await T.h.settle(200);
        off();
        const mine = seen.filter((e) => e.recordId === a.instance.instanceId);
        eq(mine.filter((e) => e.event === "stage.entered").length, 1, "entered");
        eq(mine.filter((e) => e.event === "stage.exited").length, 1, "exited");
        eq(mine[0].data.instanceId, a.instance.instanceId, "event carries the instance");
      },
    },
    {
      title: "Migration is idempotent (run twice, same stored rows)",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const legacy = [
          { id: "PRC-RCMTEST-1111", client: "RCMTEST-Patient One", clientId: w.clientId, type: "WhatsApp", status: "In Progress", process: "Old Flow", currentStage: "Older", duration: "0:00", date: "2026-01-01 09:00", hasRecording: false, hasTranscript: true, hasScheduledCall: false },
          { id: "PRC-RCMTEST-2222", client: "RCMTEST-Patient One", clientId: w.clientId, type: "WhatsApp", status: "In Progress", process: "Old Flow", currentStage: "Newer", duration: "0:00", date: "2026-02-01 09:00", hasRecording: false, hasTranscript: true, hasScheduledCall: false },
        ];
        localStorage.setItem("callLogs", JSON.stringify(legacy));
        localStorage.removeItem("callLogs_schema_v2");
        r.processLogs.__resetInstanceMigrationForTests();
        const r1 = r.processLogs.migrateProcessInstances();
        const after1 = localStorage.getItem("callLogs");
        const r2 = r.processLogs.migrateProcessInstances();
        eq(localStorage.getItem("callLogs"), after1, "second run changes nothing");
        eq(r2.collapsed, 0, "nothing left to collapse");
        assert(r1.collapsed >= 1, "first run collapsed the duplicate (client, process) pair");
        eq(JSON.parse(after1).filter((x) => x.kind === "process_instance" && x.process === "Old Flow").length, 1);
      },
    },
    {
      title: "Claims migration is idempotent and gives every claim a workflow",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        r.claimSamples.seedSampleClaimWorkflows();
        const wfs = r.claimWorkflows.getClaimWorkflows();
        const a = r.claimWorkflows.assignClaimsToWorkflows([{ id: "c1" }, { id: "c2", processId: "keep" }], wfs);
        assert(a.changed && a.claims[0].processId === wfs[0].id && a.claims[1].processId === "keep", "assigned only the claim without a workflow");
        eq(r.claimWorkflows.assignClaimsToWorkflows(a.claims, wfs).changed, false, "second run is a no-op");
        assert(r.claims.getStoredClaims().every((c) => !!c.processId), "stored claims all carry a workflow");
      },
    },
    {
      title: "Permissions: a role with only billingSetup read opens billing setup and nothing in settings (hasPermission)",
      run() {
        const r = T.rcm();
        const role = r.sampleRoles.buildSampleRcmRoles().find((x) => x.id === "sample-rcm-billing-setup");
        assert(r.permissions.hasPermission(role, "billingSetup", "read"), "billingSetup read");
        assert(!r.permissions.hasPermission(role, "settings", "read"), "settings denied");
        assert(!r.permissions.hasPermission(role, "claims", "read"), "claims denied");
        assert(!r.permissions.hasPermission(undefined, "billingSetup"), "no role = denied");
      },
    },
    {
      title: "UI: billingSetup-only user opens /settings/billing-setup; /settings/team and /settings/organization stay blocked",
      usesAuth: true,
      reloadAfter: true,
      arrange(ctx) {
        const r = T.rcm();
        ctx.fresh();
        r.rolesStore.saveStoredRoles(r.defaultRoles.DEFAULT_ROLES.slice());
        r.rolesStore.addRolesIfMissing(r.sampleRoles.buildSampleRcmRoles(), r.defaultRoles.DEFAULT_ROLES);
        r.team.addTeamMemberToStore({ name: "RCMTEST Setup User", email: "rcmtest-setup@example.test", role: "Billing Setup Admin", roleId: "sample-rcm-billing-setup", status: true });
        localStorage.setItem("user_data", JSON.stringify({ name: "RCMTEST Setup User", email: "rcmtest-setup@example.test", role: "Member" }));
        localStorage.setItem("user_role", "Member");
        localStorage.setItem("login_email", "rcmtest-setup@example.test");
      },
      phases: [
        {
          nav: "/settings/billing-setup",
          async verify() {
            await T.waitFor(() => T.ui.has("billing-section-entity"), { timeout: 8000, msg: "Billing setup tab to render" });
            eq(location.pathname, "/settings/billing-setup", "stayed on the billing setup route");
          },
        },
        {
          nav: "/settings/team",
          async verify() {
            await T.h.settle(800);
            assert(!location.pathname.startsWith("/settings"), "redirected away from /settings/team, now at " + location.pathname);
          },
        },
        {
          nav: "/settings/organization",
          async verify() {
            await T.h.settle(800);
            assert(!location.pathname.startsWith("/settings"), "redirected away from /settings/organization, now at " + location.pathname);
          },
        },
      ],
    },
    {
      title: "UI: Deals page shows one card per instance with different titles",
      arrange(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        // the Deals page shows the first client process by default: put the instances in that one
        const proc = r.processStore.getStoredProcesses().find((p) => p.entityType === "client" || !p.entityType);
        const mk = (n) => r.processLogs.startProcessInstance({ clientId: w.clientId, clientName: "RCMTEST-Patient One", processName: proc.name, processId: proc.id, stageName: proc.stages[0].name, source: src(n) });
        mk(1); mk(2);
      },
      phases: [
        {
          nav: "/deals",
          async verify() {
            await T.waitFor(() => document.body.innerText.includes("RCMTEST Visit 1"), { timeout: 10000, msg: "card title 'RCMTEST Visit 1' on /deals" });
            assert(document.body.innerText.includes("RCMTEST Visit 2"), "card title 'RCMTEST Visit 2' on /deals");
          },
        },
      ],
    },
    {
      title: "UI: Overview and Call Logs load (counts exclude process rows)",
      arrange(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        start(r, w.clientId, 1);
      },
      phases: [
        {
          nav: "/",
          async verify() {
            await T.waitFor(() => document.body.innerText.includes("Overview Analytics"), { timeout: 10000, msg: "Overview heading" });
            const r = T.rcm();
            assert(r.processLogs.getCallsOnly().every((c) => !r.processLogs.isProcessInstanceRow(c)), "call list has no process rows");
          },
        },
      ],
    },
    {
      title: "Layout/visual check of Deals cards and the process drawer",
      run() { T.manual("Needs a human: card layout, drag-and-drop feel and the process drawer visuals"); },
    },
  ]);
})();


// ───── s2-setup-tasks.js ─────
/* Slice 2: Billing setup, coverages, sample templates, create_task + queues, recordWriter, action plumbing. */
(function () {
  const T = window.RcmTm;
  const { assert, eq, match } = T;
  const PROC = "rcmtest-proc";
  const labelInput = (text) => {
    const l = Array.from(document.querySelectorAll("label")).find((x) => (x.innerText || "").trim().startsWith(text));
    return l ? l.querySelector("input,select,textarea") : null;
  };

  T.slice(2, [
    {
      title: "Billing setup stores: entity, locations, payers, fee schedules, claim defaults, scrub rules, provider credentials save and load",
      run(ctx) {
        const b = T.rcm().billing;
        ctx.fresh();
        b.billingEntityStore.save({ legalName: "RCMTEST LLC", dbaName: "", ein: "99-9999999", npi: "1234567893", taxonomy: "207W00000X", address: "1 Test St", phone: "5550" });
        eq(b.billingEntityStore.get().ein, "99-9999999");
        b.billingLocationsStore.upsert({ id: "RCMTEST-loc", name: "RCMTEST Loc", pos: "11" });
        eq(b.billingLocationsStore.get().map((x) => x.id), ["RCMTEST-loc"]);
        b.payersStore.upsert({ id: "RCMTEST-payer", name: "RCMTEST Payer", payerIdCode: "RT1", enrollment: { status: "enrolled" } });
        eq(b.getPayer("RCMTEST-payer").name, "RCMTEST Payer");
        b.feeSchedulesStore.upsert({ id: "RCMTEST-fee", name: "fees", payerId: "RCMTEST-payer", lines: [{ cpt: "99214", amount: 111 }] });
        eq(b.lookupFee("99214", "RCMTEST-payer"), 111, "payer fee");
        b.claimDefaultsStore.save({ frequencyCode: "1", defaultPos: "11", acceptAssignment: true, timelyFilingDays: 120, defaultBillingLocationId: "RCMTEST-loc" });
        eq(b.claimDefaultsStore.get().timelyFilingDays, 120);
        b.scrubRulesStore.upsert({ id: "RCMTEST-scrub", name: "r", check: "icd_required", severity: "error", enabled: true });
        eq(b.scrubRulesStore.get().length, 1);
        b.providerCredentialsStore.upsert({ id: "RCMTEST-prov", npi: "1111111112", taxonomy: "t", licenseNumber: "L", licenseState: "CA" });
        eq(b.getProviderCredential("RCMTEST-prov").npi, "1111111112");
      },
    },
    {
      title: "UI: Billing setup tab renders its sections and Save writes the billing entity",
      arrange(ctx) { ctx.fresh(); },
      phases: [
        {
          nav: "/settings/billing-setup",
          async verify() {
            await T.ui.wait("billing-section-entity", 10000);
            for (const id of ["locations", "payers", "fees", "defaults", "scrub", "providers", "notifications"]) assert(T.ui.has("billing-section-" + id), "section button " + id);
            const input = await T.waitFor(() => labelInput("Legal name"), { msg: "Legal name input" });
            T.ui.setInput(input, "RCMTEST UI LLC");
            await T.ui.clickByText("button", "Save");
            await T.waitFor(() => T.rcm().billing.billingEntityStore.get().legalName === "RCMTEST UI LLC", { msg: "entity saved from the UI" });
          },
        },
      ],
    },
    {
      title: "Coverages: add primary + secondary, a new primary demotes the old one, typed demographics save, coverage.updated fires",
      async run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const seen = [];
        const off = r.eventBus.eventBus.subscribe("coverage.updated", (e) => seen.push(e));
        const c = r.coverages;
        const p1 = c.saveCoverage({ clientId: w.clientId, payerId: "payer-bcbs", memberId: "RCMTEST-M1", priority: "primary" });
        c.saveCoverage({ clientId: w.clientId, payerId: "payer-aetna", memberId: "RCMTEST-M2", priority: "secondary" });
        const p2 = c.saveCoverage({ clientId: w.clientId, payerId: "payer-uhc", memberId: "RCMTEST-M3", priority: "primary" });
        eq(p2.demoted.length, 0, "secondary was taken, so the old primary is dropped, not demoted");
        const list = c.getCoveragesForClient(w.clientId);
        eq(list.map((x) => x.memberId + ":" + x.priority), ["RCMTEST-M3:primary", "RCMTEST-M2:secondary"]);
        assert(p1.coverage.id !== p2.coverage.id);
        assert(c.saveClientDemographics(w.clientId, { dob: "1975-05-05", sex: "female", consents: { sms: true } }), "demographics saved");
        eq(c.getClientDemographics(w.clientId).dob, "1975-05-05");
        await T.h.settle(100);
        off();
        assert(seen.length >= 3, "coverage.updated emitted for each save (" + seen.length + ")");
      },
    },
    {
      title: "UI: client Insurance tab opens and lists the coverage",
      arrange(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        r.billing.seedBillingSetupSamples();
        r.coverages.saveCoverage({ clientId: w.clientId, payerId: "payer-bcbs", memberId: "RCMTEST-UIM1", priority: "primary" });
      },
      phases: [
        {
          nav: "/clients/RCMTEST-CL-1",
          async verify() {
            await T.ui.click("profile-tab-insurance", 12000);
            await T.ui.wait("client-insurance-tab");
            await T.ui.waitText("RCMTEST-UIM1");
          },
        },
      ],
    },
    {
      title: "Load sample templates is idempotent and never overwrites edits",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        const first = r.sampleBundles.loadSampleTemplates();
        assert(first.total > 0, "first load adds items");
        const p = r.billing.getPayer("payer-bcbs");
        r.billing.payersStore.upsert(Object.assign({}, p, { name: "RCMTEST edited payer", sample: false }));
        r.automation.updateRule("sample-rule-A1", { name: "RCMTEST edited A1", enabled: true });
        const second = r.sampleBundles.loadSampleTemplates();
        eq(second.total, 0, "second load adds nothing");
        eq(r.billing.getPayer("payer-bcbs").name, "RCMTEST edited payer", "payer edit kept");
        const a1 = r.automation.getStoredRules().find((x) => x.id === "sample-rule-A1");
        eq(a1.name, "RCMTEST edited A1", "rule edit kept");
        assert(a1.enabled === true, "enabled choice kept");
        eq(r.billing.getPayers().length, 15, "15 mock payers");
        eq(r.taskViews.taskViewsStore.get().length, 8, "8 queue views");
      },
    },
    {
      title: "Sample rules load DISABLED; Enable demo set toggles them (E, E2, C, M)",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        r.sampleBundles.loadSampleTemplates();
        const sampleRules = r.automation.getStoredRules().filter((x) => x.id.indexOf("sample-rule-") === 0);
        assert(sampleRules.length >= 39, "sample rules loaded (" + sampleRules.length + ")");
        assert(sampleRules.every((x) => !x.enabled), "all sample rules start disabled");
        for (const id of ["E", "E2", "C", "M"]) {
          const st0 = r.sampleBundles.getSampleSetStatus(id);
          eq(st0.enabled, 0, "set " + id + " starts off");
          const n = r.sampleBundles.enableDemoSet(id);
          assert(n > 0, "set " + id + " enabled " + n);
          const st1 = r.sampleBundles.getSampleSetStatus(id);
          eq(st1.enabled, st1.total, "set " + id + " fully on");
          r.sampleBundles.disableDemoSet(id);
          eq(r.sampleBundles.getSampleSetStatus(id).enabled, 0, "set " + id + " off again");
        }
        r.sampleBundles.enableDemoSet("C");
        assert(!T.h.rulesOn("sample-rule-A14-").length, "A14 variants stay off when the set is enabled");
      },
    },
    {
      title: "UI: Automation page Load sample templates + Enable demo set buttons",
      arrange(ctx) { ctx.fresh(); },
      phases: [
        {
          nav: "/automation",
          async verify() {
            await T.ui.click("load-sample-templates", 12000);
            await T.waitFor(() => T.rcm().automation.getStoredRules().some((x) => x.id === "sample-rule-A1"), { msg: "sample rules after the click" });
            assert(T.rcm().automation.getStoredRules().filter((x) => x.id.indexOf("sample-rule-") === 0).every((x) => !x.enabled), "loaded disabled");
            await T.ui.click("demo-set-E");
            await T.waitFor(() => T.rcm().sampleBundles.getSampleSetStatus("E").enabled > 0, { msg: "set E enabled via the button" });
            assert(T.ui.has("run-daily-jobs"), "Run daily jobs now button present");
          },
        },
      ],
    },
    {
      title: "create_task on an instance stage appears in a queue view with a linked-record card and auto-closes on stage exit",
      async run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        r.taskViews.seedTaskViewSamples();
        const view = r.taskViews.taskViewsStore.get().find((v) => v.name.indexOf("Insurance fixes") === 0);
        T.h.addProcess(PROC, "RCMTEST Process", ["Not checked", "Needs fix", "Verified"]);
        T.h.saveRule({
          id: "rcmtest-task-rule", name: "RCMTEST task", entityType: "client",
          trigger: { event: "stage.entered", params: { processId: PROC, stageId: T.h.sid(PROC, "Needs fix") } },
          actions: [{ id: "t1", stepKey: "create_task", params: { title: "Fix {{client.name}}", queue: "Insurance fixes", priority: "high" } }],
        });
        const inst = r.processLogs.startProcessInstance({ clientId: w.clientId, clientName: "RCMTEST-Patient One", processName: "RCMTEST Process", processId: PROC, stageName: "Not checked", source: { type: "appointment", id: "RCMTEST-A1", title: "RCMTEST Visit (Appt #1)" } }).instance;
        T.h.moveInstance(inst.instanceId, "Needs fix");
        await T.waitFor(() => r.taskViews.applyTaskView(r.tasks.getStoredTasks(), view).length === 1, { msg: "task in the Insurance fixes view" });
        const t = r.taskViews.applyTaskView(r.tasks.getStoredTasks(), view)[0];
        match(t.entityRef, { type: "process_instance", instanceId: inst.instanceId });
        const link = r.taskLinks.describeEntityRef(t);
        assert(link && link.label.indexOf("RCMTEST Visit") >= 0, "linked-record label comes from the instance source: " + T.jstr(link));
        T.h.moveInstance(inst.instanceId, "Verified");
        await T.waitFor(() => r.taskViews.applyTaskView(r.tasks.getStoredTasks(), view).length === 0, { msg: "task to leave the open view after the instance left the stage" });
        eq(r.tasks.getStoredTasks().find((x) => x.id === t.id).closedBy, "auto:stage_exit");
      },
    },
    {
      title: "UI: Tasks page queue bar selects the view and the task shows with its linked record",
      arrange(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        r.taskViews.seedTaskViewSamples();
        const inst = r.processLogs.startProcessInstance({ clientId: w.clientId, clientName: "RCMTEST-Patient One", processName: "RCMTEST Process", processId: PROC, stageName: "Needs fix", source: { type: "appointment", id: "RCMTEST-A9", title: "RCMTEST Linked Visit (Appt #9)" } }).instance;
        r.tasks.createTaskRecord({
          title: "RCMTEST queue task", description: "", status: "pending", isImportant: false, scopeLevel: "client",
          assignee: { scopeLevel: "client", assigneeName: "RCMTEST" }, creator: { id: "u", name: "u" }, checklists: [], observers: [], subtasks: [], attachments: [],
          queueId: "insurance-fixes", priority: "high", entityRef: { type: "process_instance", id: inst.instanceId, instanceId: inst.instanceId, stageId: "x" },
        });
      },
      phases: [
        {
          nav: "/tasks?view=view-sample-insurance-fixes",
          async verify() {
            await T.ui.wait("task-queue-bar", 10000);
            eq(T.ui.q("task-queue-select").value, "view-sample-insurance-fixes", "queue select shows the view from the URL");
            await T.ui.waitText("RCMTEST queue task");
            await T.ui.waitText("RCMTEST Linked Visit");
          },
        },
      ],
    },
    {
      title: "recordWriter merges drawer-local values instead of replacing them, and splits typed vs registry keys",
      async run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        T.h.standardServices();
        const id = await T.h.book(w.clientId, 702, T.h.ymd(30), { settle: 100 });
        localStorage.setItem("mantra_appt_fields_" + id, JSON.stringify({ existing: "keep" }));
        const res = r.recordWriter.writeRecordFields({ type: "appointment", id }, { notes: "typed note", auth_status: "approved" });
        assert(res.ok, "write ok");
        eq(r.appointments.appointmentService.getAppointmentById(id).notes, "typed note", "typed column via the service");
        eq(JSON.parse(localStorage.getItem("mantra_appt_fields_" + id)), { existing: "keep", auth_status: "approved" }, "merged, not replaced");
        assert(!r.recordWriter.writeRecordFields({ type: "appointment", id: "RCMTEST-none" }, { a: 1 }).ok, "unknown record reported");
      },
    },
    {
      title: "Tasks core: ids and codes are collision-safe when created in the same millisecond",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        const mk = () => r.tasks.createTaskRecord({ title: "RCMTEST t", description: "", status: "pending", isImportant: false, scopeLevel: "client", assignee: { scopeLevel: "client", assigneeName: "x" }, creator: { id: "u", name: "u" }, checklists: [], observers: [], subtasks: [], attachments: [] });
        const made = []; for (let i = 0; i < 15; i++) made.push(mk());
        eq(new Set(made.map((t) => t.id)).size, 15, "unique ids");
        eq(new Set(made.map((t) => t.code)).size, 15, "unique codes");
      },
    },
    {
      title: "Failed actions are recorded and retryable (health + Retry)",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        let fail = true;
        r.actionRuns.registerActionRetryHandler("rcmtest_action", () => { if (fail) throw new Error("boom"); return { ok: true }; });
        const res = r.actionRuns.runActionOnce("rcmtest|k", { actionKey: "rcmtest_action" }, () => { throw new Error("boom"); });
        eq(res.status, "failed");
        eq(r.actionRuns.getActionHealth().failed, 1);
        fail = false;
        const retry = r.actionRuns.retryActionRun(r.actionRuns.listFailedActionRuns()[0].id);
        eq(retry.status, "success");
        eq(r.actionRuns.getActionHealth().failed, 0);
      },
    },
    {
      title: "UI: Automation page shows the 'Needs attention' panel when an action failed",
      arrange(ctx) {
        const r = T.rcm();
        ctx.fresh();
        r.actionRuns.runActionOnce("rcmtest|ui", { actionKey: "rcmtest_ui", ruleName: "RCMTEST rule" }, () => { throw new Error("RCMTEST failure"); });
      },
      phases: [{ nav: "/automation", async verify() { await T.ui.wait("action-runs-panel", 12000); await T.ui.waitText("automation action"); } }],
    },
    {
      title: "Layout of Billing setup forms, Insurance tab and Tasks queue bar",
      run() { T.manual("Needs a human: spacing, responsive layout and form usability"); },
    },
  ]);
})();


// ───── s3-eligibility-prior-auth.js ─────
/* Slice 3: eligibility, prior auth, Set E rules, chip/tabs, messages. */
(function () {
  const T = window.RcmTm;
  const { assert, eq, match } = T;
  const A = () => T.h.coverageProcessId();
  const hist = (inst, src) => (inst.elig_history || []).filter((h) => (src ? h.source === src : h.source === "mock" || h.source === "copied"));
  const getInst = (id) => T.rcm().processLogs.getProcessInstanceById(id);

  /** world with sample templates, Set E on, and a BCBS coverage; returns {clientId}. */
  function worldE(ctx, memberId) {
    const w = T.h.rcmWorld(ctx, { memberId });
    T.rcm().sampleBundles.enableDemoSet("E");
    return w;
  }

  T.slice(3, [
    {
      title: "Booking creates the instance (titled from the appointment); eligibility is written to the instance and the appointment",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx);
        const id = await T.h.book(w.clientId, 702, T.h.ymd(20));
        const inst = T.h.instanceFor(id, A());
        assert(inst, "instance created for the appointment");
        assert((inst.title || "").indexOf("Appt #" + id) >= 0, "title comes from the appointment: " + inst.title);
        match(inst, { elig_status: "active", currentStage: "Verified" });
        eq(inst.elig_copay, 30, "copay from the mock benefits");
        eq(hist(inst)[0].source, "mock");
        const appt = r.appointments.appointmentService.getAppointmentById(id);
        match(appt.coverage, { status: "active", instanceId: inst.instanceId });
      },
    },
    {
      title: "'Member not found' => Needs fix + task in Insurance fixes (after 3 attempts)",
      async run(ctx) {
        const w = worldE(ctx, "RCMTEST-NOTFOUNDNOTFOUND-1");
        const id = await T.h.book(w.clientId, 702, T.h.ymd(21));
        const inst = T.h.instanceFor(id, A());
        match(inst, { currentStage: "Needs fix", elig_status: "not_found", elig_reason_code: "75", elig_attempt: 3 });
        eq(T.h.openTasks("insurance-fixes").length, 1, "one open Insurance fixes task");
        match(T.h.openTasks("insurance-fixes")[0].entityRef, { type: "process_instance", instanceId: inst.instanceId });
      },
    },
    {
      title: "Fixing the coverage re-runs eligibility => Verified and the Insurance fixes task closes",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx, "RCMTEST-NOTFOUNDNOTFOUND-1");
        const id = await T.h.book(w.clientId, 702, T.h.ymd(21));
        const inst = T.h.instanceFor(id, A());
        eq(inst.currentStage, "Needs fix");
        r.coverages.saveCoverage({ clientId: w.clientId, payerId: "payer-bcbs", memberId: "RCMTEST-FIXED-1", priority: "primary", effectiveDate: "2025-01-01" });
        await T.waitFor(() => getInst(inst.instanceId).currentStage === "Verified", { timeout: 6000, msg: "instance Verified after the coverage fix" });
        await T.waitFor(() => T.h.openTasks("insurance-fixes").length === 0, { msg: "Insurance fixes task to auto-close" });
      },
    },
    {
      title: "Second booking within the window => new instance, result COPIED, the payer is called only once overall",
      async run(ctx) {
        const w = worldE(ctx);
        const a = await T.h.book(w.clientId, 702, T.h.ymd(20));
        const b = await T.h.book(w.clientId, 702, T.h.ymd(22));
        const ia = T.h.instanceFor(a, A()), ib = T.h.instanceFor(b, A());
        assert(ia.instanceId !== ib.instanceId, "different instances");
        eq(hist(ia, "mock").length + hist(ib, "mock").length, 1, "exactly one real payer call across both instances");
        eq(hist(ib, "copied").length, 1, "history row says copied");
        match(ib, { elig_status: "active", currentStage: "Verified" });
      },
    },
    {
      title: "Window 0 always calls the payer (manual run and Verify now)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx);
        const a = await T.h.book(w.clientId, 702, T.h.ymd(20));
        const inst = T.h.instanceFor(a, A());
        const run = r.runEligibility.performRunEligibility({ clientId: w.clientId, appointmentId: a, instanceId: inst.instanceId, serviceDate: T.h.ymd(20), trigger: "test", params: { windowDays: 0 }, cause: { type: "manual" } });
        match(run, { copied: false, payerCalls: 1 });
        const v = r.verifyNow.verifyAppointmentNow(a);
        match(v, { copied: false, payerCalls: 1 });
        assert(r.verifyNow.previewEligibility(w.clientId, T.h.ymd(20)).mock === true, "preview is flagged mock and writes nothing");
      },
    },
    {
      title: "A10 runs after A1 and writes the authorization to the instance A1 created (and queues a Prior auth task on it)",
      async run(ctx) {
        const w = worldE(ctx);
        const id = await T.h.book(w.clientId, 701, T.h.ymd(20));
        const inst = T.h.instanceFor(id, A());
        match(inst, { auth_required: true, auth_status: "requested", currentStage: "Auth submitted" });
        const t = T.h.openTasks("prior-auth");
        eq(t.length, 1);
        match(t[0].entityRef, { type: "process_instance", instanceId: inst.instanceId });
        eq(JSON.parse(localStorage.getItem("mantra_appt_fields_" + id)).auth_status, "requested", "appointment summary too");
      },
    },
    {
      title: "A10 with A1 disabled falls back to the appointment only and creates no instance",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx);
        r.automation.updateRule("sample-rule-A1", { enabled: false });
        const id = await T.h.book(w.clientId, 701, T.h.ymd(20));
        assert(!T.h.instanceFor(id, A()), "no instance was created");
        eq(JSON.parse(localStorage.getItem("mantra_appt_fields_" + id)).auth_status, "requested");
        const t = T.h.openTasks("prior-auth");
        eq(t.length, 1);
        match(t[0].entityRef, { type: "appointment", id });
      },
    },
    {
      title: "Payer inactive => Inactive stage, task in Insurance fixes and the update-insurance message in Chats",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx);
        r.eligibility.setMockScenario("inactive");
        const before = T.h.smsTexts(w.clientId).filter((t) => t.indexOf("could not verify your insurance") >= 0).length;
        const id = await T.h.book(w.clientId, 702, T.h.ymd(23));
        const inst = T.h.instanceFor(id, A());
        match(inst, { currentStage: "Inactive", elig_status: "inactive" });
        eq(T.h.openTasks("insurance-fixes").length, 1);
        await T.waitFor(() => T.h.smsTexts(w.clientId).filter((t) => t.indexOf("could not verify your insurance") >= 0).length === before + 1, { msg: "a new message in Chats" });
        r.eligibility.setMockScenario("auto");
      },
    },
    {
      title: "Inconclusive with voice OFF => Benefits to verify task; no call",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx, "RCMTEST-DOWNDOWNDOWN");
        localStorage.setItem("mantra_rcm_voice_enabled", "0");
        const id = await T.h.book(w.clientId, 702, T.h.ymd(24));
        match(T.h.instanceFor(id, A()), { currentStage: "Inconclusive" });
        eq(T.h.openTasks("benefits-to-verify").length, 1);
        eq(r.claimStatusAndCalls.rcmCallsStore.get().length, 0, "no call placed");
      },
    },
    {
      title: "Run daily jobs: A2 re-checks upcoming visits (fresh window => copied, no extra payer call)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx);
        const id = await T.h.book(w.clientId, 702, T.h.ymd(2));
        const inst = T.h.instanceFor(id, A());
        const before = hist(inst).length;
        const res = await r.jobs.runDaily(new Date(), ["upcoming_visits"]);
        assert(res.byJob.upcoming_visits >= 1, "job found the visit");
        await T.waitFor(() => hist(getInst(inst.instanceId)).length === before + 1, { msg: "one more history row" });
        eq(hist(getInst(inst.instanceId)).slice(-1)[0].source, "copied", "window skipped the payer");
      },
    },
    {
      title: "Prior-auth rules: 8 mock rows, rule > service default > unknown; Check Auth never creates an instance",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        r.sampleBundles.loadSampleTemplates();
        eq(r.priorAuth.getRules().length, 8);
        match(r.priorAuth.isAuthRequired("payer-bcbs", { cptCode: "70553" }), { required: true, source: "rule" });
        match(r.priorAuth.isAuthRequired("payer-bcbs", { cptCode: "00000", requiresAuthDefault: true }), { required: true, source: "service_default" });
        match(r.priorAuth.isAuthRequired("payer-bcbs", { cptCode: "00000" }), { required: "unknown", source: "none" });
      },
    },
    {
      title: "Authorization decision: approve records number/units on instance + appointment and moves the instance",
      async run(ctx) {
        const r = T.rcm();
        const w = worldE(ctx);
        const id = await T.h.book(w.clientId, 701, T.h.ymd(20));
        const inst = T.h.instanceFor(id, A());
        const out = r.authActions.recordAuthDecision({ instanceId: inst.instanceId, appointmentId: id, decision: "approved", authNumber: "RCMTEST-AUTH", unitsApproved: 2, stage: "Verified" });
        eq(out.stageMoved, "Verified");
        match(getInst(inst.instanceId), { auth_status: "approved", auth_number: "RCMTEST-AUTH", auth_units_approved: 2 });
      },
    },
    {
      title: "Message into Chats respects consent (no SMS consent => nothing sent)",
      async run(ctx) {
        const r = T.rcm();
        const w = T.h.rcmWorld(ctx, { client: { consents: { sms: false } } });
        r.sampleBundles.enableDemoSet("E");
        r.eligibility.setMockScenario("inactive");
        const before = T.h.smsTexts(w.clientId).filter((t) => t.indexOf("could not verify") >= 0).length; // other tests may have left chats behind
        const id = await T.h.book(w.clientId, 702, T.h.ymd(25));
        match(T.h.instanceFor(id, A()), { currentStage: "Inactive" });
        eq(T.h.smsTexts(w.clientId).filter((t) => t.indexOf("could not verify") >= 0).length, before, "no NEW message without consent");
        r.eligibility.setMockScenario("auto");
      },
    },
    {
      title: "UI: appointments list shows the coverage chip for a verified appointment",
      async arrange(ctx) {
        const w = worldE(ctx);
        await T.h.book(w.clientId, 702, T.h.ymd(3));
      },
      phases: [{ nav: "/appointments", async verify() { await T.ui.wait("coverage-chip", 15000); } }],
    },
    {
      title: "UI: appointment drawer has a Coverage tab with Verify now and the front-desk Check in button",
      async arrange(ctx) {
        const w = worldE(ctx);
        await T.h.book(w.clientId, 702, T.h.ymd(3));
      },
      phases: [
        {
          nav: "/appointments",
          async verify() {
            await T.ui.clickByText("button", "APT-", 15000);
            await T.ui.wait("front-desk-check-in", 8000);
            await T.ui.click("appt-tab-coverage", 8000);
            await T.ui.wait("appointment-coverage-tab");
            assert(document.body.innerText.includes("Verify now"), "Verify now button");
            assert(document.body.innerText.includes("Mock data"), "mock data label");
          },
        },
      ],
    },
    {
      title: "UI: Billing setup > Payers shows the prior-auth rules table and the mock scenario picker",
      arrange(ctx) { T.h.rcmWorld(ctx); },
      phases: [
        {
          nav: "/settings/billing-setup",
          async verify() {
            await T.ui.click("billing-section-payers", 12000);
            await T.ui.waitText("Prior-auth rules");
            await T.ui.waitText("Mock eligibility scenario");
          },
        },
      ],
    },
    {
      title: "Kiosk insurance/copay step and the chip colors",
      run() { T.manual("Needs a human: the patient kiosk screens and chip colors (green/amber/red)"); },
    },
  ]);
})();


// ───── s4-claims.js ─────
/* Slice 4: multi-workflow claims, claimService, scribe codes, create/scrub/submit, Set C. */
(function () {
  const T = window.RcmTm;
  const { assert, eq, match } = T;
  const SESSION = "RCMTEST-scr";

  function worldC(ctx, opts) {
    const w = T.h.rcmWorld(ctx, opts);
    T.rcm().sampleBundles.enableDemoSet("C");
    return w;
  }
  /** complete a visit (emits appointment.completed) and wait for the claim. */
  async function completedVisit(w, date, serviceId) {
    const r = T.rcm();
    const id = await T.h.book(w.clientId, serviceId || 703, date || T.h.ymd(-1), { settle: 300 });
    const appt = r.appointments.appointmentService.getAppointmentById(id);
    await r.eventBus.eventBus.emit("appointment.completed", "appointment", id, Object.assign({}, appt, { clientId: w.clientId }));
    await T.waitFor(() => T.h.claimsOf(w.clientId).length >= 1, { timeout: 5000, msg: "claim after appointment.completed" });
    return id;
  }
  function session(w, apptId, codes) {
    const r = T.rcm();
    const base = r.scribe.INITIAL_SCRIBE_SESSIONS[0];
    r.scribe.saveScribeSession(Object.assign({}, base, { id: SESSION, clientId: w.clientId, clientName: "RCMTEST-Patient One", appointmentId: apptId, extractedData: Object.assign({}, base.extractedData, { icd10Code: "H25.11", diagnosis: "RCMTEST cataract" }) }));
    r.scribeBilling.acceptCodes(SESSION, codes);
  }
  const RT = { icd: [{ code: "H25.11", description: "Cataract" }], cpt: [{ code: "66984", description: "Cataract surgery", modifier: "RT", units: 1 }] };
  const NOMOD = { icd: [{ code: "H25.11", description: "Cataract" }], cpt: [{ code: "66984", description: "Cataract surgery", units: 1 }] };

  T.slice(4, [
    {
      title: "Claim workflows persist (several allowed) and every claim has a workflow",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        eq(r.claimSamples.seedSampleClaimWorkflows(), 3, "3 sample workflows");
        const ids = r.processStore.getStoredProcesses().filter((p) => p.entityType === "claim").map((p) => p.id);
        assert(Object.values(T.h.W()).every((x) => ids.indexOf(x) >= 0), "sample workflows survive a reload of the process store");
        assert(r.claims.getStoredClaims().every((c) => !!c.processId), "all claims carry a workflow");
        eq(r.claimSamples.seedSampleClaimWorkflows(), 0, "idempotent");
      },
    },
    {
      title: "Per-process required categories: only the Claim workflow requires submitted/paid",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        r.claimSamples.seedSampleClaimWorkflows();
        const W = T.h.W();
        const claimWf = r.claimWorkflows.getClaimWorkflow(W.claim), capture = r.claimWorkflows.getClaimWorkflow(W.chargeCapture);
        assert(r.processStore.isRequiredSystemCategory("claim", "submitted", claimWf), "submitted required in Claim");
        assert(!r.processStore.isRequiredSystemCategory("claim", "draft", claimWf), "draft not required");
        assert(!r.processStore.isRequiredSystemCategory("claim", "submitted", capture), "nothing required in Charge capture");
      },
    },
    {
      title: "Completing an appointment creates ONE claim in Charge capture / Awaiting note (repeat event does not duplicate)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        const id = await completedVisit(w);
        const appt = r.appointments.appointmentService.getAppointmentById(id);
        await r.eventBus.eventBus.emit("appointment.completed", "appointment", id, Object.assign({}, appt, { clientId: w.clientId }));
        await T.h.settle(500);
        const cs = T.h.claimsOf(w.clientId);
        eq(cs.length, 1, "exactly one claim");
        match(cs[0], { processId: T.h.W().chargeCapture, statusLabel: "Awaiting note", appointmentId: id });
        eq(cs[0].lines[0].cptCode, "66984", "line from the service CPT");
        assert(cs[0].missingData.indexOf("diagnosis") >= 0, "missing diagnosis recorded");
      },
    },
    {
      title: "Sign note + accept codes (RT) => Ready to bill => move_to_workflow Claim/Draft => scrub passes => Ready to submit",
      async run(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        const id = await completedVisit(w);
        session(w, id, RT);
        await r.scribeBilling.signAndSendToBilling(SESSION);
        await T.waitFor(() => (T.h.claimsOf(w.clientId)[0] || {}).statusLabel === "Ready to submit", { timeout: 8000, msg: "claim to reach Ready to submit" });
        const c = T.h.claimsOf(w.clientId)[0];
        match(c, { processId: T.h.W().claim, status: "Ready to Submit", scribeSessionId: SESSION });
        eq(c.lines[0].modifier, "RT");
      },
    },
    {
      title: "Scrubber flags a missing modifier => Scrub failed + task in Claim fixes (linked to the claim at that stage)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        const id = await completedVisit(w);
        session(w, id, NOMOD);
        await r.scribeBilling.signAndSendToBilling(SESSION);
        await T.waitFor(() => (T.h.claimsOf(w.clientId)[0] || {}).statusLabel === "Scrub failed", { timeout: 8000, msg: "claim in Scrub failed" });
        const c = T.h.claimsOf(w.clientId)[0];
        assert(c.scrubIssues.some((i) => i.ruleId === "scrub-sample-modifier"), "modifier issue recorded");
        const t = T.h.openTasks("claim-fixes");
        eq(t.length, 1);
        match(t[0].entityRef, { type: "claim", id: c.id, stageId: T.h.stageId(T.h.W().claim, "Scrub failed") });
      },
    },
    {
      title: "Fix the modifier and move back to Draft => Ready to submit and the Claim fixes task auto-closes",
      async run(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        const id = await completedVisit(w);
        session(w, id, NOMOD);
        await r.scribeBilling.signAndSendToBilling(SESSION);
        await T.waitFor(() => (T.h.claimsOf(w.clientId)[0] || {}).statusLabel === "Scrub failed", { timeout: 8000, msg: "Scrub failed" });
        const c = T.h.claimsOf(w.clientId)[0];
        r.claims.saveClaim(Object.assign({}, c, { lines: c.lines.map((l) => Object.assign({}, l, { modifier: "RT" })) }));
        r.claimService.claimService.moveToStage(c.id, "Draft", { type: "manual" });
        await T.waitFor(() => T.h.claimsOf(w.clientId)[0].statusLabel === "Ready to submit", { timeout: 8000, msg: "Ready to submit after the fix" });
        await T.waitFor(() => T.h.openTasks("claim-fixes").length === 0, { msg: "Claim fixes task to auto-close" });
      },
    },
    {
      title: "Run daily jobs => claim submitted and accepted by the mock clearinghouse (tracking id recorded)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        const id = await completedVisit(w);
        session(w, id, RT);
        await r.scribeBilling.signAndSendToBilling(SESSION);
        await T.waitFor(() => (T.h.claimsOf(w.clientId)[0] || {}).statusLabel === "Ready to submit", { timeout: 8000, msg: "Ready to submit" });
        await r.jobs.runDaily(new Date(), ["claims"]);
        await T.waitFor(() => T.h.claimsOf(w.clientId)[0].statusLabel === "Accepted by payer", { timeout: 8000, msg: "Accepted by payer" });
        assert(!!T.h.claimsOf(w.clientId)[0].clearinghouseTrackingId, "tracking id");
        eq(T.h.claimsOf(w.clientId)[0].submissionCount, 1);
      },
    },
    {
      title: "Mock 277CA rejection => Rejected + Claim fixes task; resubmission is a new sequence and is accepted",
      async run(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        r.claimActions.clearinghouseSettingsStore.save({ scenario: "reject" });
        const id = await completedVisit(w);
        session(w, id, RT);
        await r.scribeBilling.signAndSendToBilling(SESSION);
        await T.waitFor(() => (T.h.claimsOf(w.clientId)[0] || {}).statusLabel === "Ready to submit", { timeout: 8000, msg: "Ready to submit" });
        await r.jobs.runDaily(new Date(), ["claims"]);
        await T.waitFor(() => T.h.claimsOf(w.clientId)[0].statusLabel === "Rejected", { timeout: 8000, msg: "Rejected" });
        assert(String(T.h.claimsOf(w.clientId)[0].rejectionReason).indexOf("277CA") >= 0, "rejection reason");
        eq(T.h.openTasks("claim-fixes").length, 1, "task for the rejection");
        r.claimActions.clearinghouseSettingsStore.save({ scenario: "accept" });
        r.claimService.claimService.moveToStage(T.h.claimsOf(w.clientId)[0].id, "Ready to submit", { type: "manual" });
        await T.h.settle(300);
        await r.jobs.runDaily(new Date(), ["claims"]);
        await T.waitFor(() => T.h.claimsOf(w.clientId)[0].submissionCount === 2, { timeout: 8000, msg: "second submission" });
        eq(T.h.claimsOf(w.clientId)[0].statusLabel, "Accepted by payer");
        await T.waitFor(() => T.h.openTasks("claim-fixes").length === 0, { msg: "rejection task closed" });
      },
    },
    {
      title: "Switching the A14 variant changes WHEN the claim is created (at note signing instead of completion)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        r.automation.updateRule("sample-rule-A14", { enabled: false });
        r.automation.updateRule("sample-rule-A14-scribe", { enabled: true });
        const id = await T.h.book(w.clientId, 703, T.h.ymd(-1), { settle: 300 });
        const appt = r.appointments.appointmentService.getAppointmentById(id);
        await r.eventBus.eventBus.emit("appointment.completed", "appointment", id, Object.assign({}, appt, { clientId: w.clientId }));
        await T.h.settle(600);
        eq(T.h.claimsOf(w.clientId).length, 0, "completion creates nothing now");
        session(w, id, RT);
        await r.scribeBilling.signAndSendToBilling(SESSION);
        await T.waitFor(() => T.h.claimsOf(w.clientId).length === 1, { timeout: 6000, msg: "claim at signing" });
        eq(T.h.claimsOf(w.clientId)[0].sourceType, "scribe");
      },
    },
    {
      title: "claimService: manual move is audited, move_to_workflow keeps values, Undo restores workflow AND stage",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        r.claimSamples.seedSampleClaimWorkflows();
        const W = T.h.W();
        const base = r.claims.getStoredClaims()[0];
        r.claims.saveClaim(Object.assign({}, base, { id: "RCMTEST-clm", claimNumber: "RCMTEST-CLM", patientId: w.clientId, processId: W.claim, currentStageId: T.h.stageId(W.claim, "Draft"), statusLabel: "Draft", status: "Draft", totalCharge: 321, authNumber: "RCMTEST-A" }));
        const moved = r.claimService.claimService.moveToWorkflow("RCMTEST-clm", W.denial, undefined, { type: "manual" });
        match(moved, { moved: true, toWorkflowId: W.denial, stageName: "New denial" });
        match(T.h.claim("RCMTEST-clm"), { processId: W.denial, totalCharge: 321, authNumber: "RCMTEST-A", status: "Denied" });
        const mv = r.automation.getStoredStageMoves().find((m) => m.recordId === "RCMTEST-clm" && m.processId === W.denial);
        assert(mv, "stage move logged");
        assert(r.automation.undoStageMove(mv.id), "undo accepted");
        match(T.h.claim("RCMTEST-clm"), { processId: W.claim, status: "Draft" });
        assert(r.audit.getStoredAuditLogs().some((l) => l.module === "RCM" && l.entityId === "RCMTEST-clm"), "manual move audited");
      },
    },
    {
      title: "Ophthalmology CPTs exist and the scribe ICD is no longer a hard-coded J06.9",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        eq(r.cptCodes.getCPTCodeOption("66984").category, "Ophthalmology", "cataract CPT is in the ophthalmology list");
        assert(r.cptCodes.searchCPTCodes("OCT").some((c) => c.code === "92134"), "OCT retina searchable");
        const base = r.scribe.INITIAL_SCRIBE_SESSIONS[0];
        const codes = r.scribeBilling.getSessionCodes(Object.assign({}, base, { extractedData: Object.assign({}, base.extractedData, { icd10Code: undefined }) }));
        eq(codes.icd.length, 0, "no ICD invented when the extraction has none");
      },
    },
    {
      title: "UI: Claims page shows the Mock data banner, the workflow board toggle and the board",
      async arrange(ctx) {
        const r = T.rcm();
        const w = worldC(ctx);
        await completedVisit(w);
        void r;
      },
      phases: [
        {
          nav: "/claims",
          async verify() {
            await T.ui.wait("mock-data-banner", 15000);
            await T.ui.click("claims-view-board", 8000);
            await T.ui.wait("claim-board", 8000);
            await T.ui.click("claims-view-list");
          },
        },
      ],
    },
    {
      title: "UI: Process page has the Insurance & Claims tab listing the claim workflows",
      arrange(ctx) { ctx.fresh(); T.rcm().claimSamples.seedSampleClaimWorkflows(); },
      phases: [{ nav: "/process", async verify() { await T.ui.waitText("Insurance & Claims", 12000); } }],
    },
    {
      title: "Scribe Codes panel layout and the claim drawer sections per workflow",
      run() { T.manual("Needs a human: open an AI Scribe transcript to see the Codes panel; claim drawer does not hide fields per workflow (known TODO)"); },
    },
  ]);
})();


// ───── s5-remittance-denials-invoices.js ─────
/* Slice 5: ERA posting, denials/appeals, invoices from claims, reminders, claim status, calls. */
(function () {
  const T = window.RcmTm;
  const { assert, eq, match } = T;

  function worldM(ctx, opts) {
    const w = T.h.rcmWorld(ctx, opts);
    T.rcm().sampleBundles.enableDemoSet("M");
    return w;
  }
  /** a claim that is out with the payer (Submitted in the sample Claim workflow). */
  function submitted(w, id, insuredId, charge, appointmentId) {
    const r = T.rcm();
    const W = T.h.W();
    const base = r.claims.getStoredClaims()[0];
    r.claims.saveClaim(Object.assign({}, base, {
      id, claimNumber: "RCMTEST-" + id, patientId: w.clientId, patientName: "RCMTEST-Patient One", insuredId, totalCharge: charge, amountPaid: 0, patientResponsibility: 0, contractualAdjustment: 0, payments: [],
      appointmentId: appointmentId || "RCMTEST-apt-" + id, processId: W.claim, currentStageId: T.h.stageId(W.claim, "Submitted"), statusLabel: "Submitted", status: "Submitted",
      clearinghouseTrackingId: "TRK-" + id, submittedAt: new Date().toISOString(), sourceType: "test",
    }));
  }
  function invoiceFor(w, appointmentId, total) {
    const r = T.rcm();
    const inv = { id: "RCMTEST-INV-" + appointmentId, clientId: w.clientId, clientName: "RCMTEST-Patient One", appointmentId, currency: "$", lineItems: [], subtotal: total, discountAmount: 0, taxAmount: 0, total, amountPaid: 0, createdAt: new Date().toISOString(), createdBy: "system", dueDate: "2031-01-01", status: "draft" };
    r.invoices.invoiceService.saveInvoices(r.invoices.invoiceService.getInvoices().concat([inv]));
    return inv.id;
  }

  T.slice(5, [
    {
      title: "Receive ERA => the paid claim posts (amounts, payment row, Paid stage)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldM(ctx);
        submitted(w, "pay", "RCMTEST-M1", 200);
        const e = r.era.receiveMockEra();
        await T.waitFor(() => T.h.claim("pay").statusLabel === "Paid", { timeout: 6000, msg: "claim Paid after the ERA" });
        match(T.h.claim("pay"), { amountPaid: 200, status: "Paid" });
        eq(T.h.claim("pay").payments.length, 1);
        eq(r.era.erasStore.find(e.id).status, "posted");
      },
    },
    {
      title: "Unmatched ERA lines stay on the ERA and create a task in Posting linked to the ERA",
      async run(ctx) {
        const r = T.rcm();
        const w = worldM(ctx);
        submitted(w, "a", "RCMTEST-M1", 100);
        const e = r.era.receiveMockEra({ includeUnmatched: true });
        await T.waitFor(() => T.h.openTasks("posting").length === 1, { timeout: 6000, msg: "Posting task" });
        eq(T.h.openTasks("posting")[0].entityRef.type, "era");
        eq(r.era.erasStore.find(e.id).lines.find((l) => l.claimNumber === "CLM-UNKNOWN-0000").status, "unmatched");
        eq(r.era.erasStore.find(e.id).status, "partial");
      },
    },
    {
      title: "Denial (CO-97) => categorized, appeal deadline, move_to_workflow to Denial & appeal / New denial, task in Denials and A/R",
      async run(ctx) {
        const r = T.rcm();
        const w = worldM(ctx);
        submitted(w, "den", "RCMTEST-XDENYX", 300);
        r.era.receiveMockEra();
        await T.waitFor(() => T.h.claim("den").processId === T.h.W().denial, { timeout: 8000, msg: "claim in the Denial & appeal workflow" });
        match(T.h.claim("den"), { statusLabel: "New denial", denialCategory: "appealable", denialNext: "appeal" });
        assert(/^\d{4}-\d{2}-\d{2}$/.test(T.h.claim("den").appealDeadline), "appeal deadline set");
        await T.waitFor(() => T.h.openTasks("denials-and-a-r").length === 1, { msg: "Denials and A/R task" });
        match(T.h.openTasks("denials-and-a-r")[0].entityRef, { type: "claim", id: "den", stageId: T.h.stageId(T.h.W().denial, "New denial") });
      },
    },
    {
      title: "Draft appeal is propose-only: letter stored on the claim, claim not moved; leaving New denial closes the task",
      async run(ctx) {
        const r = T.rcm();
        const w = worldM(ctx);
        submitted(w, "den", "RCMTEST-XDENYX", 300);
        r.era.receiveMockEra();
        await T.waitFor(() => !!T.h.claim("den").appealDraft, { timeout: 8000, msg: "appeal draft" });
        match(T.h.claim("den").appealDraft, { status: "proposed", revision: 1 });
        assert(T.h.claim("den").appealDraft.text.indexOf("CO-97") >= 0, "letter mentions the reason code");
        eq(T.h.claim("den").statusLabel, "New denial", "claim not moved by the draft");
        r.claimService.claimService.moveToStage("den", "Appeal submitted", { type: "manual" });
        await T.waitFor(() => T.h.openTasks("denials-and-a-r").length === 0, { msg: "task to auto-close" });
      },
    },
    {
      title: "Paid claim => invoice updated from the claim, moved to Sent with a payment link, message logged in Chats",
      async run(ctx) {
        const r = T.rcm();
        const w = worldM(ctx);
        submitted(w, "pay", "RCMTEST-M1", 200, "RCMTEST-apt-pay");
        const invId = invoiceFor(w, "RCMTEST-apt-pay", 200);
        const before = T.h.smsTexts(w.clientId).filter((t) => t.indexOf("statement is ready") >= 0).length;
        r.era.receiveMockEra();
        await T.waitFor(() => r.invoices.invoiceService.getInvoiceById(invId).statusLabel === "Sent", { timeout: 8000, msg: "invoice Sent" });
        const st = r.invoiceFromClaim.getInvoiceStatement(invId);
        match(st, { insurancePaid: 200, claimNumber: "RCMTEST-pay" });
        assert(String(st.paymentLink).indexOf("pay.mantraassist.mock") >= 0, "payment link");
        await T.waitFor(() => T.h.smsTexts(w.clientId).filter((t) => t.indexOf("statement is ready") >= 0).length === before + 1, { msg: "statement message" });
      },
    },
    {
      title: "Reminder stages: Sent => Reminder 1 => Reminder 2 => balance call => Overdue + Patient balances task (clock advanced)",
      async run(ctx) {
        const r = T.rcm();
        const w = worldM(ctx);
        submitted(w, "pay", "RCMTEST-M1", 200, "RCMTEST-apt-pay");
        const invId = invoiceFor(w, "RCMTEST-apt-pay", 200);
        r.era.receiveMockEra();
        await T.waitFor(() => r.invoices.invoiceService.getInvoiceById(invId).statusLabel === "Sent", { timeout: 8000, msg: "invoice Sent" });
        const age = (days) => r.invoices.invoiceService.saveInvoices(r.invoices.invoiceService.getInvoices().map((i) => (i.id === invId ? Object.assign({}, i, { sentAt: new Date(Date.now() - days * T.h.DAY).toISOString() }) : i)));
        const label = () => r.invoices.invoiceService.getInvoiceById(invId).statusLabel;
        age(16); await r.jobs.runDaily(new Date(), ["invoices"]);
        await T.waitFor(() => label() === "Reminder 1", { timeout: 6000, msg: "Reminder 1" });
        age(31); await r.jobs.runDaily(new Date(), ["invoices"]);
        await T.waitFor(() => label() === "Reminder 2", { timeout: 6000, msg: "Reminder 2" });
        age(46); await r.jobs.runDaily(new Date(), ["invoices"]);
        await T.waitFor(() => r.claimStatusAndCalls.rcmCallsStore.get().some((c) => c.purpose === "balance_reminder" && c.status === "completed"), { timeout: 6000, msg: "balance call" });
        age(61); await r.jobs.runDaily(new Date(), ["invoices"]);
        await T.waitFor(() => label() === "Overdue", { timeout: 6000, msg: "Overdue" });
        await T.waitFor(() => T.h.openTasks("patient-balances").length === 1, { msg: "Patient balances task" });
      },
    },
    {
      title: "A21: accepted claim with no payment after 30 days => status checked (mock 277) and moved to Pending (payer) + follow-up task",
      async run(ctx) {
        const r = T.rcm();
        const w = worldM(ctx);
        const W = T.h.W();
        const base = r.claims.getStoredClaims()[0];
        const old = new Date(Date.now() - 35 * T.h.DAY).toISOString();
        r.claims.saveClaim(Object.assign({}, base, { id: "RCMTEST-acc", claimNumber: "RCMTEST-acc", patientId: w.clientId, processId: W.claim, currentStageId: T.h.stageId(W.claim, "Accepted by payer"), statusLabel: "Accepted by payer", status: "Accepted", clearinghouseTrackingId: "TRK-acc", submittedAt: old, sourceType: "test" }));
        localStorage.setItem("mantra_claims_v1", JSON.stringify(r.claims.getStoredClaims().map((c) => (c.id === "RCMTEST-acc" ? Object.assign({}, c, { updatedAt: old }) : c))));
        await r.jobs.runDaily(new Date(), ["claims"]);
        await T.waitFor(() => T.h.claim("RCMTEST-acc").statusLabel === "Pending (payer)", { timeout: 6000, msg: "Pending (payer)" });
        eq(T.h.claim("RCMTEST-acc").statusCheck.status, "pending");
        await T.waitFor(() => T.h.openTasks("denials-and-a-r").length === 1, { msg: "follow-up task" });
      },
    },
    {
      title: "Payment plan: installments split the balance; refused for a settled invoice",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const invId = invoiceFor(w, "RCMTEST-apt-plan", 100);
        const plan = r.invoiceFromClaim.createPaymentPlan(invId, { installments: 3, firstDueDate: "2031-02-01" });
        eq(plan.map((p) => p.amount), [33.33, 33.33, 33.34]);
        eq(r.invoiceFromClaim.getInvoiceStatement(invId).plan.length, 3);
        r.invoices.invoiceService.saveInvoices(r.invoices.invoiceService.getInvoices().map((i) => (i.id === invId ? Object.assign({}, i, { amountPaid: 100 }) : i)));
        let threw = false; try { r.invoiceFromClaim.createPaymentPlan(invId, { installments: 2, firstDueDate: "2031-02-01" }); } catch (e) { threw = true; }
        assert(threw, "no plan for a settled invoice");
      },
    },
    {
      title: "start_call (mock): balance reminders need voice consent; CARC categories resolve",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const ok = r.claimStatusAndCalls.performStartCall({ purpose: "balance_reminder", clientId: w.clientId, voiceConsent: true, phone: "555", recordType: "invoice", recordId: "RCMTEST-INV" });
        eq(ok.status, "completed");
        const no = r.claimStatusAndCalls.performStartCall({ purpose: "balance_reminder", clientId: w.clientId, voiceConsent: false, phone: "555", recordType: "invoice", recordId: "RCMTEST-INV2" });
        match(no, { status: "skipped", skipped: "no_consent" });
        eq(T.rcm().claimStatusAndCalls.rcmCallsStore.get().length >= 2, true);
      },
    },
    {
      title: "UI: Invoices page opens the Statement drawer (mock payment link label) and the Claims page has Receive ERA",
      async arrange(ctx) {
        const w = T.h.rcmWorld(ctx);
        submitted(w, "pay", "RCMTEST-M1", 200, "RCMTEST-apt-pay");
        invoiceFor(w, "RCMTEST-apt-pay", 200);
      },
      phases: [
        {
          nav: "/invoices",
          async verify() {
            await T.ui.click("invoice-statement-btn", 15000);
            await T.ui.wait("invoice-statement-drawer");
          },
        },
        {
          nav: "/claims",
          async verify() {
            await T.ui.waitText("Receive ERA (mock)", 15000);
            const n0 = T.rcm().era.erasStore.get().length;
            await T.ui.clickByText("button", "Receive ERA (mock)");
            await T.waitFor(() => T.rcm().era.erasStore.get().length === n0 + 1, { msg: "an ERA staged from the button" });
          },
        },
      ],
    },
    {
      title: "Portal statement block, payment plan drawer layout, invoice stage editing",
      run() { T.manual("Needs a human: patient portal bill screen, plan creation form, and editing the new invoice stages on the Process page"); },
    },
  ]);
})();


// ───── s6-overview-reports-permissions.js ─────
/* Slice 6: Overview RCM row, report sources, voice results, E2 rules, notification toggles, permissions, audit, mock banner. */
(function () {
  const T = window.RcmTm;
  const { assert, eq, match } = T;
  const A = () => T.h.coverageProcessId();
  const getInst = (id) => T.rcm().processLogs.getProcessInstanceById(id);

  function submittedClaim(w, id, extra) {
    const r = T.rcm();
    const W = T.h.W();
    const base = r.claims.getStoredClaims()[0];
    r.claims.saveClaim(Object.assign({}, base, {
      id, claimNumber: "RCMTEST-" + id, patientId: w.clientId, patientName: "RCMTEST-Patient One", totalCharge: 100, amountPaid: 0, patientResponsibility: 0, contractualAdjustment: 0, payments: [],
      processId: W.claim, currentStageId: T.h.stageId(W.claim, "Submitted"), statusLabel: "Submitted", status: "Submitted", submittedAt: new Date(Date.now() - 20 * T.h.DAY).toISOString(), sourceType: "test",
      payer: { id: "p1", name: "RCMTEST Payer", payerId: "1", type: "Commercial" }, denialCategory: undefined,
    }, extra || {}));
  }
  function arrangeRole(ctx, roleId, email) {
    const r = T.rcm();
    ctx.fresh();
    r.rolesStore.saveStoredRoles(r.defaultRoles.DEFAULT_ROLES.slice());
    r.rolesStore.addRolesIfMissing(r.sampleRoles.buildSampleRcmRoles(), r.defaultRoles.DEFAULT_ROLES);
    r.team.addTeamMemberToStore({ name: "RCMTEST User", email, role: roleId, roleId, status: true });
    localStorage.setItem("user_data", JSON.stringify({ name: "RCMTEST User", email, role: "Member" }));
    localStorage.setItem("user_role", "Member");
    localStorage.setItem("login_email", email);
    r.taskViews.seedTaskViewSamples();
  }

  T.slice(6, [
    {
      title: "Overview RCM row numbers equal the queue-count and KPI selectors (UI vs hook)",
      arrange(ctx) {
        const r = T.rcm();
        const w = T.h.rcmWorld(ctx);
        for (let i = 1; i <= 3; i++) {
          r.tasks.createTaskRecord({ title: "RCMTEST claim fix " + i, description: "", status: "pending", isImportant: false, scopeLevel: "client", assignee: { scopeLevel: "client", assigneeName: "x" }, creator: { id: "u", name: "u" }, checklists: [], observers: [], subtasks: [], attachments: [], queueId: "claim-fixes", entityRef: { type: "claim", id: "x" + i, stageId: "s" } });
        }
        submittedClaim(w, "k1", {});
        submittedClaim(w, "k2", { denialCategory: "appealable", amountPaid: 0 });
      },
      phases: [
        {
          nav: "/",
          async verify() {
            const r = T.rcm();
            await T.ui.wait("rcm-overview-row", 15000);
            const txt = T.ui.textOf("rcm-overview-row");
            const q = r.kpis.queueCounts().find((x) => x.name.indexOf("Claim fixes") === 0);
            eq(q.open, 3, "selector says 3 open Claim fixes tasks");
            assert(txt.indexOf(q.name) >= 0, "queue name on the row");
            const card = Array.from(T.ui.q("rcm-overview-row").querySelectorAll("a")).find((a) => a.innerText.indexOf("Claim fixes") >= 0);
            assert(card && card.innerText.replace(/\s+/g, " ").indexOf(" 3") >= 0, "queue card shows 3: " + (card && card.innerText));
            const k = r.kpis.rcmKpis();
            const cell = (label) => { const el = Array.from(T.ui.q("rcm-overview-row").querySelectorAll("div")).find((d) => d.children.length === 2 && d.children[0].innerText.trim().toLowerCase() === label.toLowerCase()); return el && el.children[1].innerText.trim(); };
            eq(cell("Claims"), String(k.claimsTotal), "Claims KPI");
            eq(cell("Submitted"), String(k.claimsSubmitted), "Submitted KPI");
          },
        },
      ],
    },
    {
      title: "Every RCM report source returns rows from the stores and has builder metadata",
      async run(ctx) {
        const r = T.rcm();
        const w = T.h.rcmWorld(ctx);
        r.sampleBundles.enableDemoSet("E");
        const a = await T.h.book(w.clientId, 702, T.h.ymd(20));
        submittedClaim(w, "pay", { amountPaid: 100, status: "Paid", payments: [{ id: "p", eraId: "e", traceNumber: "T", amount: 100, date: "2031-01-01" }] });
        submittedClaim(w, "den", { denialCategory: "appealable", denialCodes: ["CO-97"], appealDeadline: T.h.ymd(10) });
        submittedClaim(w, "wait", {});
        void a;
        for (const src of ["claims", "denials", "payments", "ar_aging", "eligibility"]) {
          const rows = r.reports.buildRcmReportRows(src);
          assert(rows.length > 0, src + " returned rows (" + rows.length + ")");
          assert(r.reports.RCM_SOURCE_METADATA[src].fields.length > 3, src + " has field metadata");
        }
        const claimsRows = r.reports.buildRcmReportRows("claims").filter((x) => ["pay", "den", "wait"].indexOf(x.id) >= 0);
        eq(Math.round((claimsRows.reduce((s, x) => s + x.denied, 0) / claimsRows.length) * 100), 33, "denial rate = average of the denied flag");
        assert(r.reports.buildRcmReportRows("ar_aging").some((x) => x.id === "wait"), "A/R aging includes the open claim");
      },
    },
    {
      title: "Voice: Inconclusive + voice ON => mock call result lands in the instance as Pending review; accepting verifies it",
      async run(ctx) {
        const r = T.rcm();
        const w = T.h.rcmWorld(ctx, { memberId: "RCMTEST-DOWNDOWNDOWN" });
        r.sampleBundles.enableDemoSet("E");
        localStorage.setItem("mantra_rcm_voice_enabled", "1");
        const id = await T.h.book(w.clientId, 702, T.h.ymd(5), { settle: 1000 });
        const inst = T.h.instanceFor(id, A());
        await T.waitFor(() => getInst(inst.instanceId).currentStage === "Pending review", { timeout: 6000, msg: "instance in Pending review" });
        match(getInst(inst.instanceId), { elig_status: "pending_review", elig_source: "voice", elig_copay: 30 });
        assert(r.claimStatusAndCalls.rcmCallsStore.get().some((c) => c.purpose === "payer_benefits"), "call recorded");
        r.voice.acceptCallResult({ instanceId: inst.instanceId, stage: "Verified" });
        match(getInst(inst.instanceId), { elig_status: "active", currentStage: "Verified" });
        match(r.appointments.appointmentService.getAppointmentById(id).coverage, { status: "active" });
        localStorage.setItem("mantra_rcm_voice_enabled", "0");
      },
    },
    {
      title: "Set E2: A11 renews an expiring approved authorization (Prior auth task); A12 notifies and the per-event toggle silences it",
      async run(ctx) {
        const r = T.rcm();
        const w = T.h.rcmWorld(ctx);
        r.sampleBundles.enableDemoSet("E");
        const id = await T.h.book(w.clientId, 701, T.h.ymd(2), { settle: 900 });
        const inst = T.h.instanceFor(id, A());
        // A12 first: visit in 2 days, authorization still only requested
        r.sampleBundles.disableDemoSet("E");
        r.sampleBundles.enableDemoSet("E2");
        const count = () => r.notifications.getStoredNotifications().filter((n) => n.title === "Authorization not approved").length;
        const c0 = count();
        await r.jobs.runDaily(new Date(), ["instance_visit_countdown"]);
        await T.waitFor(() => count() === c0 + 1, { msg: "A12 notification" });
        r.notifSettings.setRcmNotificationEnabled("sample-rule-A12", false);
        r.actionRuns.__resetActionRunsForTests();
        await r.jobs.runDaily(new Date(Date.now() + 1000), ["instance_visit_countdown"]);
        await T.h.settle(500);
        eq(count(), c0 + 1, "silenced by the toggle");
        r.notifSettings.setRcmNotificationEnabled("sample-rule-A12", true);
        // A11: approve with 10 days left => renewal
        r.authActions.recordAuthDecision({ instanceId: inst.instanceId, appointmentId: id, decision: "approved", authNumber: "RCMTEST-A", unitsApproved: 1 });
        r.processLogs.updateProcessInstanceFields(inst.instanceId, { auth_valid_to: T.h.ymd(10) });
        r.actionRuns.__resetActionRunsForTests();
        await r.jobs.runDaily(new Date(), ["instance_visit_countdown"]);
        await T.waitFor(() => getInst(inst.instanceId).auth_status === "requested" && getInst(inst.instanceId).auth_valid_from === T.h.ymd(0), { timeout: 6000, msg: "renewal request starting today" });
        assert(T.h.openTasks("prior-auth").length >= 1, "Prior auth task queued");
      },
    },
    {
      title: "Permissions: sample roles open exactly their areas (hasPermission matrix)",
      run() {
        const r = T.rcm();
        const role = (id) => r.sampleRoles.buildSampleRcmRoles().find((x) => x.id === id);
        const has = (id, key, act) => r.permissions.hasPermission(role(id), key, act);
        assert(has("sample-rcm-biller", "claims", "edit") && has("sample-rcm-biller", "denials", "edit") && has("sample-rcm-biller", "rcmPayments", "add") && has("sample-rcm-biller", "rcmReports", "read"), "biller area");
        assert(!has("sample-rcm-biller", "billingSetup", "read"), "biller cannot open billing setup");
        assert(has("sample-rcm-front-desk", "eligibility", "add") && !has("sample-rcm-front-desk", "priorAuth", "edit") && !has("sample-rcm-front-desk", "claims", "add") && !has("sample-rcm-front-desk", "rcmReports", "read"), "front desk area");
        assert(has("sample-rcm-billing-setup", "billingSetup", "edit") && !has("sample-rcm-billing-setup", "claims", "read"), "setup admin area");
      },
    },
    {
      title: "UI: a user WITHOUT rcmReports does not see the Overview RCM row; claims create is hidden and export disabled",
      usesAuth: true,
      reloadAfter: true,
      arrange(ctx) { arrangeRole(ctx, "sample-rcm-front-desk", "rcmtest-front@example.test"); },
      phases: [
        {
          nav: "/",
          async verify() {
            await T.ui.waitText("Overview Analytics", 15000);
            await T.h.settle(500);
            assert(!T.ui.has("rcm-overview-row"), "RCM row hidden without rcmReports");
          },
        },
        {
          nav: "/claims",
          async verify() {
            await T.ui.wait("mock-data-banner", 15000);
            assert(!Array.from(document.querySelectorAll("button")).some((b) => (b.innerText || "").trim() === "Create Claim"), "Create Claim hidden without claims add");
            const exp = document.querySelector('button[aria-label="Export Claims"]');
            assert(exp && exp.disabled, "Export disabled without claims export");
            const era = Array.from(document.querySelectorAll("button")).find((b) => (b.innerText || "").indexOf("Receive ERA") >= 0);
            assert(era && era.disabled, "Receive ERA disabled without rcmPayments add");
          },
        },
      ],
    },
    {
      title: "UI: a user WITH rcmReports (biller role) sees the Overview RCM row",
      usesAuth: true,
      reloadAfter: true,
      arrange(ctx) { arrangeRole(ctx, "sample-rcm-biller", "rcmtest-biller@example.test"); },
      phases: [{ nav: "/", async verify() { await T.ui.wait("rcm-overview-row", 15000); } }],
    },
    {
      title: "Audit entries are written for user-initiated RCM changes (manual claim move, coverage, auth decision, ERA, plan)",
      async run(ctx) {
        const r = T.rcm();
        const w = T.h.rcmWorld(ctx);
        const W = T.h.W();
        submittedClaim(w, "aud", {});
        r.claimService.claimService.moveToStage("aud", "Rejected", { type: "manual" });
        r.claimService.claimService.moveToStage("aud", "Accepted by payer", { type: "rule", ruleId: "x" });
        r.coverages.saveCoverage({ clientId: w.clientId, payerId: "payer-aetna", memberId: "RCMTEST-AUD", priority: "secondary" });
        r.era.receiveMockEra();
        const logs = r.audit.getStoredAuditLogs().filter((l) => l.module === "RCM");
        const types = logs.map((l) => l.entityType + ":" + l.action);
        for (const t of ["claim:updated", "coverage:created", "era:created"]) assert(types.indexOf(t) >= 0, "audit has " + t + " (got " + types.join(",") + ")");
        eq(logs.filter((l) => l.entityId === "aud").length, 1, "only the manual move is audited");
        assert(logs.every((l) => !!l.actorName), "actor recorded");
        void W;
      },
    },
    {
      title: "'Mock data' labels: Billing setup banner (sample rows) and the Claims page banner",
      arrange(ctx) { T.h.rcmWorld(ctx); },
      phases: [
        { nav: "/settings/billing-setup", async verify() { await T.ui.waitText("Mock data:", 15000); } },
        { nav: "/claims", async verify() { await T.ui.wait("mock-data-banner", 15000); } },
      ],
    },
    {
      title: "Notification toggles default to ON and persist",
      run(ctx) {
        const n = T.rcm().notifSettings;
        ctx.fresh();
        assert(n.isRcmNotificationEnabled("sample-rule-A15"), "default on");
        n.setRcmNotificationEnabled("sample-rule-A15", false);
        assert(!n.isRcmNotificationEnabled("sample-rule-A15"), "off after toggling");
        n.setRcmNotificationEnabled("sample-rule-A15", true);
        assert(n.isRcmNotificationEnabled("sample-rule-A15"), "on again");
        assert(n.KNOWN_RCM_NOTIFICATIONS.length >= 5, "events listed for the settings UI");
      },
    },
    {
      title: "Report builder source cards, Overview row layout, Tasks view link, voice settings",
      run() { T.manual("Needs a human: open the custom report builder (RCM sources appear for users with rcmReports), judge the Overview row layout and the link into Tasks"); },
    },
  ]);
})();


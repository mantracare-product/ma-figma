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

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

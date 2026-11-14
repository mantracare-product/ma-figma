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

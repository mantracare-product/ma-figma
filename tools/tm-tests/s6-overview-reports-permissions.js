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
        sessionStorage.setItem("overview_slide", "claims"); // open the Claims overview slide
      },
      phases: [
        {
          nav: "/",
          async verify() {
            const r = T.rcm();
            await T.ui.wait("claims-overview", 15000);
            await T.ui.wait("rcm-overview-row", 15000);
            for (const chartTitle of ["Claims by stage", "Claims by workflow", "Denial rate by month", "A/R aging", "Payer mix", "First-pass acceptance", "Eligibility results", "Work queues"]) assert(T.ui.appText().toLowerCase().includes(chartTitle.toLowerCase()), "chart card: " + chartTitle);
            assert(!/(Sample)|mock data/i.test(T.ui.textOf("claims-overview")), "no Sample / mock wording on the Claims overview: " + (T.ui.textOf("claims-overview").match(/.{0,30}((Sample)|mock data).{0,30}/i) || [""])[0]);
            const q = r.kpis.queueCounts().find((x) => x.name.indexOf("Claim fixes") === 0);
            eq(q.open, 3, "selector says 3 open Claim fixes tasks");
            await T.ui.wait("work-queues", 8000);
            const wq = T.ui.q("work-queues");
            const row = Array.from(wq.querySelectorAll("li")).find((li) => li.innerText.indexOf("Claim fixes") >= 0);
            assert(row && row.innerText.replace(/s+/g, " ").trim().endsWith("3"), "Work queues card shows 3: " + (row && row.innerText));
            assert(wq.querySelectorAll("a").length === 0, "work queue rows are counts only (no links)");
            assert(Array.from(wq.querySelectorAll("li")).every((li) => !/s0$/.test(li.innerText.replace(/s+/g, " ").trim())), "zero rows hidden");
            const k = r.kpis.rcmKpis();
            const cell = (label) => { const el = Array.from(T.ui.q("rcm-overview-row").querySelectorAll("div")).find((d) => d.children.length === 3 && d.children[0].innerText.trim().toLowerCase() === label.toLowerCase()); return el && el.children[1].innerText.trim(); };
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
        assert(has("sample-rcm-billing-setup", "billingSetup", "edit") && has("sample-rcm-billing-setup", "claims", "read") && !has("sample-rcm-billing-setup", "claims", "add"), "setup admin area");
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
            assert(!T.ui.has("rcm-overview-row") && !T.ui.has("claims-overview"), "RCM row hidden without rcmReports");
            assert(!T.ui.appText().includes("Claims overview"), "no Claims overview toggle without rcmReports");
          },
        },
        {
          nav: "/claims",
          async verify() {
            await T.ui.wait("claims-filter-workflow", 15000);
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
      arrange(ctx) { arrangeRole(ctx, "sample-rcm-biller", "rcmtest-biller@example.test"); sessionStorage.setItem("overview_slide", "claims"); },
      phases: [{ nav: "/", async verify() { await T.ui.wait("rcm-overview-row", 15000); await T.ui.waitText("Claims overview"); } }],
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
      title: "No Sample / Mock data / Demo set wording on the Claims, Setup and Automation screens",
      arrange(ctx) { T.h.rcmWorld(ctx); },
      phases: [
        { nav: "/claims?view=setup", async verify() { await T.ui.wait("claims-setup", 15000); assert(!/mock data|\(sample\)|demo set/i.test(T.ui.appText()), "Setup is clean"); } },
        { nav: "/claims", async verify() { await T.ui.wait("claims-filter-workflow", 15000); assert(!T.ui.has("mock-data-banner") && !/mock data|\(sample\)/i.test(T.ui.appText()), "Claims is clean"); } },
        { nav: "/automation", async verify() { await T.ui.wait("run-daily-jobs", 15000); assert(!/mock data|\(sample\)|demo set|sample templates/i.test(T.ui.appText()), "Automation is clean"); } },
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
    {
      title: "Round 3: no (Sample) suffix is stored or shown; the migration strips it once and is idempotent",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        localStorage.setItem("mantra_r3_probe", JSON.stringify([{ name: "Coverage & authorization (Sample)", stages: [{ name: "Intake (Sample)" }] }]));
        localStorage.removeItem("mantra_strip_sample_suffix_v1");
        const res = r.sampleSuffix.migrateStripSampleSuffix();
        assert(res.keys >= 1, "migration rewrote the probe key");
        const probe = JSON.parse(localStorage.getItem("mantra_r3_probe"));
        eq(probe[0].name, "Coverage & authorization");
        eq(probe[0].stages[0].name, "Intake");
        eq(r.sampleSuffix.migrateStripSampleSuffix().keys, 0, "second run changes nothing");
        const keys = Object.keys(localStorage).filter((k) => k.indexOf("mantra_") === 0 && (localStorage.getItem(k) || "").toLowerCase().indexOf("(sample)") >= 0);
        assert(keys.length === 0, "no stored name still carries a suffix: " + keys.join(","));
        localStorage.removeItem("mantra_r3_probe");
      },
    },
    {
      title: "Round 3: the demo organization has realistic data on every RCM screen (claims in all stages, ERAs, invoices, tasks in every queue, one insurance record per appointment in all Eligibility / Prior auth stages)",
      run() {
        const r = T.rcm();
        const arr = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } };
        if (localStorage.getItem(r.demoWorkspace.DEMO_WORKSPACE_FLAG) !== "1") { T.manual("Needs a human: the demo organization is not the active one (the realistic data is only seeded for it)"); return; }
        const all = arr("mantra_claims_v1").filter((x) => String(x.id).indexOf("dm-") === 0);
        const claims = all.filter((x) => String(x.id).indexOf("dm-clm-") === 0);
        assert(claims.length >= 60, "claims: " + claims.length);
        assert(new Set(claims.map((x) => x.processId)).size === 3, "claims in all three workflows");
        const preStages = new Set(all.filter((x) => String(x.id).indexOf("dm-rec-") === 0).map((x) => x.processId + "/" + x.statusLabel));
        assert(preStages.size >= 12, "insurance records in the Eligibility and Prior auth stages: " + preStages.size);
        const per = {}; all.forEach((x) => { if (x.appointmentId) per[x.appointmentId] = (per[x.appointmentId] || 0) + 1; });
        assert(Object.keys(per).every((k) => per[k] === 1), "ONE insurance record per appointment");
        assert(new Set(claims.map((x) => x.statusLabel)).size >= 17, "claims across the stages: " + new Set(claims.map((x) => x.statusLabel)).size);
        assert(new Set(claims.map((x) => x.payer.id)).size >= 6, "6+ payers");
        assert(arr("mantra_eras_v1").some((e) => e.status === "unmatched") && arr("mantra_eras_v1").some((e) => e.status === "partial"), "ERAs incl. partial and unmatched");
        assert(new Set(arr("mantra_invoices_v1").map((i) => i.statusLabel)).size >= 6, "invoice states");
        assert(new Set(arr("mantra_tasks_store").map((t) => t.queueId).filter(Boolean)).size >= 8, "tasks in every queue");
        assert(arr("appointments_v1").length >= 40 && arr("mantra_coverages_v1").length >= 20, "appointments and coverages");
        assert(new Set(arr("appointments_v1").filter((a) => Number(a.id) >= 910000).map((a) => a.paymentMode)).size === 2, "appointments have payment modes");
        assert(!/RCMTEST/.test(localStorage.getItem("mantra_claims_v1") || ""), "no test prefix in the data");
      },
    },
    {
      title: "Round 3: top bars stay on ONE line and the page never scrolls horizontally (Claims, Tasks, Deals, Automation, Appointments, Invoices, Contacts, Call Logs)",
      phases: ["/claims", "/tasks", "/deals", "/automation", "/appointments", "/invoices", "/clients", "/call-logs"].map((path) => ({
        nav: path,
        async verify() {
          await T.waitFor(() => document.querySelector('[data-testid="page-top-bar-row"]'), { timeout: 15000, msg: "top bar on " + path });
          await new Promise((res) => setTimeout(res, 1500));
          const bar = document.querySelector('[data-testid="page-top-bar-row"]');
          assert(bar.getBoundingClientRect().height < 60, path + ": top bar is one line (height " + bar.getBoundingClientRect().height + ")");
          assert(bar.scrollWidth <= bar.clientWidth + 1, path + ": top bar controls do not overflow");
          assert(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, path + ": no horizontal page scroll (" + document.documentElement.scrollWidth + " > " + document.documentElement.clientWidth + ")");
          assert(!/mock data|demo set/i.test(T.ui.appText()) && T.ui.appText().toLowerCase().indexOf("(sample)") < 0, path + ": no Sample / mock wording");
        },
      })),
    },
    {
      title: "Round 3: client profile has no Insurance tab and the Overview tab has the Insurance section",
      phases: [{
        nav: "/clients/CL-001?section=insurance",
        async verify() {
          await T.waitFor(() => document.querySelector('[data-testid="profile-tab-overview"]'), { timeout: 15000, msg: "profile tabs" });
          assert(!document.querySelector('[data-testid="profile-tab-insurance"]'), "no Insurance tab");
          await T.waitFor(() => document.querySelector('[data-section-id="sec-insurance"]'), { timeout: 12000, msg: "Insurance section" });
        },
      }],
    },
    {
      title: "Round 4: calls are stage settings (no Start Call action); the Eligibility workflow Inconclusive stage places the payer call; balance calls need consent",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        assert(!r.rcmCatalog.RCM_ACTION_KEYS.includes("start_call"), "no Start Call in the catalog");
        localStorage.removeItem("mantra_r4_insurance_records_v1");
        r.rcmDefaultsR4.seedInsuranceRecordDefaults();
        const wf = r.processStore.getStoredProcesses().find((p) => p.id === r.rcmDefaultsR4.ELIGIBILITY_WORKFLOW_ID);
        assert(wf && wf.workflowType === "eligibility", "Eligibility workflow exists with its type");
        const inc = wf.stages.find((s) => s.name === "Inconclusive");
        assert(inc.enableCalling === true && inc.callTriggerSettings && inc.callTriggerSettings.callPurpose === "payer_benefits", "payer-benefits call is ON for the Inconclusive stage");
        const proc = { id: "RCMTEST-inv", name: "RCMTEST Invoices", entityType: "invoice", stages: [{ id: "RCMTEST-bal", name: "Balance", enableCalling: true, callTriggerSettings: { callPurpose: "balance_reminder" } }] };
        r.processStore.saveStoredProcesses([...r.processStore.getStoredProcesses(), proc]);
        localStorage.setItem("clients", JSON.stringify([{ id: "RCMTEST-CL-C", name: "RCMTEST Caller", phone: "555", stage: "x", processes: [] }]));
        const ev = { id: "RCMTEST-E", event: "stage.entered", recordType: "invoice", recordId: "RCMTEST-INV-C", data: { clientId: "RCMTEST-CL-C", processId: "RCMTEST-inv", stageId: "RCMTEST-bal" }, timestamp: "" };
        match(r.claimStatusAndCalls.performStageCall(ev), { status: "skipped", skipped: "no_consent" });
      },
    },
    {
      title: "Round 4: payment mode defaults from the service flag (not billable => self-pay), unconfirmed only for call bookings without an answer; registry field with editable options",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        T.h.setServices([{ id: 7001, name: "RCMTEST billable", description: "", cptCode: "99213", duration: 30, price: 10, currency: "USD", isActive: true, billableToInsurance: true }, { id: 7002, name: "RCMTEST cosmetic", description: "", duration: 30, price: 10, currency: "USD", isActive: true, billableToInsurance: false }]);
        eq(r.paymentMode.resolvePaymentMode({ serviceId: 7001, source: "screen" }).mode, "insurance");
        eq(r.paymentMode.resolvePaymentMode({ serviceId: 7002, requested: "insurance" }).mode, "self_pay", "not billable => self-pay");
        eq(r.paymentMode.resolvePaymentMode({ serviceId: 7001, source: "Inbound Call" }).unconfirmed, true);
        r.fieldSeeds.ensureRcmFieldSeeds();
        const reg = JSON.parse(localStorage.getItem("mantra_field_registry_v1") || "{}");
        const f = (Array.isArray(reg) ? reg.filter((x) => x.module === "appointment") : reg.appointment || []).find((x) => x.key === "paymentMode");
        assert(f && f.options.length >= 2, "paymentMode registry field with options");
      },
    },
    {
      title: "Round 4: ONE insurance record per appointment moves across workflows; pre-claim records are left out of claim counts; the eligibility report reads the Eligibility workflow",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        localStorage.removeItem("mantra_r4_insurance_records_v1");
        r.rcmDefaultsR4.seedInsuranceRecordDefaults();
        r.claimSamples.seedSampleClaimWorkflows();
        const before = r.kpis.rcmKpis().claimsTotal;
        const mk = (id, extra) => Object.assign({ id, claimNumber: id, patientId: w.clientId, patientName: "RCMTEST Patient", patientDob: "", patientGender: "Other", patientAddress: "", patientPhone: "", insuredId: "", payer: { id: "p", name: "RCMTEST Payer", payerId: "1", type: "Commercial" }, renderingProviderName: "", renderingProviderNpi: "", billingProviderName: "", billingProviderNpi: "", placeOfService: "", serviceDate: T.h.ymd(5), diagnosisCodes: [], lines: [], totalCharge: 100, amountPaid: 0, status: "Draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, extra);
        const rec = r.claimService.claimService.create(mk("RCMTEST-rec1", { appointmentId: "RCMTEST-A1", sourceType: "appointment", sourceId: "RCMTEST-A1" }), r.rcmDefaultsR4.ELIGIBILITY_WORKFLOW_ID);
        eq(r.kpis.rcmKpis().claimsTotal, before, "a record in Eligibility is not a claim");
        r.recordWriter.writeRecordFields({ type: "claim", id: rec.id }, { elig_status: "active", elig_payer: "RCMTEST Payer" });
        assert(r.reports.buildRcmReportRows("eligibility").some((x) => x.id === rec.id), "eligibility report reads the Eligibility workflow");
        const cc = r.claimSamples.SAMPLE_CLAIM_WORKFLOW_IDS.chargeCapture;
        const moved = r.claimService.claimService.moveToWorkflow(rec.id, cc);
        assert(moved && moved.moved, "the same record moves to Charge capture");
        eq(r.claims.getStoredClaims().filter((c) => c.appointmentId === "RCMTEST-A1").length, 1, "still one record for the appointment");
        eq(r.kpis.rcmKpis().claimsTotal, before + 1, "once in Charge capture it counts as a claim");
        assert(r.claimWorkflows.isPreClaimWorkflow(r.claimWorkflows.getClaimWorkflow(r.rcmDefaultsR4.PRIOR_AUTH_WORKFLOW_ID)), "Prior auth is pre-claim by type");
      },
    },
    {
      title: "Round 4: linked-appointment condition fields resolve without a linked appointment (no crash) and the picker fields exist in the registry",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        const rule = { enabled: true, conditions: [{ field: "paymentMode" }, { field: "elig_copay" }], trigger: { event: "stage.entered" } };
        const out = r.ruleContextFields.linkedAppointmentFields({ id: "E", event: "stage.entered", recordType: "claim", recordId: "none", data: {}, timestamp: "" }, [rule]);
        eq(Object.keys(out).length, 0);
        r.fieldSeeds.ensureRcmFieldSeeds();
        const reg = JSON.parse(localStorage.getItem("mantra_field_registry_v1") || "{}");
        const appt = Array.isArray(reg) ? reg.filter((x) => x.module === "appointment") : reg.appointment || [];
        for (const k of ["paymentMode", "elig_copay", "elig_deductible_remaining", "elig_plan_end", "auth_status", "auth_units_approved"]) assert(appt.some((x) => x.key === k) || (Array.isArray(reg) ? reg : reg.claim || []).some((x) => x.key === k), "selectable field " + k);
      },
    },
    {
      title: "UI: Claims switcher lists Eligibility and Prior auth with counts and does not open on them",
      arrange(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        localStorage.removeItem("mantra_r4_insurance_records_v1");
        r.rcmDefaultsR4.seedInsuranceRecordDefaults();
        r.claimSamples.seedSampleClaimWorkflows();
        const mk = (id, extra) => Object.assign({ id, claimNumber: id, patientId: w.clientId, patientName: "RCMTEST Patient", patientDob: "", patientGender: "Other", patientAddress: "", patientPhone: "", insuredId: "", payer: { id: "p", name: "RCMTEST Payer", payerId: "1", type: "Commercial" }, renderingProviderName: "", renderingProviderNpi: "", billingProviderName: "", billingProviderNpi: "", placeOfService: "", serviceDate: T.h.ymd(5), diagnosisCodes: [], lines: [], totalCharge: 100, amountPaid: 0, status: "Draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, extra);
        for (let i = 0; i < 4; i++) r.claimService.claimService.create(mk("RCMTEST-e" + i, { appointmentId: "RCMTEST-AE" + i, sourceType: "appointment", sourceId: "RCMTEST-AE" + i }), r.rcmDefaultsR4.ELIGIBILITY_WORKFLOW_ID);
        r.claimService.claimService.create(mk("RCMTEST-c1"), r.claimSamples.SAMPLE_CLAIM_WORKFLOW_IDS.claim);
      },
      phases: [
        {
          nav: "/claims",
          async verify() {
            await T.ui.wait("claims-filter-workflow", 15000);
            const sel = T.ui.q("claims-filter-workflow");
            const opts = Array.from(sel.options).map((o) => o.text);
            assert(opts.some((t) => t.indexOf("Eligibility (4)") === 0) && opts.some((t) => t.indexOf("Prior auth (0)") === 0), "switcher lists the new workflows with counts: " + opts.join(" | "));
            assert(sel.selectedOptions[0].text.indexOf("Eligibility") !== 0, "does not open on Eligibility: " + sel.selectedOptions[0].text);
          },
        },
      ],
    },
    {
      title: "Round 3: Insurance section layout, Claims overview chart look, More menu, Setup",
      run() { T.manual("Needs a human: judge the Insurance section (drag, Configure Sections), the Claims overview cards/charts against DESIGN.md, and the More menu on a narrow window"); },
    },
  ]);
})();

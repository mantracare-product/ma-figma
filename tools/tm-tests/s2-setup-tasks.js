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
      title: "Setup stores: payers, fee schedules, claim defaults, scrub rules, provider credentials save and load; billing entity and POS live on the organization",
      run(ctx) {
        const b = T.rcm().billing;
        ctx.fresh();
        const ob = T.rcm().orgBilling;
        ob.saveOrgBilling(ob.getActiveOrgId(), { legalName: "RCMTEST LLC", ein: "99-9999999", groupNpi: "1234567893", taxonomy: "207W00000X", address: "1 Test St", phone: "5550" });
        eq(ob.getOrgBilling().ein, "99-9999999");
        assert(ob.hasBillingEntity(), "legal name + group NPI = complete billing entity");
        b.payersStore.upsert({ id: "RCMTEST-payer", name: "RCMTEST Payer", payerIdCode: "RT1", enrollment: { status: "enrolled" } });
        eq(b.getPayer("RCMTEST-payer").name, "RCMTEST Payer");
        b.feeSchedulesStore.upsert({ id: "RCMTEST-fee", name: "fees", payerId: "RCMTEST-payer", lines: [{ cpt: "99214", amount: 111 }] });
        eq(b.lookupFee("99214", "RCMTEST-payer"), 111, "payer fee");
        b.claimDefaultsStore.save({ frequencyCode: "1", defaultPos: "11", acceptAssignment: true, timelyFilingDays: 120, defaultBillingLocationId: "" });
        eq(b.claimDefaultsStore.get().timelyFilingDays, 120);
        b.scrubRulesStore.upsert({ id: "RCMTEST-scrub", name: "r", check: "icd_required", severity: "error", enabled: true });
        eq(b.scrubRulesStore.get().length, 1);
        b.providerCredentialsStore.upsert({ id: "RCMTEST-prov", npi: "1111111112", taxonomy: "t", licenseNumber: "L", licenseState: "CA" });
        eq(b.getProviderCredential("RCMTEST-prov").npi, "1111111112");
      },
    },
    {
      title: "UI: Insurance & Claims > Setup has its sections and no Billing entity / Locations sections",
      arrange(ctx) { ctx.fresh(); },
      phases: [
        {
          nav: "/claims?view=setup",
          async verify() {
            await T.ui.wait("claims-setup", 12000);
            for (const id of ["payers", "fees", "defaults", "scrub", "providers", "notifications"]) assert(T.ui.has("billing-section-" + id), "section button " + id);
            for (const id of ["entity", "locations"]) assert(!T.ui.has("billing-section-" + id), "no " + id + " section (organization is the source)");
            assert(!/mock data|\(sample\)/i.test(T.ui.appText()), "no mock / sample wording on the Setup page");
          },
        },
      ],
    },
    {
      title: "Claim builder reads the billing entity and POS from the organization record",
      run(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        const ob = r.orgBilling;
        ob.saveOrgBilling(ob.getActiveOrgId(), { legalName: "RCMTEST Org LLC", ein: "99-1234567", groupNpi: "1234567893", address: "9 Org Way" });
        localStorage.setItem("mantra_org_locations_" + ob.getActiveOrgId(), JSON.stringify([{ id: "RCMTEST-L1", name: "RCMTEST Main", type: "physical", address: "9 Org Way", pos: "22", isPrimary: true }]));
        r.billing.claimDefaultsStore.save({ frequencyCode: "1", defaultPos: "11", acceptAssignment: true, timelyFilingDays: 90, defaultBillingLocationId: "RCMTEST-L1" });
        const res = r.claimActions.performCreateClaim({ clientId: w.clientId, sourceType: "client", sourceId: "RCMTEST-org-src", linesFrom: "none", cause: { type: "manual" } });
        const c = T.h.claim(res.claimId);
        eq(c.billingProviderName, "RCMTEST Org LLC");
        eq(c.billingProviderNpi, "1234567893");
        eq(c.billingProviderTaxId, "99-1234567");
        eq(c.placeOfService, "22", "POS comes from the organization location");
        assert(res.missingData.indexOf("billing_entity") < 0, "billing entity not reported missing");
      },
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
      title: "UI: client has no Insurance tab; the Overview tab has an Insurance section listing the coverage; ?section=insurance opens it",
      arrange(ctx) {
        const r = T.rcm();
        const w = ctx.fresh();
        r.billing.seedBillingSetupSamples();
        r.coverages.saveCoverage({ clientId: w.clientId, payerId: "payer-bcbs", memberId: "RCMTEST-UIM1", priority: "primary" });
      },
      phases: [
        {
          nav: "/clients/RCMTEST-CL-1?section=insurance",
          async verify() {
            await T.ui.wait("profile-tab-overview", 12000);
            assert(!T.ui.q("profile-tab-insurance"), "no Insurance tab on the profile");
            await T.waitFor(() => document.querySelector('[data-section-id="sec-insurance"]'), { timeout: 12000, msg: "Insurance section on the Overview tab" });
            const sec = document.querySelector('[data-section-id="sec-insurance"]');
            const has = () => sec.innerText.indexOf("RCMTEST-UIM1") >= 0 || Array.from(sec.querySelectorAll("input,select,textarea")).some((i) => i.value === "RCMTEST-UIM1");
            await T.waitFor(has, { timeout: 8000, msg: "coverage member id in the Insurance section" });
            assert(!document.querySelector('[data-section-id="sec-billing-demographics"]'), "old Billing demographics section is gone");
          },
        },
      ],
    },
    {
      title: "RCM defaults are created once as ordinary items: rules enabled except outbound/alternates; edits and deletions are never undone",
      run(ctx) {
        const r = T.rcm();
        ctx.fresh();
        localStorage.removeItem(r.rcmDefaults.RCM_DEFAULTS_FLAG);
        const first = r.rcmDefaults.ensureRcmDefaults();
        assert(!first.already && first.rules > 20 && first.enabled > 10, "defaults created: " + JSON.stringify(first));
        const byId2 = (id) => r.automation.getStoredRules().find((x) => x.id === id);
        assert(byId2("sample-rule-A1").enabled, "A1 ships enabled");
        assert(!byId2("sample-rule-A9").enabled && !byId2("sample-rule-A18").enabled && !byId2("sample-rule-A29").enabled, "outbound rules (message / submit / call) ship off");
        assert(!byId2("sample-rule-A14-scribe").enabled, "alternates ship off");
        assert(r.automation.getStoredRules().every((x) => !/\(sample\)/i.test(x.name)), "no (Sample) in rule names");
        r.automation.updateRule("sample-rule-A1", { name: "RCMTEST edited A1", enabled: false });
        r.automation.deleteRule("sample-rule-A2");
        const second = r.rcmDefaults.ensureRcmDefaults();
        assert(second.already, "second run is a no-op");
        eq(byId2("sample-rule-A1").name, "RCMTEST edited A1", "rule edit kept");
        assert(!byId2("sample-rule-A2"), "deleted rule not brought back");
        eq(r.billing.getPayers().length, 15, "payers list seeded");
        eq(r.taskViews.taskViewsStore.get().length, 8, "8 queue views");
      },
    },
    {
      title: "UI: Automation page has no Sample templates panel or demo-set buttons; Run daily jobs and filters are in the top bar",
      arrange(ctx) { ctx.fresh(); },
      phases: [
        {
          nav: "/automation",
          async verify() {
            await T.ui.wait("run-daily-jobs", 12000);
            for (const id of ["sample-templates-panel", "load-sample-templates", "demo-set-E"]) assert(!T.ui.has(id), id + " must be gone");
            for (const id of ["automation-filter-entity", "automation-filter-trigger", "automation-filter-status"]) assert(T.ui.has(id), id + " present");
            assert(!/sample templates|enable demo set/i.test(T.ui.appText()), "no sample / demo-set wording");
          },
        },
        {
          nav: "/process",
          async verify() {
            await T.h.settle(1200);
            assert(!T.ui.has("sample-templates-panel") && !/sample templates|enable demo set/i.test(T.ui.appText()), "Process page has no Sample templates panel");
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
      title: "UI: Tasks page has no Queue selector or Save view; the queue task still lists (queueId / entityRef kept on the data)",
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
            await T.ui.waitText("RCMTEST queue task", 15000);
            assert(!T.ui.has("task-queue-bar") && !T.ui.has("task-queue-select"), "no Queue selector");
            assert(!/save view/i.test(T.ui.appText()), "no Save view button");
            assert(!/QUEUE/.test(Array.from(document.querySelectorAll("thead th")).map((t) => t.innerText).join(" ")), "no QUEUE column");
            const t = T.rcm().tasks.getStoredTasks().find((x) => x.title === "RCMTEST queue task");
            eq(t.queueId, "insurance-fixes", "queueId kept on the task");
            assert(t.entityRef && t.entityRef.instanceId, "entityRef kept on the task");
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

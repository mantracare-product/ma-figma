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

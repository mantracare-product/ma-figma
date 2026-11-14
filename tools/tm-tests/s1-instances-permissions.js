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

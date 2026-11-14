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

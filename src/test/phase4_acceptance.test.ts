// Polyfill localStorage, sessionStorage, and window for Node environment
const store: Record<string, string> = {};
const sessionStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

const mockSessionStorage = {
  getItem: (key: string) => sessionStore[key] ?? null,
  setItem: (key: string, val: string) => { sessionStore[key] = val; },
  removeItem: (key: string) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]); },
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).sessionStorage = mockSessionStorage;
(globalThis as any).window = {
  dispatchEvent: (event: any) => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).CustomEvent = class {
  type: string;
  detail: any;
  constructor(type: string, params: any = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};

async function runAcceptanceTest() {
  console.log("=== Phase 4: Appointments & Invoices Lifecycle Acceptance Test ===");

  // Dynamic import after polyfills
  const { appointmentService } = await import("../lib/appointmentService");
  const { invoiceService } = await import("../lib/invoiceService");
  const { getStoredStageMoves, undoStageMove } = await import("../lib/useAutomationStore");
  const { eventBus } = await import("../lib/eventBus");

  // Track events emitted
  const emittedEvents: string[] = [];
  eventBus.subscribeAll((evt) => {
    emittedEvents.push(`${evt.event}:${evt.recordType}:${evt.recordId}`);
  });

  // Step 1: Create appointment via screen/booking
  console.log("\n[Test 1] Booking appointment for Alice Walker...");
  const createResult = appointmentService.createAppointment({
    clientName: "Alice Walker",
    clientEmail: "alice@example.com",
    clientPhone: "+1-555-0199",
    employeeId: 1,
    date: "2026-10-15",
    time: "10:00 AM",
    duration: 60,
    title: "Initial Consultation",
    source: "screen",
  });
  const appt = createResult.appointment;

  console.log(`✓ Appointment created: ID=${appt.id}, stage=${appt.currentStageId} (${appt.statusLabel}), status=${appt.status}`);
  if (appt.currentStageId !== "appt-1") throw new Error(`Expected appt-1 but got ${appt.currentStageId}`);
  if (appt.status !== "scheduled") throw new Error(`Expected status 'scheduled' but got ${appt.status}`);

  // Step 2: Check invoice auto-generated idempotently in Draft
  console.log("\n[Test 2] Verifying draft invoice generation...");
  const invoicesAfterBooking = invoiceService.getInvoices();
  const linkedInvoice = invoicesAfterBooking.find((inv) => String(inv.appointmentId) === String(appt.id));
  if (!linkedInvoice) throw new Error("Invoice was not automatically generated for the appointment!");
  console.log(`✓ Invoice auto-created: ID=${linkedInvoice.id}, stage=${linkedInvoice.currentStageId} (${linkedInvoice.statusLabel}), subtotal=$${linkedInvoice.subtotal}, total=$${linkedInvoice.total}`);
  if (linkedInvoice.currentStageId !== "inv-1") throw new Error(`Expected invoice stage inv-1 (Draft) but got ${linkedInvoice.currentStageId}`);
  if (linkedInvoice.subtotal !== 150) throw new Error(`Expected invoice subtotal $150 but got ${linkedInvoice.subtotal}`);

  // Step 3: Reschedule the appointment
  console.log("\n[Test 3] Rescheduling appointment...");
  const rescheduledAppt = appointmentService.rescheduleAppointment(
    appt.id,
    "2026-10-20",
    "02:00 PM",
    "Client requested afternoon slot"
  );

  console.log(`✓ Appointment rescheduled: ID=${rescheduledAppt.id}, date=${rescheduledAppt.date}, time=${rescheduledAppt.time}, stage=${rescheduledAppt.currentStageId} (${rescheduledAppt.statusLabel})`);
  if (rescheduledAppt.id !== appt.id) throw new Error("Rescheduling created a new appointment record instead of updating in-place!");
  if (rescheduledAppt.date !== "2026-10-20" || rescheduledAppt.time !== "02:00 PM") throw new Error("Appointment date/time did not update correctly!");

  // Verify IDEMPOTENCY: ensure no 2nd invoice was generated
  console.log("\n[Test 4] Verifying idempotency (no 2nd invoice on reschedule)...");
  const invoicesAfterReschedule = invoiceService.getInvoices();
  const linkedInvoices = invoicesAfterReschedule.filter((inv) => String(inv.appointmentId) === String(appt.id));
  console.log(`✓ Linked invoices for appointment ${appt.id}: ${linkedInvoices.length}`);
  if (linkedInvoices.length !== 1) {
    throw new Error(`Idempotency violated! Expected exactly 1 invoice, found ${linkedInvoices.length}`);
  }

  // Step 5: Send Invoice
  console.log("\n[Test 5] Sending invoice via WhatsApp...");
  const sentInvoice = invoiceService.sendInvoice(linkedInvoice.id, "whatsapp");
  if (!sentInvoice) throw new Error("sendInvoice returned null!");
  console.log(`✓ Invoice sent: ID=${sentInvoice.id}, stage=${sentInvoice.currentStageId} (${sentInvoice.statusLabel}), status=${sentInvoice.status}`);
  if (sentInvoice.currentStageId !== "inv-2") throw new Error(`Expected invoice stage inv-2 (Sent) but got ${sentInvoice.currentStageId}`);

  // Step 6: Record Payment
  console.log(`\n[Test 6] Recording full payment of $${sentInvoice.total}...`);
  const paymentResult = invoiceService.recordPayment(sentInvoice.id, sentInvoice.total, "card_on_file", "Paid via online link");
  console.log(`✓ Payment recorded: amountPaid=$${paymentResult.invoice.amountPaid}, stage=${paymentResult.invoice.currentStageId} (${paymentResult.invoice.statusLabel}), status=${paymentResult.invoice.status}`);
  if (paymentResult.invoice.currentStageId !== "inv-5") throw new Error(`Expected inv-5 (Paid) but got ${paymentResult.invoice.currentStageId}`);
  if (paymentResult.invoice.status !== "paid") throw new Error(`Expected status 'paid' but got ${paymentResult.invoice.status}`);

  // Step 7: Check audit trail & 1-Click Undo
  console.log("\n[Test 7] Verifying Stage Movement Audit Trail & 1-Click Undo...");
  const stageMoves = getStoredStageMoves();
  console.log(`✓ Total recorded stage moves in audit trail: ${stageMoves.length}`);
  if (stageMoves.length === 0) throw new Error("No stage moves were logged in audit trail!");

  // The last move was invoice moving to Paid (inv-5) from Sent (inv-2)
  const lastMove = stageMoves[0];
  console.log(`✓ Most recent move: ${lastMove.recordType} ${lastMove.recordId} from ${lastMove.fromStageId} -> ${lastMove.toStageId} (cause: ${lastMove.cause?.ruleName})`);

  // Test 1-click Undo
  console.log("Testing 1-click Undo on last move...");
  const undoneMove = undoStageMove(lastMove.id);
  if (!undoneMove) throw new Error("undoStageMove returned null!");

  const invoiceAfterUndo = invoiceService.getInvoices().find((i) => i.id === linkedInvoice.id);
  console.log(`✓ Invoice stage after undo: ${invoiceAfterUndo?.currentStageId} (${invoiceAfterUndo?.statusLabel})`);
  if (invoiceAfterUndo?.currentStageId !== lastMove.fromStageId) {
    throw new Error(`Expected invoice stage to revert to ${lastMove.fromStageId}, but got ${invoiceAfterUndo?.currentStageId}`);
  }

  console.log("\n[Test 8] Checking Event Bus Activity...");
  console.log("Emitted events during flow:", emittedEvents);
  if (!emittedEvents.some((e) => e.startsWith("appointment.booked"))) throw new Error("appointment.booked event missing!");
  if (!emittedEvents.some((e) => e.startsWith("appointment.rescheduled"))) throw new Error("appointment.rescheduled event missing!");
  if (!emittedEvents.some((e) => e.startsWith("invoice.created"))) throw new Error("invoice.created event missing!");
  if (!emittedEvents.some((e) => e.startsWith("invoice.sent"))) throw new Error("invoice.sent event missing!");
  if (!emittedEvents.some((e) => e.startsWith("invoice.paid"))) throw new Error("invoice.paid event missing!");

  console.log("\n========================================================");
  console.log("🎉 ALL PHASE 4 ACCEPTANCE TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("========================================================\n");
}

runAcceptanceTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

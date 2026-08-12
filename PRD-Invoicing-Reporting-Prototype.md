# PRD: Invoicing & Reporting — Frontend Prototype
**Product:** MantraAssist RCM
**Prepared for:** Antigravity (build agent)
**Prepared by:** Product Team
**Doc type:** Prototype build spec — frontend only, mock data
**Status:** Ready for build

---

## 0. Read This First — Build Constraints

This is **not** a production feature build. It is a **clickable, believable prototype** added to the existing MantraAssist React/Vite frontend codebase, to be used for internal demos and stakeholder validation.

**In scope:**
- New pages, drawers, modals, and components, wired into the existing app shell, routing, and design system (reuse existing `ui/`, `layout/`, `shared/` components — do not invent a new visual language).
- A **shared, in-memory mock data layer** (React Context + local state, following the same pattern as `OrganizationContext`, `useProcessStore`, `clientProcessState.ts`, `activityLog.ts` already in the codebase) that makes the prototype feel like a real, connected system.
- Realistic seed/mock data, pre-populated on load, so the app doesn't look empty on first run.

**Explicitly out of scope — do not build:**
- No real backend, no database, no API layer.
- No real webhooks or webhook listeners.
- No real payment gateway integration (no live Stripe calls). "Payment" is simulated entirely client-side.
- No real SMS/WhatsApp/Email sending. "Sending" a message is a mocked action that updates local state and shows a toast/timeline entry — nothing leaves the browser.
- No auth/permissions enforcement beyond what already exists in the codebase (reuse existing permission gating patterns cosmetically; don't build new access control logic).

**The single most important requirement:** the mock data must be **cross-connected**, not siloed per screen. This is the whole point of the demo. Concretely:

> If a user manually books an appointment via `ScheduleAppointmentDrawer`, an invoice must immediately exist and appear in the Invoices list, on the Client Profile's Invoices tab, and be reflected in any Reports pulling from appointment/invoice data — **without a page refresh**, because it's all reading from the same shared mock store.

If the appointment is edited or cancelled afterward, the linked invoice must update/reflect that too. State lives in one place; every screen reads from it.

---

## 1. Vision & Why We're Building This

MantraAssist today proves out AI-driven call handling, scheduling, and messaging. It does not yet demonstrate the **money loop** — the fact that a booked appointment can automatically become billable, get invoiced, get paid, and roll up into a report a business owner can hand to their accountant. That loop is a major sales and validation gap: prospective customers (clinics, service businesses) ask "how do I actually get paid through this?" and "can I see my numbers?" and today we have no screens to show them.

This prototype exists to answer both questions convincingly in a demo, **before** we commit backend engineering effort. Once stakeholders and prospects validate the flows against this clickable prototype, we build the real backend, gateway integration, and webhook infrastructure as a separate, later engineering effort (explicitly not part of this PRD).

**Prospect narrative this prototype must support end-to-end, live, in one sitting:**
1. "Here's a client. I book them an appointment right here in the app." → appointment appears on the calendar.
2. "Watch — an invoice was created automatically for that appointment." → jump to Invoices, see it there, linked back to the appointment.
3. "I can send that invoice to the client over WhatsApp with one click." → mock send, timeline updates, invoice status changes to Sent.
4. "The client pays — here's what that looks like on our side." → simulated payment, status flips to Paid.
5. "At the end of the month, here's my revenue report." → Reports module, Revenue template, shows that invoice's amount rolled into totals.
6. Same story again, but this time the appointment comes from an **AI call flow** step instead of a human clicking a form — same invoice outcome, reinforcing that automation and manual entry are just two doors into the same system.

---

## 2. Goals

| Goal | Success looks like |
|---|---|
| G1 — Prove the appointment→invoice loop | Booking an appointment (manual or call-flow simulated) always produces a matching invoice, visible everywhere invoices are shown, with correct linked data (client, service, amount). |
| G2 — Prove invoice delivery via existing channels | User can trigger a mock WhatsApp/SMS/Email send from an invoice; it looks like the existing template system already in the app (reuse `templateLibrary.ts` patterns/variables), and the send is logged to the client's timeline. |
| G3 — Prove payment collection conceptually | Invoice has a "Pay Now" link/button that, when triggered (either by the demo presenter simulating the client, or via a "Simulate Payment" affordance), flips invoice state to Paid and updates every dependent screen. |
| G4 — Prove reporting value | A non-technical user can generate a pre-built report (e.g. Revenue, Appointments, Calls) in under 60 seconds and see numbers that trace back to the mock data they were just looking at elsewhere in the app. |
| G5 — Prove extensibility of reporting | A user can also build a custom report from scratch (pick a data source, pick fields, filter, run) to show this isn't just a fixed set of canned charts. |

**Non-goal:** pixel-perfect visual polish beyond the existing design system. Reuse existing components (`Table`, `Modal`, `CustomSideDrawer`, `Button`, capsule stat cards, filter bars, badges) wherever a pattern already exists — do not redesign from scratch.

---

## 3. Shared Mock Data Layer (build this first)

Before any UI, build the data layer everything else depends on.

### 3.1 New context/store: `InvoiceContext` (or extend an existing pattern like `useProcessStore`)
Modeled after existing state patterns in `src/lib/useProcessStore.ts` / `clientProcessState.ts` / `activityLog.ts`. Provide:
- `invoices: ClientInvoice[]`
- `createInvoiceFromAppointment(appointment, lineItems, options)` — the **single function** both the manual booking flow and the call-flow simulation must call. This is the integration point that guarantees consistency; there must not be two separate code paths that each independently create an invoice.
- `updateInvoiceStatus(invoiceId, status)`
- `sendInvoice(invoiceId, channel)` — mock send, pushes an entry to `activityLog`/timeline, updates `status` to `sent`
- `simulatePayment(invoiceId)` — flips to `paid`, stamps `paidAt`, pushes a timeline entry, mirrors the "webhook received" moment without any real webhook

### 3.2 Mock data types

```ts
interface ClientInvoice {
  id: string;                 // e.g. "INV-CL-1042"
  clientId: string;
  clientName: string;         // denormalized for easy display
  appointmentId?: string;     // null if standalone/manual invoice
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "void";
  currency: string;           // default from org settings mock
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  createdBy: "system" | string;   // "system" = call-flow/automated, else a user id/name
  dueDate: string;
  sentAt?: string;
  sentVia?: "whatsapp" | "sms" | "email";
  paidAt?: string;
  paymentLinkUrl?: string;    // fake url, e.g. "https://pay.mantraassist.mock/inv-1042"
}

interface InvoiceLineItem {
  id: string;
  source: "service" | "manual";
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}
```

### 3.3 Seed data requirements
On app load, pre-populate a believable spread so Reports and lists aren't empty:
- ~15–20 invoices across a mix of statuses (draft, sent, viewed, paid, overdue, void), dated across the last ~2 months, tied to **existing mock clients** already in the app (`getClientList.ts`) and **existing mock services** (Services page mock data).
- At least a few invoices explicitly linked to existing/seed appointments so the Appointments↔Invoices link is visible immediately without the presenter having to create data live.
- Keep 2–3 clients with **zero** invoices, to demonstrate the empty state gracefully.

### 3.4 Reporting data layer
Reports don't need their own duplicate data — they read from the **existing mock stores already in the app** (calls, appointments, clients, chats) plus the new `InvoiceContext`. Build a thin aggregation/query layer:
- `getReportData(dataSource, filters, groupBy)` — a client-side function that filters/aggregates from the relevant mock array(s) in memory. No persistence needed beyond the session; re-running a report just re-queries current in-memory state, which is why G1's live-linking matters — if data layer is shared correctly, a freshly created invoice shows up in a report run five seconds later in the same demo.

---

## 4. Feature 1 — Invoicing

### 4.1 Trigger point A: Manual booking (`ScheduleAppointmentDrawer`)
Current form has: title, description, note, tags, process/stage, date/time, session type, client, provider, custom fields. It has **no service or price field today** — add one.

Build:
1. **New field: Service(s)** — multi-select dropdown sourced from the existing Services mock list (name, price, duration). Selecting a service can auto-fill the appointment title if empty (nice-to-have, not required).
2. **New section: "Invoice"** (collapsible, expanded by default) appearing once at least one service is selected:
   - Toggle: **"Generate invoice for this appointment"** — on by default
   - Line item table, pre-populated from selected service(s): description, qty (default 1), unit price (editable)
   - **"+ Add line item"** button — manual row, free-text description + price (this is the "manual line item" requirement)
   - **Discount** field (flat amount or %, either is fine — pick one for the prototype, flat amount is simpler)
   - Computed **Subtotal / Discount / Tax (mock flat %, e.g. from org settings) / Total** summary
3. On **Save**:
   - Appointment is created as it is today
   - If the toggle is on, call `createInvoiceFromAppointment(...)` with the line items entered
   - Toast: "Appointment booked — Invoice INV-CL-1043 created"
   - Drawer closes; if the user is on the Appointments page, the new appointment appears as normal (no change to existing behavior needed there)

### 4.2 Trigger point B: Call-flow simulation
There is an existing **Workflow Steps** system on the Process/Stage editor (Flow Builder tab) with a step category "Appointment" containing `Book Appointment` and `Reschedule Appointment`. Add a new **step configuration option** to `Book Appointment`:
- Toggle: **"Auto-generate invoice on booking"**
- Dropdown: **Service to bill** (maps to the Services mock list) — since this is a prototype, a single selectable default service per step config is enough; no need to build real dynamic service-detection from conversation content
- Optional: flat fee override field

Then, in the existing **call flow test/simulation surface** (`TestProcessChatDrawer` / `processChatSimulator.ts` / `conversationBotRuntime.ts` — whichever mock "run this flow" surface already exists), when the simulated flow executes a `Book Appointment` step with this toggle on:
- Create a mock appointment (reuse whatever mock appointment-creation the simulator already does, if any — if it doesn't currently create real appointment records, it needs to for this to work)
- Call the **same** `createInvoiceFromAppointment(...)` function as the manual path, with `createdBy: "system"`
- Surface this in the simulator's transcript/log panel: "✅ Appointment booked · ✅ Invoice INV-CL-1044 generated"

This is the step that proves to a prospect that AI-driven bookings and human-driven bookings produce identical downstream billing — do not skip it or fake it with static copy; it must actually call the shared function.

### 4.3 New step: "Send Invoice" (Workflow Steps drawer)
Add a new step under the **Communication** category (next to WhatsApp / SMS / Email in `workflow-steps-ui.md`'s existing spec), styled identically to the other step cards (same blue icon container, same card layout, same drawer mechanics already fully specified in that doc — don't deviate from that visual spec).
- Step name: **Send Invoice**
- Description: "Send the generated invoice to the client via WhatsApp, SMS, or Email using a payment link template."
- Config drawer for this step: channel selector (WhatsApp/SMS/Email/Auto — Auto tries WhatsApp then falls back to SMS, mirroring whatever fallback pattern already exists for other message steps), template picker (see 4.4)

### 4.4 New library template
Add to the existing `templateLibrary.ts` pattern (same shape as `lib-tpl-appt-reminder`, `lib-tpl-appt-confirmation`):
```
id: "lib-tpl-invoice-payment"
category: "Utility"
bodyText: "Hi {{contact_name}}, your invoice {{invoice_number}} for {{invoice_amount}} is ready. Due {{due_date}}."
buttons: [{ type: "url", label: "Pay Invoice Now", value: "{{payment_link}}" }]
variableMappings: contact_name → field, invoice_number/invoice_amount/due_date/payment_link → sourced from the invoice object at send time
```
This gives the demo a concrete, on-brand message to show, consistent with every other automated message already in the product.

### 4.5 New page: `Invoices`
Standalone page (new sidebar nav item, near Billing/Deals), not buried inside a Payments tab — reasoning: these are client-facing invoices, conceptually separate from the org's own subscription billing, and they need to be a first-class, reportable entity.

- **Capsule stat row** (reuse the exact capsule component from Web Forms page): Total Invoiced, Outstanding, Paid This Month, Overdue Count
- **Table** (reuse existing table component/patterns from Call Logs or Clients): Invoice #, Client, Linked Appointment (click to jump), Amount, Status badge, Due Date, Sent Via icon, Actions
- **Filters bar**: Status, Date Range, Client — reuse the exact filter bar pattern from Call Logs/Dashboard, don't build a new one
- **Search**: by client name or invoice number
- Row actions: View, Resend, **Simulate Payment** (dev/demo affordance — explicitly labeled this way is fine for a prototype, or just call it "Mark as Paid" with a payment-link icon, presenter's choice), Void

### 4.6 Invoice Detail (drawer or full screen — match whatever pattern Call Details uses, since it's the closest existing "click a row, see full detail" precedent)
- Header: Invoice #, status badge, client name/link to profile, linked appointment (link)
- Line items table with subtotal/discount/tax/total
- Status timeline (mini version of the same activity-timeline pattern used on Client Profile): Created → Sent → Viewed → Paid
- **Send** button (opens channel choice, calls `sendInvoice`)
- **Simulate Payment** button (calls `simulatePayment`) — this is the demo's "watch it get paid" moment
- Payment link field (mock URL, copyable)

### 4.7 Client Profile — new tab
Add **"Invoices"** tab next to the existing Fields/Timeline tabs, listing that client's invoices (filtered view of the same shared data — do not duplicate data, just filter `invoices` by `clientId`).

### 4.8 Explicit consistency checks (acceptance criteria)
- [ ] Book an appointment manually with a service selected → invoice appears instantly in: Invoices list, Client Profile → Invoices tab, and is queryable by the Reports module — no refresh needed.
- [ ] Run the call-flow simulator with "Auto-generate invoice" on → same result as above, `createdBy` shows as system/automated in the UI somewhere (small visual distinction, e.g. a bot icon vs. a user avatar).
- [ ] Send an invoice → Client Profile timeline shows a new entry ("Invoice INV-CL-1043 sent via WhatsApp").
- [ ] Simulate payment → status updates everywhere the invoice is rendered (list, detail, client tab, any report currently on screen if it's re-run).
- [ ] Cancel/void an invoice → reflected identically everywhere, no stale state on any screen.

---

## 5. Feature 2 — Reporting Module

### 5.1 New page: `Reports`
New sidebar nav item. Structure modeled on the existing **Web Forms** page (closest existing precedent: capsule stats + table + "create" flow with a template-vs-scratch choice):

- **Capsule stat row**: Total Reports, Reports Run This Month, Scheduled Reports (can be visually present but non-functional/disabled in this prototype since scheduling is out of scope — see 5.4)
- **Table**: Report Name, Type (Template/Custom), Data Source, Last Run, Actions (Run, Edit, Export, Duplicate, Delete)
- **+ Create Report** button → modal with two paths: **"Use a Template"** or **"Start from Scratch"** (same two-path modal pattern as Web Forms' `Create Form Templates` popup)

### 5.2 Pre-built templates (build these six, fully functional against mock data)
Each template, when run, must show **real numbers pulled live from the shared mock stores** — not static placeholder numbers.

| Template | Data source(s) | Key mock metrics to compute |
|---|---|---|
| Call Performance | Calls mock data | Volume, avg duration, cost, sentiment breakdown, success rate — mirror what's already computed for the Call Logs analytics cards, just reuse that logic |
| Appointments & Bookings | Appointments mock data | Total booked, completed, cancelled, no-show, by staff, by service |
| Revenue & Invoicing | Invoices (new store) | Total invoiced, total collected, outstanding, overdue count, revenue by service, revenue trend over selected range |
| Client & Funnel | Clients + process/stage mock data | Stage conversion counts/percentages — reuse the same funnel calculation already powering the Dashboard's conversion funnel chart |
| Team Performance | Calls/Appointments + Users mock data | Calls/appointments handled per team member |
| Messaging & Chat | Chats mock data | Volume, avg response time, human takeover rate |

Each template screen: filter bar at top (date range at minimum; process/stage/client where relevant — reuse existing filter components), a results table, and where it makes sense a chart (reuse Dashboard's existing chart components rather than adding a new charting approach).

### 5.3 Custom builder ("Start from Scratch")
A guided, step-based builder (reuse the visual language of the Flow Builder's step drawer or the Web Forms field-builder — pick whichever pattern is closer once in the codebase, consistency with an existing pattern matters more than novelty):
1. **Pick a data source**: Calls / Appointments / Clients / Invoices / Chats / Deals (single source only for this prototype — no joins)
2. **Pick fields/columns** to include (checkbox list; include custom fields from `FieldRegistryContext` where the data source is Clients, to demonstrate custom-field extensibility)
3. **Add filters** (reuse existing filter components/patterns already in the app)
4. **Choose view**: Table, or Table + Chart (bar/line, reuse Dashboard chart components)
5. **Name & Save** → appears in the Reports table as type "Custom", immediately re-runnable

### 5.4 Export
- **CSV export** button on any report result (reuse whatever CSV export mechanism already exists for Call Logs/Clients export — same pattern, don't build a new exporter)
- PDF export can be a visible button that's present for completeness; a real PDF generation isn't required for this prototype pass if it adds meaningful build time — flag this as optional/nice-to-have, CSV is the must-have

### 5.5 Explicitly out of scope for this prototype
- Scheduled/recurring report delivery (leave the capsule stat and any "Schedule" button visible but non-functional or showing a "Coming soon" state — do not build actual cron/email delivery)
- Cross-data-source joins in the custom builder
- Permission-gating the data source picker by role (skip for prototype; note as a real-build requirement only)

---

## 6. Build Order (recommended sequence for Antigravity)

1. **Shared mock data layer** — `InvoiceContext`, types, seed data, `createInvoiceFromAppointment` and related functions. Nothing else works without this.
2. **Manual booking → invoice** — update `ScheduleAppointmentDrawer` with Service/line-item/invoice section, wire to the shared function. This alone should make Goal G1 demo-able for the manual path.
3. **Invoices page + Invoice Detail** — list, filters, detail drawer/screen, Send + Simulate Payment actions. This makes G2/G3 demo-able.
4. **Client Profile → Invoices tab** — trivial once #3 exists (just a filtered view).
5. **Call-flow simulation hook** — `Book Appointment` step config + wiring the simulator to call the same shared function. This closes the loop for G1's second half.
6. **Send Invoice workflow step + library template** — completes the "automated send" story.
7. **Reports page shell + 6 pre-built templates** — closes G4. Build in the metric-priority order above (Revenue template depends on step 1–3 being done first; do it after, not before).
8. **Custom report builder** — closes G5, build last since it's the most complex and least demo-critical relative to the templates.

---

## 7. What Success Looks Like in the Demo Room

A presenter should be able to, live, without any prep beyond the seeded data:
1. Open a client's profile, book them an appointment with a service attached.
2. Immediately switch to the Invoices tab on that same client and show the invoice already sitting there.
3. Open the invoice, hit Send (WhatsApp), show the timeline entry that appears.
4. Hit "Simulate Payment," watch the status flip to Paid in real time on screen.
5. Navigate to Reports → Revenue & Invoicing template → run it → see that exact invoice's amount inside the total.
6. Then flip the narrative: open a Process's call flow, show the `Book Appointment` step with "Auto-generate invoice" toggled on, run the test simulator, and show the same outcome happening without a human touching a form.

If any of those six moments requires a page refresh, a hardcoded number that doesn't match what was just created, or a screen that doesn't reflect the action just taken — the prototype has failed its core purpose, regardless of how polished any individual screen looks.

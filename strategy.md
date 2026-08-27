# MantraAssist — Growth, Funnel & Analytics Strategy

---

## 1. Context & Product Summary

MantraAssist is an AI-powered voice agent and CRM platform built for healthcare operations — clinics, diagnostic centers, and hospitals. The platform replaces or augments front-desk staff by providing an AI receptionist that handles inbound/outbound phone calls, WhatsApp messages, SMS, and website chat, while also serving as a full operational backend with appointment scheduling, pipeline management, invoicing, web forms, and knowledge bases. There are two distinct users: **the clinic staff/admin** who configures processes, reviews call transcripts, manages patient records, and monitors AI performance through the admin panel; and **the patient** who interacts with the AI voice agent or chatbot to book appointments, answer intake questions, confirm insurance, and receive follow-up communications. The patient never sees the admin panel — they experience MantraAssist through a phone call, a WhatsApp thread, a website chat widget, or a web form link.

This dual-user model means we operate **two funnels simultaneously**:

- **(a) B2B Funnel** — acquiring clinic customers, onboarding them, getting them to configure the AI agent with their services/knowledge base, and expanding usage across departments/locations.
- **(b) End-Patient Funnel** — for each active clinic, driving patient engagement from initial contact through completed (and kept) appointments, generating measurable clinical and revenue outcomes for the clinic.

Our business succeeds only when both funnels are healthy. A clinic that signs up but never activates is a churn risk. A clinic whose patients call but never book is a value-delivery failure.

---

## 2. North Star Metric

### **Appointments successfully booked via AI agent per active clinic per week**

This is the metric I'd put on the wall. Here's why:

1. **It captures value delivered to the clinic.** Clinics buy MantraAssist to fill their schedules and reduce front-desk load. A booked appointment is the atomic unit of value — it translates directly to the clinic's revenue.
2. **It captures value delivered to the patient.** A patient who reaches the AI, gets understood, and successfully books an appointment had a good experience. The booking is proof the AI did its job.
3. **It's normalized per active clinic per week**, so it doesn't inflate with raw customer count. It forces us to care about depth of engagement, not just breadth.
4. **It's composable.** You can decompose it upward (total bookings = this metric × active clinics) or downward (what drove bookings up/down — more calls? better intent recognition? fewer drop-offs at slot selection?).

### Rejected Candidates

| Candidate | Why rejected |
|---|---|
| **Total calls handled** | Pure volume metric. A clinic could receive 500 calls/week and still have zero bookings if the AI can't understand intent or the process flow is broken. High call volume with low conversion is actually a *problem*, not a success signal. |
| **Messages sent (WhatsApp/SMS)** | Output metric, not outcome metric. We can send 10,000 template messages and still deliver zero value. Message volume measures our cost, not our impact. |
| **Number of active clinics** | Important for revenue, but it doesn't tell us if those clinics are *getting value*. A clinic that logged in once and configured one process but never had a patient interaction is "active" by some definitions but delivering no ROI. This belongs in the B2B funnel, not as the North Star. |

---

## 3. Funnel Definition

### 3.1 B2B Funnel — Clinic Onboarding & Expansion

| Stage | Definition | Event / Data Signal | Source in Codebase |
|---|---|---|---|
| **Lead** | Clinic expresses interest (demo request, form fill, referral) | `lead_created` — web form submission or referral link click | [`WebForms.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/WebForms.tsx) submission counts; [`ReferAndEarn.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/ReferAndEarn.tsx) referral tracking |
| **Demo** | Clinic sees a live demo or self-serve trial | `demo_scheduled` / `demo_completed` | **NEW** — not currently tracked. Would need a CRM deal-stage field in Bitrix or a manual event from sales. |
| **Onboarded** | Clinic account created, at least one admin user logged in | `clinic_onboarded` — first login event | [`AuthProvider`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/context/AuthContext.tsx) session creation; [`Organizations.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Organizations.tsx) org creation |
| **Configured** | KB uploaded + at least one Process with stages created + services catalog populated | `clinic_configured` — composite check | [`KnowledgeBase.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/KnowledgeBase.tsx) (KB sources added); [`Process.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Process.tsx) (stages created with flow builder nodes); [`Services.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Services.tsx) (services catalog populated); [`servicesStore.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/servicesStore.ts) |
| **Activated** | First real AI-handled patient interaction (call completed OR chatbot conversation with patient) | `clinic_activated` — first `CallLog` entry with `status: "Completed"` or first bot conversation with `origin: "bot"` | [`processLogsStore.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/processLogsStore.ts) `addProcessCallLog()`; [`conversationBotRuntime.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/conversationBotRuntime.ts) `advanceBotForInboundMessage()` |
| **Retained** | Clinic has AI interactions in ≥3 of the last 4 weeks | `clinic_retained` — derived from weekly interaction counts | **PARTIALLY DERIVABLE** — can count from `CallLog` dates and conversation timestamps in [`useConversations.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/useConversations.ts), but needs server-side aggregation for production. |
| **Expanded** | Clinic adds a second process, additional phone numbers, new team members, or upgrades plan tier | `clinic_expanded` — new process created, new number allocated, or plan change | [`Process.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Process.tsx) process count; [`Settings.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Settings.tsx) phone number allocation & integration connections; [`Payments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Payments.tsx) plan tier changes |

### 3.2 End-Patient Funnel — Patient Engagement to Outcome

| Stage | Definition | Event / Data Signal | Source in Codebase |
|---|---|---|---|
| **Contact Initiated** | Patient calls, sends WhatsApp message, initiates web chat, or opens a web form | `patient_contact_initiated` — new call log entry, new conversation thread, or form page load | [`CallLogs.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/CallLogs.tsx) inbound call record; [`Chats.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Chats.tsx) new conversation (`channel: "whatsapp" | "sms" | "website"`); [`activityEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/activityEngine.ts) entries of type `inbound_call`, `whatsapp`, `sms`, `website_message` |
| **AI Understood Intent** | AI successfully identifies what the patient wants (booking, inquiry, follow-up) — i.e., the bot flow progresses past the entry router to a meaningful node | `patient_intent_recognized` — bot runtime advances past `entryRouter` to a `question` or `message` node | [`chatbotFlowEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/chatbotFlowEngine.ts) `executeEntryRouter()` returning a non-null result; [`conversationBotRuntime.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/conversationBotRuntime.ts) — when `stepResult` is non-null after entry routing. **NEW instrumentation needed** — the runtime doesn't currently emit a discrete event for "intent recognized." |
| **Info / Booking Flow Completed** | Patient provides all required information (service selection, provider choice, time slot) through the conversational flow or web form | `patient_flow_completed` — bot reaches a terminal node or form submission with `status: "completed"` | [`chatbotFlowEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/chatbotFlowEngine.ts) flow reaching an end node or `fieldUpdate` node; [`activityEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/activityEngine.ts) `FormSubmittedActivityEntry` with `status: "completed"` |
| **Appointment Booked** | A confirmed appointment record is created in the system | `patient_booking_completed` — new appointment with `status: "Scheduled" | "Confirmed"` | [`Appointments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Appointments.tsx) appointment creation; [`activityEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/activityEngine.ts) `AppointmentActivityEntry` with `type: "appointment_booked"` and `status: "scheduled" | "confirmed"` |
| **Appointment Kept** | Patient shows up; appointment status moves to "Completed" | `patient_appointment_completed` — status change to `"completed"` | [`Appointments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Appointments.tsx) status lifecycle; **partially trackable** — the status field exists (`Scheduled → Confirmed → Completed → Cancelled`), but the transition event is not discretely emitted today. |
| **Follow-up / Repeat** | Patient has a second interaction or books a subsequent appointment within 90 days | `patient_repeat_engagement` — second `appointment_booked` activity for same `clientId` | Derivable from [`activityEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/activityEngine.ts) by counting `appointment_booked` entries per `clientId`. **NEW** — needs aggregation logic. |

---

## 4. Metrics & KPIs per Funnel Stage

### 4.1 B2B Funnel Metrics

| Stage | Metric | How to Compute | Instrumentation Status |
|---|---|---|---|
| **Lead → Demo** | Lead-to-demo conversion rate | `count(demo_scheduled) / count(lead_created)` | 🔴 **NEW** — demo scheduling not tracked in-product. Need CRM pipeline stage from Bitrix integration or a new event. |
| **Lead → Demo** | Avg. days lead-to-demo | `avg(demo_scheduled.date - lead_created.date)` | 🔴 **NEW** — same as above. |
| **Demo → Onboarded** | Demo-to-signup conversion rate | `count(clinic_onboarded) / count(demo_completed)` | 🟡 **PARTIAL** — onboarding timestamp exists via auth, but demo completion requires CRM data. |
| **Onboarded → Configured** | Time-to-configuration (days) | `avg(first_KB_upload.date - signup.date)` | 🟡 **PARTIAL** — KB and process creation are in-memory/sessionStorage today. Needs server-side persistence timestamps. |
| **Onboarded → Configured** | Configuration completion rate | `count(clinics with KB + process + services) / count(onboarded)` | 🟡 **PARTIAL** — can derive from store state snapshots. |
| **Configured → Activated** | Time-to-first-interaction (days) | `avg(first_completed_call.date - configuration_complete.date)` | 🟢 **DERIVABLE** — `processLogsStore` has call dates; configuration state is checkable. |
| **Configured → Activated** | Activation rate (% of configured clinics with ≥1 AI interaction in first 14 days) | Weekly cohort analysis | 🟡 **PARTIAL** — needs cohort tracking infrastructure. |
| **Activated → Retained** | Week-4 retention rate | `count(clinics active in week 4) / count(clinics activated)` | 🟡 **PARTIAL** — derivable from call/chat timestamps but needs aggregation. |
| **Retained → Expanded** | Expansion rate | `count(clinics adding processes or upgrading) / count(retained)` | 🟢 **DERIVABLE** — process count and plan tier are in [`Payments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Payments.tsx) and [`Process.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Process.tsx). |

### 4.2 End-Patient Funnel Metrics

| Stage | Metric | How to Compute | Instrumentation Status |
|---|---|---|---|
| **Contact Initiated** | Total patient contacts per clinic per week (by channel) | Count of `CallLog` entries + new conversation threads + form submissions, grouped by `orgId` and week | 🟢 **DERIVABLE** — data exists in `processLogsStore`, `useConversations`, and `activityEngine`. |
| **Contact → Intent Recognized** | Intent recognition rate | `count(entry_router_success) / count(contacts)` | 🔴 **NEW** — `executeEntryRouter()` in [`chatbotFlowEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/chatbotFlowEngine.ts) returns `null` on failure but doesn't emit a tracking event. Need to instrument. |
| **Contact → Intent Recognized** | Fallback rate (KB fallback or generic fallback triggered) | `count(answerFromKnowledgeBase hits + fallback responses) / count(bot_interactions)` | 🟡 **PARTIAL** — the fallback paths exist in [`conversationBotRuntime.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/conversationBotRuntime.ts) L316-356, but they don't emit discrete tracking events. |
| **Intent → Flow Completed** | Flow completion rate | `count(flow_terminal_node_reached) / count(intent_recognized)` | 🔴 **NEW** — flow engine doesn't track terminal node arrival. Would add event emission in `executeFlowNode()`. |
| **Flow → Booking** | Booking conversion rate | `count(appointment_booked) / count(flow_completed)` | 🟡 **PARTIAL** — `AppointmentActivityEntry` exists in activity engine, but tying it back to a specific flow session requires a session ID. |
| **Booking → Kept** | Show rate (% of booked appointments with status "completed") | `count(status=completed) / count(status=scheduled|confirmed)` | 🟢 **DERIVABLE** — appointment status lifecycle exists in [`Appointments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Appointments.tsx). |
| **Kept → Repeat** | Repeat booking rate within 90 days | `count(patients with ≥2 bookings) / count(patients with ≥1 booking)` per clinic | 🟡 **PARTIAL** — requires aggregation across `activityEngine` entries by `clientId`. |
| **Cross-cutting** | Channel mix (% calls vs WhatsApp vs web chat vs forms) | Group contacts by `channel` field | 🟢 **DERIVABLE** — `ConversationShape.channel` in [`conversationBotRuntime.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/conversationBotRuntime.ts) and `CallLog.type` in [`processLogsStore.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/processLogsStore.ts). |
| **Cross-cutting** | Human handoff rate | `count(assignedPersonIdPatch events) / count(bot_interactions)` | 🟡 **PARTIAL** — handoff is modeled in the bot runtime ([`conversationBotRuntime.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/conversationBotRuntime.ts) L448-482) but not discretely tracked. |

---

## 5. Health & Guardrail Metrics

These metrics should be monitored continuously and should **not degrade** as we optimize the growth funnel. If any of these move in the wrong direction, it's a "stop the line" signal.

| Guardrail Metric | What it Protects | Target / Threshold | Data Source |
|---|---|---|---|
| **AI call-handling accuracy** (% of calls where the AI correctly identified intent and took the right action, measured via post-call transcript review) | Patient experience quality | ≥ 85% accuracy on sampled calls | [`CallDetailDrawer.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/telephony/CallDetailDrawer.tsx) transcript + AI summary + sentiment. **Today: manual review. Future: automated scoring.** |
| **Escalation / human handoff rate** | AI autonomy; if this climbs, AI isn't handling enough on its own | ≤ 20% of interactions escalated to a human | Bot runtime `assignedPersonIdPatch` events; chat `botStatus` transitions from `"active"` to `"paused"`. |
| **False booking rate** (appointments booked by AI that the clinic cancels because they were incorrect — wrong provider, wrong time, wrong service) | Clinic trust in AI | ≤ 3% of AI-booked appointments cancelled by staff within 24h | Appointment status transitions `confirmed → cancelled` within 24h window, filtered to AI-originated bookings. **NEW — needs attribution tag.** |
| **Patient satisfaction / CSAT** | End-user experience | ≥ 4.2 / 5.0 | **NEW — not instrumented.** Recommend adding a 1-question post-interaction survey via SMS/WhatsApp template after appointment completion. |
| **Cost per resolved interaction** | Unit economics; ties to voice infra (Twilio/Telnyx per-minute rates, AI model token costs) | Track trend; should decrease over time as AI handles more without escalation | Call duration × per-minute rate (from [`Settings.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Settings.tsx) credit/billing system) + model token costs (from call metadata). [`CallLogs.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/CallLogs.tsx) already shows per-call cost. |
| **System uptime / call failure rate** | Platform reliability | ≤ 2% of calls failing due to system error (not patient no-answer) | `CallLog.status === "Failed"` in [`processLogsStore.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/processLogsStore.ts); [`Overview.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Overview.tsx) already displays Failed/Missed count. |
| **Average call duration** | Cost control; also a proxy for AI efficiency (shorter = better, assuming resolution) | Monitor trend (currently 14s avg per the dashboard). If it creeps above 5 min, investigate. | [`Overview.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Overview.tsx) already renders this KPI. |

---

## 6. Analytics Implementation Plan

### 6.1 Event Taxonomy & Naming Convention

Adopt a `entity_action` pattern, consistent with how the existing `activityEngine.ts` already types events. All analytics events should use **snake_case**, be prefixed by entity, and carry a standard set of context properties.

**Standard event shape:**
```typescript
interface AnalyticsEvent {
  event_name: string;          // e.g. "patient_booking_completed"
  timestamp: string;           // ISO 8601
  org_id: string;              // clinic/organization identifier
  user_id?: string;            // admin user who triggered (if applicable)
  client_id?: string;          // patient/contact identifier
  process_id?: string;         // which process pipeline
  channel?: string;            // "voice" | "whatsapp" | "sms" | "website" | "webform"
  session_id?: string;         // conversation or call session
  properties: Record<string, any>;  // event-specific payload
}
```

**Proposed event catalog:**

| Event Name | Trigger Point | Category |
|---|---|---|
| `clinic_onboarded` | First admin login after org creation | B2B |
| `clinic_kb_uploaded` | Knowledge base source added | B2B |
| `clinic_process_created` | New process saved with ≥1 stage | B2B |
| `clinic_services_configured` | ≥1 service added to catalog | B2B |
| `clinic_configured` | Composite: KB + process + services all present | B2B |
| `clinic_activated` | First completed AI interaction (call or chat) | B2B |
| `clinic_plan_changed` | Plan tier upgraded/downgraded | B2B |
| `clinic_integration_connected` | Bitrix/Salesforce/HubSpot connected | B2B |
| `patient_contact_initiated` | New call, chat, or form interaction started | Patient |
| `patient_intent_recognized` | Bot entry router successfully routes to a flow node | Patient |
| `patient_flow_step_completed` | Each meaningful flow node traversed | Patient |
| `patient_flow_completed` | Flow reaches terminal/end node | Patient |
| `patient_booking_completed` | Appointment record created with scheduled/confirmed status | Patient |
| `patient_appointment_completed` | Appointment status → completed | Patient |
| `patient_appointment_cancelled` | Appointment status → cancelled | Patient |
| `patient_handoff_to_human` | Bot assigns conversation to a team member | Patient |
| `patient_fallback_triggered` | Bot falls back to KB answer or generic response | Patient |
| `form_submitted` | Web form submission completed | Patient |
| `webhook_event_fired` | Outbound webhook payload sent to external system | System |

### 6.2 Where to Add Instrumentation Hooks

I'm recommending a thin `analytics.ts` module in `src/lib/` that all components call. This keeps tracking logic out of UI components and makes it easy to swap backends (Mixpanel, Amplitude, Segment, or our own pipeline).

| File | What to Instrument | Priority |
|---|---|---|
| **[NEW] `src/lib/analytics.ts`** | Central `track(event_name, properties)` function. Initially writes to a `sessionStorage` buffer + fires to webhook endpoint. | P0 — foundation |
| [`src/lib/conversationBotRuntime.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/conversationBotRuntime.ts) | After L274 (`executeEntryRouter` success): emit `patient_intent_recognized`. After L316-333 (KB fallback): emit `patient_fallback_triggered`. After L448-482 (human handoff): emit `patient_handoff_to_human`. | P0 |
| [`src/lib/chatbotFlowEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/chatbotFlowEngine.ts) | In `executeFlowNode()`: emit `patient_flow_step_completed` with `nodeId` and `nodeType`. On terminal nodes: emit `patient_flow_completed`. | P0 |
| [`src/lib/activityEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/activityEngine.ts) | In `appendActivity()`: mirror each activity entry as an analytics event. This is the most leveraged single hook — it already captures calls, WhatsApp, SMS, emails, appointments, form submissions, stage changes, and webhook triggers. | P0 |
| [`src/app/pages/Appointments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Appointments.tsx) | On appointment creation: `patient_booking_completed`. On status change to "completed": `patient_appointment_completed`. On cancellation: `patient_appointment_cancelled`. | P0 |
| [`src/app/pages/KnowledgeBase.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/KnowledgeBase.tsx) | On KB source added: `clinic_kb_uploaded`. | P1 |
| [`src/app/pages/Process.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Process.tsx) | On process save with stages: `clinic_process_created`. | P1 |
| [`src/app/pages/Services.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Services.tsx) | On first service added: `clinic_services_configured`. | P1 |
| [`src/app/pages/Settings.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Settings.tsx) | On integration connection (Bitrix, etc.): `clinic_integration_connected`. On phone number allocation: track as part of configuration. | P1 |
| [`src/app/pages/Payments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Payments.tsx) | On plan change: `clinic_plan_changed` with old and new tier. | P1 |
| [`src/lib/processLogsStore.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/processLogsStore.ts) | In `addProcessCallLog()`: emit `patient_contact_initiated` for new call entries. | P1 |
| [`src/app/pages/WebForms.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/WebForms.tsx) | On form submission: `form_submitted`. Already has submission counts — just need the discrete event. | P2 |

### 6.3 Dashboard Structure

**Daily (PM morning check — 5 minutes):**
- North Star: AI-booked appointments per active clinic (today vs 7-day avg)
- Call volume & success rate (already in [`Overview.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Overview.tsx))
- Human handoff rate (trending up = investigate)
- System failure rate
- Any clinic with >50% drop in interactions vs prior day (anomaly alert)

**Weekly (Monday review — 15 minutes):**
- Full patient funnel conversion rates (contact → intent → flow → booking → kept)
- B2B funnel: new activations, configuration completion rate, churn signals
- Channel mix trends (are patients shifting from calls to WhatsApp?)
- Top 5 clinics by booking volume and bottom 5 by activation (who needs help?)
- AI accuracy sample review (10 random calls scored for correctness)

**Monthly (Strategy review — 30 minutes):**
- Cohort retention curves (week-1, week-4, week-8 retention by signup month)
- Expansion revenue: how many clinics added processes, upgraded tiers
- Cost per resolved interaction trend (unit economics)
- Patient funnel by clinic segment (size, specialty, region)
- Feature adoption: which modules are being used (forms, chatbot, voice, campaigns) and which are dormant

---

## 7. Open Questions / Assumptions

| # | Question / Assumption | Impact | My Default Assumption |
|---|---|---|---|
| 1 | **Is the current platform front-end only?** The codebase I reviewed is a React front-end using `sessionStorage` / `localStorage` for all data persistence. There are no API calls to a backend. I'm assuming a backend API and database exist (or will exist) for production, and the front-end stores are prototyping scaffolding. | All "derivable" metrics above assume server-side data persistence. If there's no backend yet, the analytics plan needs to include a data layer first. | Backend exists or is in active development. |
| 2 | **Pricing model: per-seat, per-credit, or hybrid?** [`Payments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Payments.tsx) shows 4 tiers (Starter $10/user, Basic $49/user, Professional $79/user, Enterprise custom) with credit-per-user-per-month allocations. I'm assuming credits map to AI interaction minutes/messages. | Affects how we define "cost per resolved interaction" and expansion revenue tracking. | Hybrid model: seat-based subscription + usage-based credits for voice minutes and AI tokens. |
| 3 | **Multi-region / multi-org?** [`Organizations.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Organizations.tsx) and `OrganizationProvider` suggest multi-tenant architecture. Do clinics operate across regions with different phone numbers, languages, and compliance requirements? | Impacts how we segment funnel metrics and whether "per active clinic" means per-org or per-location. | One org = one clinic location. Multi-location health systems create multiple orgs or we need a parent-org concept. |
| 4 | **Who handles the B2B sales funnel today?** The "Lead → Demo" stage has zero instrumentation in the product. Is this managed entirely in Bitrix/HubSpot, or is there a sales team using a separate tool? | Determines whether we need to sync CRM pipeline data back into MantraAssist or track it externally. | Sales uses Bitrix for lead/deal management. We should sync deal stages via the Bitrix webhook integration already built in Settings. |
| 5 | **Voice infra provider?** Settings references both Twilio and Telnyx (Zadarma also mentioned). Which is primary? | Impacts cost modeling for the "cost per resolved interaction" guardrail metric. | Twilio is primary; Telnyx/Zadarma as region-specific alternatives. |
| 6 | **Is AI Scribe (clinical documentation) a separate product or a module within MantraAssist?** [`AIScribeConsole.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/AIScribeConsole.tsx) and [`scribeSessionStore.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/scribeSessionStore.ts) are substantial modules for real-time clinical note generation during consultations. | If it's a separate product line, it needs its own North Star and funnel. If it's an upsell module, it's part of the expansion stage. | AI Scribe is an upsell feature within MantraAssist, available on Professional+ tiers. |
| 7 | **Appointment "kept" tracking — is this manual or automated?** The appointment status lifecycle (`Scheduled → Confirmed → Completed → Cancelled`) exists, but I couldn't find automated check-in logic. Are clinic staff manually marking appointments as completed? | If manual, the "show rate" metric will have data quality issues (staff forget to update). | Manual today. Recommend integrating with EHR check-in events via the existing integration framework to automate. |
| 8 | **Do we have patient identity resolution?** The same patient might call from one number and WhatsApp from another. Does the system link these into a single patient record? | Affects accuracy of repeat engagement tracking and true patient funnel conversion rates. | [`Clients.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Clients.tsx) serves as the patient record with phone/email fields. Conversations are linked via `clientId`. I'm assuming basic identity resolution exists via phone number matching. |

---

*Document authored as a codebase-informed strategy artifact. All file references and event/data signals are based on direct review of the MantraAssist front-end codebase as of August 2026. Metrics marked 🔴 NEW require engineering work; 🟡 PARTIAL require aggregation/persistence infrastructure; 🟢 DERIVABLE can be computed from existing data structures once persisted server-side.*

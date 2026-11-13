# RCM Page-by-Page Mapping — built on main's entity-wise workflows

> **Revision 2 (2026-11-13).** Planning document only; no application code was changed. This replaces the first version, which reused `rcm`/`rcm-2` code and a separate Revenue Cycle area. **This version uses only `main`'s pages, UI and the entity-wise workflow structure** (`MantraAssist Entity Workflows and Global Automation (PRD…).md`): RCM = **stages + fields + stage-entry actions + move rules + events on entity pipelines.** The `rcm`/`rcm-2` branches are not used as code sources (they are mentioned only where a spec status name or behavior has to be reconciled).
>
> **Inputs:** `docs/rcm-flow-spec.md.md` (misnamed, untracked — spec sections: §2 Where RCM lives, §3 flow, §4 Pipelines P1–P6, §5 Flows F1–F9, §6 Automations A1–A30, §7 Fields, §8 Queues/roles, §9 Slices); the Entity Workflows PRD and `IMPLEMENTATION_PROGRESS_REPORT.md`; `main` working tree (with uncommitted edits to task files, `useProcessStore.ts`, `Process.tsx`).
> **Verification:** I read the PRD, the progress report, and `useProcessStore.ts` (types L85-204, required categories L381-388, default entity processes L725-818) directly (✔). Everything else is from explorer reads of the working tree; nothing was built or run. Line anchors may drift — re-confirm before editing. **NC** = needs confirmation.

---

## 1. Summary

1. **Approach:** every RCM record type runs as a **pipeline on the entity processes you already have** — coverage verification + prior auth on `insurance`, charge capture + claim + **denial** + A/R on `claim`, patient balance on `invoice`. Denial is **stages of the claim pipeline** (Denied → Correct & resubmit → Appeal drafted → Appeal submitted → Paid / Written off), not a separate board or entity.
2. **No separate Revenue Cycle area.** The spec's 11 screens collapse into **stage filter presets and stage boards on the entity pages** (Claims, Invoices, Appointments, a new Insurance page) plus **one** small new page (RCM Home: queue counts by stage + KPIs). The 8 work queues become **stage groups**, not Tasks.
3. **Pages:** 14 existing screens touched (the spec §2 touchpoints) + Claims, Invoices, Process, Automation, Reports, patient portal; **2 new pages** (Insurance entity page, RCM Home) and **1 shared component** (stage Kanban board extracted from Invoices/Deals).
4. **Biggest finding — PRD vs. code:** your progress report says Phases 1–4 are done. The code says otherwise: **singleton entity processes are not enforced** (add/delete allowed), **claims have no process of their own** (claim processes are deleted at load, `useProcessStore.ts:1340-1343`; claims ride the *insurance* stages), there is **no insurance record at all**, **claim stage moves emit no events**, **stage-entry actions only run via `AutomationRule`s** (not `Stage.workflowSteps`), **delay/wait is never executed**, and the Phase-2 partition line and automation cards are not rendered. These are prerequisites (§3.0.2, gaps G1–G10) and are costed in Slice 1.
5. **Default stages:** today's insurance defaults (Draft & Intake … Submitted (837P) … Denied) are **claim-shaped**; they must be replaced with coverage-verification stages when claims get their own process. §3.0.4 gives the RCM default stage set per entity (with `systemCategory`, required flag, position, entry action).
6. **Automations:** all 30 map to one of four mechanisms — **move rule (M)**, **stage-entry action (E)**, **rule action (R)**, **daily-job event (J)** (§3.0.5). New executors needed: `run_eligibility`, `create_claim`, `scrub_claim`, `submit_claim`, `post_remittance`, `update_invoice_from_claim`, `draft_appeal`, `start_call`, plus real **send-message** and **delay** support (`whatsapp/sms/email` steps and `delay` do nothing today).
7. **Biggest conflicts:** spec P1–P6 are six pipelines but main has five entity types (§3.0.3: encounter and authorization fold into `claim`/`insurance`); field values on claim/invoice/appointment drawers live in per-record **localStorage, not on the record** (so scrubber/reports can't read them); required-at-stage validation works **only for client processes**; spec roles don't exist and the live sidebar has no roles.
8. **Spec gaps:** A10–A12 are in no build slice; spec stage names ≠ status values in P1; no page/record specified for ERA (remittance), payer enrollment, or the A5 patient insurance form.
9. **Recommended start:** Slice 1 (engine prerequisites + reference data + entity stage sets), then Slice 2 (eligibility on the Insurance pipeline) as the first demo.
10. **Effort:** 20–25 front-end engineer-weeks (spec: 16–21; the difference is engine work that the PRD assumed was finished). Slices 1–2 ≈ 9–11 weeks.

---

## 2. Page inventory

### 2.1 Clinic app (`ProtectedRoute` > `MainLayout`, `src/app/routes.tsx`, 349 lines)

Sidebar = live `DEFAULT_SIDEBAR_CONFIG` (`src/app/context/SidebarMenuContext.tsx:38-96` ✔, version 9; **`src/app/config/navigation.ts` is dead code — no importer**). ● = spec touchpoint, ○ = indirectly affected, – = not touched.

| Route | Component (lines) | Sidebar location | Purpose today | Main stores | Spec |
|---|---|---|---|---|---|
| `/` | `Overview.tsx` (683) | WORKSPACE › Overview | Call/task dashboard | notificationsStore, processLogsStore, tasksStore | ○ RCM KPI row |
| `/scribe` | `AIScribeConsole.tsx` (451) | WORKSPACE › AI Scribe | Scribe sessions | scribeSessionStore (sessionStorage) | ● |
| `/clients`, `/clients/:id` | `Clients.tsx` > `ClientProfile.tsx` (4458) | WORKSPACE › Contact | CRM contacts | clientsStore, FieldRegistry | ● |
| `/call-logs`, `/call-logs/:id` | `CallLogs.tsx` (2300), `CallDetails.tsx` | WORKSPACE › Call Logs | Mock call history | processLogsStore | ○ |
| `/deals` | `Deals.tsx` (4169) | WORKSPACE › Process | **Client-process** kanban/list only (L763 ✔) | useProcessStore, clientsStore | ○ (stays client-only, PRD A4) |
| `/process` | `Process.tsx` (8004) | CUSTOMIZATIONS › Workflows | Entity tabs: Processes (client), Appointment, Invoice, Insurance & Claims, Task; stage editor | useProcessStore, useAutomationStore | ● (where RCM stages are defined) |
| `/automation` | `Automation.tsx` (622) | CUSTOMIZATIONS › Automation | Global rules **table** + `AddAutomationDrawer` | useAutomationStore | ● (where RCM move rules live) |
| `/tasks`, `/tasks/:taskId` | `Tasks.tsx` (710), `TaskDetailPage.tsx` | WORKSPACE › Tasks | Task table + detail | tasksStore | ● |
| `/appointments` | `Appointments.tsx` (1721) | WORKSPACE › Appointments | List/calendar(month)/availability; **auto per-stage filter presets** (L1149-1164) | appointmentService | ● |
| `/chats` | `Chats.tsx` (3874) | WORKSPACE › Chats | Inbox, templates (simulated) | useConversations, useWhatsappTemplates | ● |
| `/invoices` | `Invoices.tsx` (1030) | REVENUE & INSIGHTS › Invoice | List + **stage Kanban** from `invoiceProcess.stages` | invoiceService | ● |
| `/claims` | `Claims.tsx` (694) | REVENUE & INSIGHTS › Insurance & Claims | Claims list; stages from the **insurance** process | claimsStore (`mantra_claims_v1`) | ● |
| `/reports` | `Reports.tsx` (390) | REVENUE & INSIGHTS › Reports | Custom report builder | reportEngine, InvoiceContext | ● |
| `/services` | `Services.tsx` | REVENUE & INSIGHTS › Product & Services | Catalog (1 CPT per service) | servicesStore | ○ |
| `/settings/:tab/:subtab`, `/billing*` | `Settings.tsx` (13,305) | SETTINGS (SystemAdmin only via `SettingsGuard`) | Tabs: organization, users, **billing (=SaaS billing)**, voice-config, custom-fields, audit-logs, notifications, integrations, reception | many | ● |
| `/settings/team/:id` | `ManageTeamMember.tsx` | SETTINGS › Team | Member calendar/services | teamStore | ● NPI |
| `/web-forms*`, `/knowledge-base`, `/organizations`, `/users`, `/payments`, `/transactions`, `/profile`, `/guide*` | various | – | Not RCM (payments/transactions are SaaS-side) | – | – |

Kiosk `/reception/*` → one `AvatarReceptionView.tsx` (6736 lines; screen state machine; `/reception/billing/:subStep` ignores `subStep`). Patient portal `/patient/*` → `pages/patient/*` (`bill`, `pay` relevant). `/admin/*` → platform admin (no RCM).

### 2.2 Screens that behave like pages

| Screen | File (lines) | Notes |
|---|---|---|
| Schedule appointment drawer | `appointments/ScheduleAppointmentDrawer.tsx` (1553) | `SectionCard`s: Service L1313, Location L1334, Participants L1351, Schedule L1418; also mounted from `ActivityTab` and `ClientProfile` |
| Appointment detail drawer | `appointments/AppointmentDetailDrawer.tsx` (1294) | Tabs overview/documents/invoices/calls; `ChevronStageRibbon` L745; field sections `DEFAULT_APPOINTMENT_SECTIONS` |
| Claim detail drawer | `claims/ClaimDetailDrawer.tsx` (1140) | Tabs overview/documents/billing; `DraggableOverviewSections mode="claim"`; **also the create form** (`CreateClaimDrawer.tsx` is dead code) |
| Invoice detail drawer | `invoices/InvoiceDetailDrawer.tsx` (1185) | Tabs overview/documents/payments |
| Stage UI primitives | `common/SegmentedStageBar.tsx`, `ChevronStageRibbon.tsx` | Used by all entity pages |
| Stage move history | `automation/StageMovementTimelineModal.tsx` | Undo hardcoded to appointments/invoices |
| Dead/orphaned (don't build RCM here) | `AppointmentCard.tsx` (imported, never rendered ✔), `MyAIReceptionist.tsx` (no importer ✔), `ScheduledCheckinPanel`/`WalkInBookingPanel`/`InvoiceQrPaymentModal` (kiosk, unused), `TaskDetailDrawer`/`TaskContentSections` (no importers, NC) | |

---

## 3. Page-by-page mapping

### 3.0 How RCM maps onto the entity-wise workflow structure

#### 3.0.1 Ground rules (from the PRD, applied to RCM)

| # | Rule | Consequence for RCM |
|---|---|---|
| R1 | A stage **is** the record's status; each record has exactly one `currentStageId`; billing logic keys off hidden `systemCategory`, never stage names | Every RCM stage below carries a `systemCategory`; scrubber/reports/services read the category |
| R2 | One fixed process per entity (client: many) | RCM adds **stages** to existing entity processes; it does not add processes or new boards |
| R3 | Stage entry is the **only** trigger for actions | Cross-entity effects (create claim, update invoice, send statement) are **stage-entry actions** |
| R4 | Move-to-stage rules live **only** on Global Automation, and an event moves **only its own entity's** stages | e.g. `insurance.*` events move insurance records only; claim paid does not move an invoice by a move rule — it triggers an entry action that updates/moves it |
| R5 | One door: every mutation goes through one service that emits the event | New `insuranceService`, `claimService` (replace `claimsStore.moveClaimToStage` + `Claims.tsx handleStageChange`) |
| R6 | Idempotent entry, cause tracking, loop guard, Undo | Reuse `logStageMove` / `StageMovementTimelineModal`; generalize Undo |
| R7 | Failures never undo facts; failed actions show Retry | Needed for submit/eligibility/message actions |
| R8 | **Work queues are stage groups** (new, per your direction) | "Claim fixes" = claims in *Scrub failed + Rejected*; shown as filter presets on the entity page. **Tasks are only for ad-hoc human to-dos** (decision Q3) |

#### 3.0.2 What main actually has vs. the PRD (prerequisites)

| # | PRD says | Main today (evidence) | RCM prerequisite (gap) |
|---|---|---|---|
| G1 | One fixed process per entity; no add/delete | `saveStoredProcesses` "supports multiple processes per entity" (`useProcessStore.ts` L1560-1585); "Add Workflow" shown for appointment/insurance/task/invoice (`Process.tsx` L3649-3660); delete blocked only for invoice and sole defaults | Add store + UI guards for the entity tabs used by RCM |
| G2 | Claim has its own process | **Claim processes are deleted on load** (`useProcessStore.ts` L1340-1343); `DEFAULT_ENTITY_PROCESSES.claim` (clm-1..5, L778-798 ✔) is in-memory only; claims move through the **insurance** stages (`Claims.tsx` L64-94) | Persist the claim process; give insurance its own meaning (G3); migrate claim `currentStageId` (clm-* vs ins-* ids already inconsistent: `entityMigration.ts` L120 vs `Claims.tsx`) |
| G3 | Insurance entity with records | **No insurance record or store.** `insurance` is only a process used by Claims. Default insurance stages are claim-like: Draft & Intake, Coverage Verified, Submitted (837P), Under Review, Paid & Settled, Denied (L769-776 ✔); **`getStoredProcesses` overwrites insurance stages with these defaults when ≤3 stages (L1346-1364)** | New `insuranceStore` + `insuranceService`; replace defaults (§3.0.4); change the overwrite rule |
| G4 | Stage entry runs `workflowSteps` | **No code runs `Stage.workflowSteps`.** On-entry actions run only as `AutomationRule`s with a stage-entered trigger (`ruleEngine.ts` L182-236, L420-998); fixed marker steps (`book_appointment`, `mark_paid`…) have no executor | Seed RCM entry actions as **default AutomationRules** (like `rule-inv-paid-auto`), not as `workflowSteps` |
| G5 | Delay / wait | `delay`/`delayValue` are stored but **never executed**; no scheduler; only `checkOverdueInvoices` (once on mount, `InvoiceContext.tsx` L332) | `rcmJobs.runDaily()` ("Run daily jobs now") emitting due-events; honor `delay` later (backend) |
| G6 | Events for claim/insurance | `claim.*`, `insurance.*`, `task.*`, `client.created` cataloged (`useAutomationStore.ts` L189-234) but **never emitted**; `moveClaimToStage` logs nothing | New services emit; fix `ruleEngine.ts` L404 `else` (anything not appointment/invoice is moved as a **client**) |
| G7 | New action types register in the Records category | Registration touches 5 places (StepCatalogDrawer, AddAutomationDrawer, `STEP_ALLOWED_TRIGGERS` ×3, StepParametersFields, ruleEngine) (explorer §3) | Add each RCM action once; consider de-duplicating `STEP_ALLOWED_TRIGGERS` |
| G8 | Required system categories protect stages | `REQUIRED_SYSTEM_CATEGORIES` (L381-388 ✔) is out of sync with defaults (e.g. appointment requires `cancelled`, defaults have `no_show`; invoice requires `void`, defaults have `payment_recorded`); `isPredefinedStage` also protects any stage *named* Paid/Draft/etc.; custom stages get **no `systemCategory`** | Define categories for every RCM stage; fix required lists |
| G9 | Required fields at a stage | `requiredStages` works **only for `module === "process"` fields**, called only from Deals/ClientProfile/Clients/ProcessDetailDrawer (`processFieldValidation.ts` L58-66) | Generalize to claim/insurance/invoice; reuse `RequiredFieldsModal` |
| G10 | Undo for any move | `undoStageMove` hardcodes appt-1, inv-1/2/5 (`useAutomationStore.ts` L596-647) | Generalize by `systemCategory` |
| G11 | Phase-2 UI (partition line, automation cards under stages, "Moves here via Automation") | **Not rendered** (`StageAutomationCards.tsx` imported, never used); report overstates | Optional; RCM can use the existing stage "Automations" tab (`Process.tsx` L4576) |
| G12 | Field values on the record | Claim/invoice/appointment drawer values live in localStorage keys like `mantra_claim_fieldvalues_<id>`, **not on the record**; only `client_name`/`billed_amount` write back | RCM fields read by services/scrubber/reports must be real properties on `Claim`/`ClientInvoice`/`Appointment`/`Insurance` |
| G13 | Doc staleness | Progress report stage lists (e.g. insurance "Pending Verification…Expired") don't match code | Treat code as truth; update the report later |

#### 3.0.3 Which entity hosts which spec pipeline

| Spec pipeline (entity per spec) | Hosted on main entity | Record | Deviation from spec | Why |
|---|---|---|---|---|
| P1 Coverage verification (eligibility check, one per appointment) | **`insurance`** | *Insurance verification* — one per appointment (new `insuranceStore`) | none | Matches PRD Insurance events (eligibility checked/verified/failed) |
| P2 Prior authorization (authorization) | **`insurance`** (stages after Verified) | same record; auth data = fields on it | Authorization is **not its own entity/record** | One record, one stage: a visit is "cleared" only when coverage *and* auth are resolved. Alternative in Q2 |
| P3 Charge capture (encounter) | **`claim`** (first stages) | *Claim per visit*, created when the appointment enters **Completed** (PRD happy flow) | Encounter is **not its own entity** | PRD flow already creates the claim at Completed; Scribe signing moves it |
| P4 Claim | **`claim`** | same claim | none | |
| P5 Denial (denial) | **`claim`** (stages after Denied) | same claim; denial data = fields; per-line denial codes in the lines table | **No denial entity/board**; one denial per *claim* (line detail kept as line fields) | Your direction: denial via pipeline stages only |
| P6 Patient balance | **`invoice`** | existing patient invoice | none (adds stages) | |
| (Appointment) | `appointment` | unchanged stages; **gets entry actions** | – | Booked → check coverage; Completed → create claim |
| (Work items) | `task` | unchanged | – | Linked to a record; optional |

#### 3.0.4 Default RCM stage sets (extend today's fixed defaults)

**Insurance pipeline** — replaces today's claim-shaped defaults. Old → new: Draft & Intake→*Not checked*; Coverage Verified→*Verified*; Submitted (837P)/Under Review/Paid & Settled/Denied→ these belong to **claim** now.
Required stages (cannot be deleted) are marked ✔; others are optional/deletable per clinic.

| # | Stage | systemCategory | Position / category | Req. | Owner | Spec SLA | Reached by (move rule) | Entry action(s) |
|---|---|---|---|---|---|---|---|---|
| 1 | Not checked | `not_checked` | initial / in_progress | ✔ | System | batch 3 d & 1 d before visit | appointment Booked → create record | – |
| 2 | Checking | `checking` | intermediate | | System | seconds | `run_eligibility` started | – |
| 3 | Needs fix | `needs_fix` | intermediate | | Front desk | before visit | `insurance.eligibility_checked` + status needs_fix (name/DOB/ID mismatch after retries) | notify front desk (field `resolverMessage` names what to confirm) |
| 4 | Provider setup issue | `provider_issue` | intermediate | | Biller | 5 business days | status provider_not_enrolled | – (queue "Enrollment") |
| 5 | Inconclusive | `inconclusive` | intermediate | | Biller | 1 bd before visit | no usable answer after retries | `start_call` payer benefits (if voice on) |
| 6 | Pending review | `pending_review` | intermediate | | Biller | same day | voice/manual benefits captured | – (accept = move to Verified) |
| 7 | Auth required | `auth_required` | intermediate | | Biller | 3 bd before visit | booking matches payer × service auth rule; or renewal due | – |
| 8 | Auth submitted | `auth_submitted` | intermediate | | Biller | follow-up 3 d | auth request sent | – |
| 9 | Verified | `verified` | **final / success** | ✔ | – | re-check if >30 d | active 271, no auth needed; or auth approved | send estimate (A9) |
| 10 | Auth expired | `auth_expired` | intermediate | | Biller | before next visit | date/units exceeded | – |
| 11 | Inactive | `inactive` | **final / lost** | ✔ | Front desk | before visit | 271 inactive | message patient: update insurance (A5) |
| 12 | Auth denied | `auth_denied` | final / lost | | Biller | 2 bd | payer denies | – |
| 13 | Self-pay | `self_pay` | final / success | | – | – | patient has no coverage / chose self-pay | – |

**Claim pipeline** — extends today's claim defaults (Draft, Submitted, In Review, Paid, Denied: `clm-1..5`).

| # | Stage | systemCategory | Position / category | Req. | Owner | Spec SLA | Reached by | Entry action(s) |
|---|---|---|---|---|---|---|---|---|
| 1 | Awaiting note | `awaiting_note` | initial / in_progress | ✔ | Provider | same day | appointment Completed → `create_claim` | remind provider |
| 2 | Coding review | `coding_review` | intermediate | | Provider/coder | 24 h | note signed (`claim.note_signed`) | – |
| 3 | Hold | `hold` | intermediate | | Biller | 2 bd | missing info (auth/coverage/referring) | – |
| 4 | Draft | `draft` | intermediate | ✔ | System | immediate | codes accepted (`claim.coded`) | price lines; `scrub_claim` |
| 5 | Scrub failed | `scrub_failed` | intermediate | | Biller | 1 bd | scrubber errors | – (queue "Claim fixes") |
| 6 | Ready to submit | `ready` | intermediate | | System | daily batch | scrub passed | – |
| 7 | Submitted | `submitted` | intermediate | ✔ | System | 2 d for acks | `submit_claim` | – |
| 8 | Rejected | `rejected` | intermediate | | Biller | 2 bd | 999 / 277CA rejection | – (queue "Claim fixes") |
| 9 | Accepted by payer | `accepted` | intermediate | | System | status check if no ERA 30 d | 277CA accepted | – |
| 10 | Pending (payer) | `in_review` | intermediate | | Biller | per payer | status = pending/info requested | – |
| 11 | Partially paid | `partially_paid` | intermediate | | Biller | 5 bd | ERA paid < expected | `update_invoice_from_claim` |
| 12 | **Denied** | `denied` | intermediate *(today: final/lost — change)* | ✔ | System | immediate | ERA denial | categorize + set appeal deadline + assign (A25) |
| 13 | Correct & resubmit | `denial_correct` | intermediate | | Biller | 5 bd | triage: fixable | – |
| 14 | Appeal drafted | `appeal_drafted` | intermediate | | Biller | before payer deadline | triage: appeal | `draft_appeal` (AI proposes; person edits/sends) |
| 15 | Appeal submitted | `appeal_submitted` | intermediate | | Biller | follow-up 30 d | appeal sent | – |
| 16 | Paid | `paid` | **final / success** | ✔ | – | – | ERA paid (incl. appeal won, field `appealOutcome=won`) | `update_invoice_from_claim` (statement) |
| 17 | Written off | `written_off` | final / lost | | Practice manager | – | final denial, write-off approved | – |
| 18 | Closed | `closed` | final / success | | – | – | balance zero | – |

*18 stages is a lot for one bar. The segmented bar groups in-progress / won / lost; optional stages can be removed per clinic. Alternative (Q1): split Charge capture and Denial into their own entities.*

**Invoice pipeline (P6)** — today's defaults are Draft, Payment recorded, Paid, Overdue; the services/kanban also handle Sent, Viewed, Partially paid, Void (**NC** which exist as stored stages). RCM adds only four:

| Stage | systemCategory | Spec meaning | New? |
|---|---|---|---|
| Draft | `draft` ✔ | Estimate shown (insured) / draft | existing |
| Sent | `sent` | Balance due — statement sent | existing (NC) |
| Partially paid | `partial` | Collected at visit / part-paid | existing (NC) |
| **Reminder 1** | `reminder_1` | 15 days unpaid | **new** |
| **Reminder 2** | `reminder_2` | 30 days unpaid (+ voice reminder at 45) | **new** |
| **Payment plan** | `payment_plan` | instalments agreed | **new** |
| Overdue | `overdue` | 60+ days | existing |
| Paid | `paid` ✔ final/success | | existing |
| **Written off** | `written_off` final/lost | | **new** |
| Void | `void` ✔ final/lost | | existing |

**Appointment / Task:** no new stages. Appointment gets **entry actions** (Booked, Checked In, Completed — §3.0.5). Task gains fields only (§3.0.6).

**Required-categories fix (G8):** set insurance = `not_checked, verified, inactive`; claim = `awaiting_note, draft, submitted, denied, paid`; invoice = `draft, paid, void`; keep appointment/task.

#### 3.0.5 The 30 automations as pipeline mechanics

Mechanisms: **M** = move rule on Global Automation (own-entity move) · **E** = stage-entry action (seeded as a default `AutomationRule` with a stage-entered trigger — G4) · **R** = rule action (event → action, no stage) · **J** = time-based, emitted by `rcmJobs.runDaily()` (G5) · **Q** = result lands in a stage which *is* the queue (no task).

Event names: use main's prefixes (`insurance.*`, `claim.*`, `invoice.*`, `appointment.*`); spec `eligibility.*` → `insurance.*`, spec `encounter.*` → `claim.*` (coding/signing), `auth.*` → `insurance.auth_*`.

| A# | Trigger → result | Mech. | Entity / stage touched | New executor / event |
|---|---|---|---|---|
| A1 | `appointment.booked` (has coverage) → verify | E on Appointment **Booked** | creates insurance record → *Not checked → Checking* | `create_insurance_check` + `run_eligibility`; `insurance.eligibility_checked` |
| A2 | Daily 6 pm: visits in 3 d / tomorrow | J → R | insurance records re-enter *Checking* (skip fresh) | `run_eligibility` batch |
| A3 | `coverage.updated` (future visits) | R | re-check | `coverage.updated` event (client-level data) |
| A4 | status needs_fix | M (+Q) | insurance → *Needs fix* | resolver sets `resolverMessage` |
| A5 | status inactive | M + E on *Inactive* | insurance → *Inactive*; message patient | real send-message executor |
| A6 | provider not enrolled | M (+Q) | insurance → *Provider setup issue* | – |
| A7 | inconclusive, voice on | M + E on *Inconclusive* | insurance → *Inconclusive*; start call | `start_call`; result → `insurance.pending_review` → M *Pending review* |
| A8 | inconclusive, voice off/failed | M (+Q) | stays in *Inconclusive* queue | – |
| A9 | Verified, 2 d before visit | J → E on *Verified* | message with estimate | `send_message` + estimate calc |
| A10 | `appointment.booked` & payer×service needs auth | E on **Booked** | insurance → *Auth required* | `insurance.auth_required` + auth-rule lookup |
| A11 | Auth ≤14 d to expiry or 80% units | J → M | insurance → *Auth required* (renew) / *Auth expired* | `insurance.auth_expiring` |
| A12 | Daily: visit in 2 d & auth not approved | J → R | notify front desk + biller; flag on appointment | notification |
| A13 | `appointment.checked_in` & last check >1 d | E on **Checked In** | re-check | `run_eligibility` (fix check-in double-emit first) |
| A14 | `appointment.completed` | E on **Completed** | **creates claim** → *Awaiting note*; remind provider | `create_claim` (idempotent per appointment — PRD Phase 5) |
| A15 | Daily 7 pm: unsigned >24 h | J → R | notify provider | notification |
| A16 | Note signed + codes accepted | M | claim *Awaiting note → Coding review → Draft*; E on Draft: price + scrub | `claim.coded`, `scrub_claim` |
| A17 | scrub errors | M (+Q) | claim → *Scrub failed* | `claim.scrub_failed` |
| A18 | Daily 5 pm: *Ready to submit* | J → R | submit batch → claim *Submitted* | `submit_claim` (mock adapter) |
| A19 | Daily: *Submitted* >2 d no ack | J → R | notify | – |
| A20 | 999 / 277CA rejection | M (+Q) | claim → *Rejected* | `claim.rejected` |
| A21 | Daily: *Accepted*, no ERA 30 d | J → R | status check → claim → *Pending (payer)* or stays; A/R queue by age | `check_claim_status` |
| A22 | `era.received` | R | auto-post → claim → *Paid / Partially paid / Denied* | `post_remittance`; `claim.paid/partially_paid/denied` |
| A23 | `era.unmatched` | R (no stage) | Claims page "Unmatched payments" modal + notification | ERA record (not a pipeline — Q4) |
| A24 | `claim.partially_paid` (under by >$5 or 5%) | M (+Q) | claim → *Partially paid* | – |
| A25 | `claim.denied` | M + E on *Denied* | claim → *Denied*; categorize, set appeal deadline, assign owner | CARC/RARC → category table |
| A26 | `denial.deadline_near` (14 d, not appealed) | J → R | raise priority + notify manager (claim stays in stage) | notification + field `priority` |
| A27 | claim Paid / Partially paid / final denial | E on claim **Paid/Partially paid/Written off** | **updates invoice**, invoice → *Sent* (statement + payment link) | `update_invoice_from_claim`, send-message (cross-entity via entry action — R4) |
| A28 | invoice *Sent* unpaid 15 / 30 d | J → M | invoice → *Reminder 1 / 2*; E sends reminder | `invoice.reminder_due` |
| A29 | 45 d unpaid & voice consent | J → R | balance reminder call | `start_call` |
| A30 | `invoice.overdue` (60 d) | J → M (+Q) | invoice → *Overdue* (manager decision queue) | job replaces mount-only `checkOverdueInvoices` |

**Not in spec's slices:** A10–A12 (assigned here: A10 Slice 2, A11–A12 Slice 5).

#### 3.0.6 Fields — registry modules per entity (no new standalone stores for child data)

Mechanism on main: entity fields are **Field Registry** fields in modules (`FieldModule` = client, process, appointment, call, service, organization, deal, teamMember, scribe, invoice, claim — **no insurance/denial/task module**; `normalizeModuleKey` maps "insurance" → "claim"), rendered in drawers by `DraggableOverviewSections`. Add a new **`insurance`** module; extend `claim`, `invoice`, `appointment`, `client`. **Prerequisite G12:** put values on the record (not drawer-local storage).

| Entity / module | New sections and fields (spec §7) | Child tables (field type `table`) | Stage-required (G9) |
|---|---|---|---|
| **insurance** (new module) | *Coverage* (payer, member ID, group, plan, priority, subscriber + relationship, effective/term, card front/back); *Eligibility result* (status, copay, deductible remaining, coinsurance, OOP remaining, network, plan dates, other payers); *Resolver* (rejectionCode, category, action, attempt #, message); *Authorization* (required?, auth #, units approved/used, valid from–to, referring provider, status); *Call* (call ref, source clearinghouse/voice/manual, reviewedBy/At) | **Benefit lines** (service type, kind, level, network, amount/%, remaining, period, confidence) | *Auth submitted*: auth request date; *Verified via voice*: call reference + reviewer |
| **claim** (existing + new sections) | *Visit* (rendering provider, location, DOS, scribe session); *Codes*; *Submission* (claim #, frequency, payer claim #, batch, 999/277CA); *Money* (billed, expected, allowed, paid, adjustments, patient responsibility); *Scrub*; *Denial* (reason codes, category, root cause, appeal deadline/level/letter/outcome, amount at stake); assignee, timely-filing deadline, priority. Existing fields kept: `prior_auth_number`, `payer_name`, `policy_number`, `diagnosis_codes`, `procedure_codes`… | **Diagnoses** (ICD-10, sequence), **Lines** (CPT, modifiers ×4, units, charge, pointers, paid, allowed, line denial codes), **Scrub issues**, **Payments/remittances** (trace #, paid, adjustments CO/PR/OA with CARC/RARC), **Events** → use ActivityTab/stage log | *Coding review*: ≥1 ICD + CPT accepted; *Submitted*: billing NPI/tax ID/POS present; *Denied*: reason codes; *Appeal drafted*: deadline + letter; *Correct & resubmit*: frequency = corrected; *Written off*: reason + approver |
| **invoice** | claim link, insurance paid, adjustments, patient responsibility, statements count / last sent | **Payment plan** (total, instalment, frequency, next due, card token, status) | *Payment plan*: instalment + frequency |
| **appointment** | coverageId, secondaryCoverageId, financialClass, latestInsuranceCheckId (+ stage chip, derived), authorization ref, claim link | – | – |
| **client** | legal first/last name, DOB, sex, address, guarantor, selfPay, consents {sms, voice, cardOnFile} | **Coverages** (policy data, primary/secondary/tertiary) | – |
| **teamMember** / **organization** | NPI, taxonomy, license (+state), specialty, isRendering/isBilling; billing entity (legal name, EIN, group NPI, taxonomy, addresses); Location list (POS) | – | – |
| **task** | entityRef {type,id}, taskType, priority (low/normal/high/urgent), dueAt, payerId, amountAtStake, source | – | – |

**Reference data with no pipeline** (Settings › Billing setup): Payer (incl. supports 270/837/276/835, timely-filing days, appeal days, auth rules), Payer enrollment, Fee schedule, claim defaults, scrub rules.

#### 3.0.7 The spec's work queues as stage groups

| Queue (spec §8) | Entity page | Stage group (filter preset) |
|---|---|---|
| Insurance fixes | Insurance | Needs fix, Inactive |
| Benefits to verify | Insurance | Inconclusive, Pending review |
| Enrollment | Insurance | Provider setup issue |
| Prior auth | Insurance | Auth required, Auth submitted, Auth expired, Auth denied |
| Claim fixes | Claims | Scrub failed, Rejected |
| Posting | Claims | Partially paid; + "Unmatched payments" modal (ERA) |
| Denials and A/R | Claims | Denied, Correct & resubmit, Appeal drafted, Appeal submitted + computed aging (Accepted/Pending > N days) |
| Patient balances | Invoices | Sent, Reminder 1/2, Payment plan, Overdue |

Today only **Appointments** auto-generates a preset per stage (L1149-1164); Claims and Invoices have hardcoded status tabs, and there is **no stage-group ("final only"/by category) filter** and no saved views — all need building (§3.3, §3.7).

---

### 3.1 Schedule appointment drawer — drawer on `/appointments`, `/clients/:id` — `components/appointments/ScheduleAppointmentDrawer.tsx`

Facts: `primaryInsurance`/`secondaryInsurance` are type-only (L79-80) and never passed from `Appointments.tsx` (L1559-1611); booking = `onSave` → `handleBookingComplete` → `appointmentService.createAppointment` (`appointmentService.ts:630`, emits `appointment.booked` L837). `createAppointment` is reported to be blocked unless an appointment automation exists (L637-647, NC). Mounted also by `ActivityTab` and `ClientProfile` — new props must be optional.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse (main) | Effort |
|---|---|---|---|---|---|---|---|---|
| Insurance vs self-pay; pick/add coverage from canonical payers | F1.1-2 | Segmented control + coverage select + "Add coverage" | New `SectionCard` "Coverage" between Participants (L1413) and Schedule (L1418) | client Coverages table, Payer list (Billing setup) | `coverage.added` | new | `SectionCard`/`FieldRow`, `CustomDropdown` | M |
| Verify now + result chip | F1.3, F2 | Button + chip = **stage of the linked insurance record** (green Verified / amber Needs fix, Inconclusive, Pending review / red Inactive / grey Not checked) | same section | `insuranceStore` (record per appointment) | A1; `insurance.eligibility_checked` | new | `SegmentedStageBar` colors from stage `color` | M |
| Auth-required warning | F1.4 | Inline alert; auto-creates record in *Auth required* | same section; footer summary L1263 | Service `authRequiredDefault` + Payer `authRules` | A10 | new | – | M |
| Estimate in confirmation | F1.5, A9 | Text in confirmation | confirmation step | benefit lines + fee schedule | A9 | new | – | S |
| Gate: coverage chosen or self-pay | F1 | Extend `isFormComplete` (L1180) | footer | – | – | modify | – | S |

### 3.2 Appointments list and calendar — `/appointments` — `pages/Appointments.tsx`, `AppointmentCalendarView.tsx`

Facts: list columns ID, Title, Stages (`SegmentedStageBar` L1317), Client, Date, Time, Provider, Service; **auto per-stage presets** (L1149-1164); row actions L1469-1540 (no check-in); calendar is month-only with a hard-coded "✓ CONFIRMED" badge (L320-325). `AppointmentCard` is not rendered (dead).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Coverage chip (green/amber/red/grey) | §2, P1 | Chip = stage + colour of the linked insurance record | **New "Coverage" column** after Service; dot in month cell (L196-218) and chip in day-card header (L319) | `Appointment.latestInsuranceCheckId` → `insuranceStore` | refresh on `stage.entered` for that record | modify | stage `color` + `categorizeChevronStage` | M |
| Click chip → Coverage tab | §2 | opens detail drawer tab | list + calendar | – | – | modify | existing drawer-open handlers | S |
| "Verify upcoming" batch | A2 | Toolbar button | list toolbar | `rcmJobs` | A2 (J) | new | – | S |
| `clientId` always set | §7 Appointment | none | `appointmentService` payload | `Appointment.clientId` required | – | modify | – | M |
| Mark complete → claim | A14 | existing "Mark complete" (`Appointments.tsx:1651`) | row action / drawer | `claimService` | `appointment.completed` ✔ → E on **Completed** | modify | existing | S |

### 3.3 Appointment detail drawer — `components/appointments/AppointmentDetailDrawer.tsx` (1294)

Tabs array L782-787 (`activeTab` L128); Overview = `DraggableOverviewSections` (L79-108) + `ActivityTab`; stage ribbon L743-745.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Eligibility summary, estimate, Re-run, "View raw" | §2 | New **"Coverage" tab** showing the **linked insurance record**: its stage ribbon (`ChevronStageRibbon`), result card (copay/deductible remaining/coinsurance/OOP remaining/network), benefit-lines table, Re-run, raw payload | add to tab array L782-787 + body | `insuranceStore`; insurance-module registry fields | A13 | new | `ChevronStageRibbon`, `DraggableOverviewSections` (`mode` extended to `insurance`) | M |
| Pending-review Accept/Edit | F3.4 | Accept = move to *Verified* (audited) | Coverage tab | `insuranceService.moveToStage` | stage move cause "manual" | new | one-door move + `logStageMove` | S |
| Check in | F4 | "Check in" button (no front-desk check-in UI exists today) | drawer header | `appointmentService.checkInAppointment` (L1138 ✔; sets `checkedInAt` only, not stage) | A13 | new | – | S |
| Claim link / stage | – | chip "Claim: <stage>" | Overview section | `Claim.appointmentId` | – | new | – | S |

### 3.4 Check-in (front desk + kiosk) — `AppointmentDetailDrawer`, `src/reception/avatar/AvatarReceptionView.tsx`

Facts: `checkInAppointment` emits `appointment.checked_in` (L1151) + `client.checked_in` (L1155); `mockMaClient.ts` (~L1368-1385) emits the same and calls it → **possible double fire (NC)** (fix before A13). Kiosk flow `PHONE→OTP→PATIENT_PICK→DETAILS_SUMMARY` (L5025-5107) → `handleConfirmCheckin` (L2373); payment is the separate `BILLING` screen (L5316, QR L5114). No copay/insurance capture in check-in.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Coverage chip + copay; auto re-run if stale | F4.1, A13 | Chip + copay line | desk: detail drawer header; kiosk: `DETAILS_SUMMARY` row (L5028-5069) | insurance record | E on **Checked In** | new | – | S |
| Confirm insurance unchanged; capture card photos | F4.2 | New kiosk states `INSURANCE_CONFIRM`, `CARD_CAPTURE` before L2373/L5092; desk: coverage editor | kiosk + drawer | client Coverages (card images) | `coverage.updated` → A3 | new | existing kiosk `ScreenState` pattern | M |
| Collect copay/deposit; record against visit | F4.3 | Kiosk `COPAY` (reuse BILLING QR); desk: `RecordPaymentModal` | kiosk + drawer | `invoiceService.recordPayment` (L758) | `invoice.partially_paid/paid` ✔ | modify | `RecordPaymentModal` | M |
| Inactive/unverified → self-pay or reschedule; manager override with reason | F4.4 | Alert + reason field (audit entry) | desk + kiosk | audit store | – | new | – | S |

### 3.5 Client profile — `/clients/:id` — `pages/ClientProfile.tsx` (4458)

Tab array L2349-2357 ✔ (overview, processes, forms, appointments, invoices, documents, products), `activeProfileTab` union L933; Invoices tab body L3423-3710; custom sections via `DEFAULT_CLIENT_SECTIONS` (L424-457). **No typed DOB/sex/address** (`CreateClaimDrawer` reads `(cl as any).dob`).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Insurance tab**: coverages (primary/secondary/tertiary, subscriber, card images) + **list of the client's insurance records with their stage chips** (= eligibility history) | §2, §7 | New tab `insurance` | add to array L2349-2357, union L933, body after L3710 | client Coverages table; `insuranceStore` filtered by client | `coverage.added/updated` → A3 | new | registry section + table field; `SegmentedStageBar` for record stages | L |
| **Billing tab**: claims (with stage chips), patient invoices (with balance stages), payments, statements, payment plan | §2, F9 | New tab `billing`; move existing Invoices tab content into it | after Insurance tab | `claimsStore` / `invoiceService.getInvoicesByClient` | – | modify | existing invoice list (L3423-3710) | M |
| Typed demographics + guarantor + consents | §7 Client | Section in Overview | `DEFAULT_CLIENT_SECTIONS` + registry client module | `clientsStore` typed fields | – | modify | registry sections | M |
| Highlight a field from a queue item | §8 | `?tab=insurance&field=…` | Insurance tab | – | – | new | – | S |
| RCM activity entries | §2 | Activity types: eligibility checked, claim moved, payment posted, statement sent | Overview right column | `activityEngine` (add types, `insuranceId`) | stage log | modify | `ActivityTab` | S |

### 3.6 AI Scribe — `/scribe` — `TranscriptDetailDrawer.tsx`, `AIScribePopup.tsx`, `scribeSessionStore.ts`

Facts: no sign/lock (`ScribeSession.status` ends at `completed`); `saveScribeSession` (L630-672) emits **no** eventBus event and does not complete the appointment; `icd10Code` stored but not shown; **hard-coded `icd_code: "J06.9"`** ✔ (`TranscriptDetailDrawer.tsx:218`); no CPT/modifier fields; sessions in sessionStorage.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Codes panel** (suggested ICD-10 with pointers; CPT + modifiers RT/LT/50; accept/edit/decline) → writes to the visit's **claim** tables | F5.1-2 | Card with rows + `CPTCodeInput` | `TranscriptDetailDrawer` col. 1 below AI Summary (after L521) | claim Diagnoses/Lines tables (linked by `appointmentId`) | `claim.coded` → A16 | new | `CPTCodeInput.tsx`, `ClaimDiagnosisCode` shape | L |
| Fix hard-coded ICD | prerequisite | read `d.icd10Code` | L218 | – | – | modify | – | S |
| **Sign and send to billing** | F5, P3 | Primary button | drawer header (L391-405) | `ScribeSession.status='signed'`, `signedAt`, `signedBy` → claim **Awaiting note → Coding review** | `claim.note_signed` (new; no scribe event exists) | new | one-door pattern | M |
| Ophthalmology codes (92004, 92014, 92083, 76519, 66984 + RT/LT/50) | §9 slice 3 | seed | `cptCodes.ts` (missing today) + scribe presets | – | – | modify | – | S |
| Unsigned >24 h reminder | A15 | notification | notifications | `notificationsStore` | A15 (J) | new | – | S |

### 3.7 Invoices — `/invoices` — `pages/Invoices.tsx`, `InvoiceDetailDrawer.tsx`, `RecordPaymentModal.tsx`, `invoiceService.ts`

Facts: Kanban columns come from `invoiceProcess.stages` (L314-322; board L700+, own inline copy of Deals); presets are hardcoded all/paid/overdue/draft (L383-415); `invoiceService.moveToStage` (L958) maps status from `systemCategory`; special drops: Overdue blocked, Sent→`sendInvoice`, Paid→`recordPayment`, Partially paid→modal, Void→`voidInvoice` (L758-791); `invoiceService.moveToStage` **double-emits** `stage.entered`; `ClientInvoice` lacks claim/insurance fields.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Patient-balance stages** (Reminder 1/2, Payment plan, Written off) | P6 | New stages in the invoice process; Kanban columns appear automatically | `useProcessStore` defaults + Kanban (L314-322) | invoice process | A28, A30 | modify | existing dynamic columns | M |
| Stage-group presets ("Patient balances" = Sent+Reminders+Plan+Overdue) | §8 | Filter presets generated from stages (copy Appointments' L1149-1164 approach) | `PageTopBar filterPresets` (L383-415) | – | – | modify | Appointments preset generator | S |
| Claim link, "Insurance paid", "Patient owes" columns | §2, F9.1 | 3 columns + "View claim" | `invoiceColumns` L495-690 (after Balance ~L606); export fields L480-489 | `ClientInvoice.claimId/insurancePaid/patientResponsibility` | – | modify | existing columns | S |
| Payments tab breakdown (charge, insurance paid, adjustments, patient owes) | F9.1 | Replace the 4 metric cards | `InvoiceDetailDrawer.tsx` L929-955 | derived from `Payment` + claim | `update_invoice_from_claim` | modify | – | M |
| Statement / payment-plan sections | F9.2/4 | New draggable section + "Send statement" / "Set up plan" | Overview sections (L76-125) | payment-plan table field | A27, A28 | new | `DEFAULT_INVOICE_SECTIONS` | M |
| Record insurance/ERA payment with claim link | F7 | claim id + adjustment lines in payment-type step | `RecordPaymentModal` L111-138, L282-330 | `Payment.claimId`, adjustments | – | modify | existing insurance payment type | M |
| Invoice at booking vs after adjudication | F9 | Insured visit invoice stays **Draft (estimate)** until the claim adjudicates, then entry action updates amounts and moves it to *Sent* | invoice process + A27 | – | A27 | modify | `createInvoiceFromAppointment` idempotency | M |

### 3.8 Claims — `/claims` (becomes the Claim pipeline page) — `pages/Claims.tsx`, `components/claims/*`, `lib/claimsStore.ts`

Facts: loads the **insurance** process (L64-94 — must switch to the claim process, G2); list status tabs hardcoded by `ClaimStatus` (L269-320); no Kanban; **two stage-move paths** (`Claims.tsx handleStageChange` L135-161 and `moveClaimToStage` L467 ✔) with different substring maps, **no event, no `logStageMove`**; creation via `ClaimDetailDrawer` create mode (L126-162); `CreateClaimDrawer` unused; `submitClaimElectronically` (L434) is a mock that doesn't set `currentStageId`; seeds reference `CL-001..005` that don't match `canonicalClients`.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Claim stages = list/board/drawer ribbon | P3-P5 | Use the **claim** process (18 stages) | `Claims.tsx` L64-94 | claim process (persisted) | `stage.entered` via `claimService` | modify | `SegmentedStageBar`, `ChevronStageRibbon` | M |
| **Stage-group presets** (all spec queues for claims, charges-to-review, rejections, denials, A/R) | §2, §8 | Presets generated from stages + groups: *Charges to review* (Awaiting note, Coding review, Hold), *Claim fixes*, *Denials*, *A/R by aging* (computed) | `PageTopBar filterPresets` (L269-320) | stage → group config (stored on process, not hardcoded) | – | modify | Appointments' per-stage preset code | M |
| **Kanban toggle** (Denials board = Kanban filtered to denial stages) | §2 | Shared `PipelineBoard` component | `Claims.tsx` toolbar | claim process | drag → `claimService.moveToStage` | new | extract from `Invoices.tsx` L700+ / `Deals.tsx` | L |
| One-door `claimService` (move, submit, post, create) emitting `claim.*` and `stage.entered`; validate required-at-stage; log + Undo | R5, G6 | – | `src/lib/claimService.ts` (replaces both movers) | `claimsStore` records | all `claim.*` events | new | `appointmentService.moveToStage` as template | L |
| Stage-required fields enforced on move (Denied needs codes, Appeal drafted needs deadline+letter…) | G9 | `RequiredFieldsModal` on drag/ribbon change | list + drawer | registry `requiredStages` generalized | – | new | `RequiredFieldsModal` (Deals) | M |
| Drawer sections: Visit, Codes (tables), Submission, Money, Scrub, **Denial**, Payments (remittances) | §7 | New registry sections `sec-clm-visit/codes/submission/money/scrub/denial/payments` | `DEFAULT_CLAIM_SECTIONS` (L75-124); `SYSTEM_SEEDS.claim` (FieldRegistry L2062-2093) | **properties on `Claim`** (G12) | – | modify | `DraggableOverviewSections mode="claim"` | L |
| Claim timeline (999, 277CA, status, payment, denial, resubmitted) | §7 Claim event | ActivityTab entries | drawer right column | `activityEngine` (+`claimId` exists) | – | modify | `ActivityTab` | S |
| Post payments / ERA; **Unmatched payments** modal; manual EOB | F7, A22-A23 | Toolbar "Post payments" + modal | Claims page header | remittance child table; ERA records | `era.received/unmatched` | new | `RecordPaymentModal` pattern | L |
| Appeal draft (AI proposes, person edits/sends) | F8.3 | Button in *Appeal drafted* | drawer Denial section | `appealLetter` field | E on *Appeal drafted* | new | AI settings pattern | M |
| Submit / Resubmit / Void / Print CMS-1500 / Defer | F6 | existing buttons (`ClaimSubmissionModal`, `ClaimStatusModal`, `CMS1500Modal`) rewired to `claimService` | row actions (L609-633) | – | A18, A21 | modify | existing modals | M |
| Delete dead `CreateClaimDrawer`; retire hard-coded NPIs/tax ID | §7 | – | – | read billing entity | – | modify | – | S |

### 3.9 Insurance page — `/insurance` (**new entity page**) — sidebar REVENUE & INSIGHTS › Insurance

Pattern: copy the Claims/Invoices page structure (list + stage bar + detail drawer with registry sections + kanban toggle). Replaces the verification worklist, prior-auth list, enrollment queue and benefits queue.

- **Layout:** `PageTopBar` with stage-group presets (Insurance fixes, Benefits to verify, Enrollment, Prior auth, Verified, All) + search + payer/provider/date filters; table (rows are *insurance records, one per appointment*); Kanban toggle; right drawer.
- **Columns (spec §7 Eligibility check/Coverage/Authorization):** Patient, Appointment date, Payer + plan, Member ID, **Stage** (`SegmentedStageBar`), reason/`resolverMessage`, source (clearinghouse/voice/manual), attempt #, copay / deductible remaining / coinsurance / OOP remaining, auth #, units used/approved, auth valid to, last checked, owner.
- **Drawer:** ribbon, sections Coverage / Eligibility result / Resolver / Authorization / Call (registry `insurance` module), **Benefit lines table**, raw payload viewer, ActivityTab.
- **Actions → flows/automations:** Re-run (F2, A1/A13), Fix coverage (opens client Insurance tab, A3), Start voice call (F3, A7), Accept/Edit pending review (F3.4), Mark self-pay, Request auth / record decision (P2), Renew (A11). Stage moves go through `insuranceService`.
- **Built from:** `Claims.tsx`/`Invoices.tsx` patterns + `Appointments.tsx` preset generator; `PipelineBoard` (shared). **Effort: L.**

### 3.10 RCM Home — `/revenue-cycle` (**new, light**) — sidebar REVENUE & INSIGHTS (top)

- **Layout:** header with **"Run daily jobs now"** (spec §6 note); tiles = the 8 queues, each = *count of records in that stage group + money at stake*, clicking opens the entity page with that preset; KPI cards (clean-claim rate, first-pass acceptance, denial rate, days in A/R, net collection) computed from claim/invoice stage + fields; "tomorrow's visits needing action" strip (insurance records in exception stages).
- **Fields:** counts by `systemCategory` per entity; money from claim `expected/billed` and invoice balance.
- **Actions:** open queue; run jobs (A2, A9, A11, A12, A15, A18, A19, A21, A26, A28, A29, A30).
- **Built from:** new page (cards from `Overview.tsx` styling). **Alternative (Q5):** put this row on Overview and skip the page. **Effort: M.**

### 3.11 Where the other spec screens live (no new page)

| Spec screen (§2) | Lives on | As |
|---|---|---|
| Eligibility worklist | Insurance page | presets *Insurance fixes / Benefits to verify* |
| Prior auth list | Insurance page | preset *Prior auth* (stages 7-10, 12) |
| Charges to review | Claims | preset *Charges to review* (Awaiting note, Coding review, Hold) + Codes panel in Scribe |
| Claims | Claims | all stages |
| Rejections worklist | Claims | preset *Claim fixes* (Scrub failed, Rejected) |
| Denials board | Claims | Kanban filtered to Denied → Appeal submitted, grouped by category field |
| Payment posting | Claims | "Post payments" modal + Payments section in drawer; *Partially paid* preset |
| A/R follow-up | Claims | preset *A/R by aging* (computed: Submitted/Accepted/Pending older than N days) |
| Patient balances | Invoices | preset *Patient balances* + balance stages |
| RCM reports | Reports | new data sources (§3.17) |
| RCM Home | **new page** | §3.10 |

### 3.12 Process / Workflows — `/process` — `Process.tsx` (stage definitions live here)

Facts: entity tabs `ENTITY_TABS` (L1113-1119 — claim is not a tab; insurance labelled "Insurance & Claims"); add stage `handleAddStage` (L3317-3416; custom stages get **no `systemCategory`** and "success" stages get `isFinalStage:false`); stage "Automations" tab lists rules (L4576).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Separate **Claims** tab; Insurance tab = "Insurance" | G2/G3 | Add `claim` tab, rename | `ENTITY_TABS` L1113-1119; map "claim" nav target (L1105) | `useProcessStore` | – | modify | existing tab pattern | S |
| Seed RCM stage sets and `systemCategory`s; fix required lists; stop the insurance default overwrite | §3.0.4, G3/G8 | – | `useProcessStore.ts` L390-818, L1346-1364, L381-388 | process defaults | – | modify | existing seeding | M |
| Enforce singleton for insurance/claim/invoice (hide Add/Delete) | G1 | Hide buttons; store guard | `Process.tsx` L3649-3660, L2926-2955; `saveStoredProcesses` | – | – | modify | – | S |
| Custom stages get a category choice (so services know what it means) | G8 | Select "behaves like: …" in Add Stage | `handleAddStage` | `Stage.systemCategory` | – | modify | existing form | M |
| Stage group config for presets (e.g. *Claim fixes*) | §8 | "Queue group" chips on stage editor | stage General tab | `Stage.queueGroup` | – | new | – | S |

### 3.13 Global Automation — `/automation` — `Automation.tsx` (table + `AddAutomationDrawer`), `useAutomationStore.ts`, `ruleEngine.ts`

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Event catalog additions (the ~26 events, main prefixes) | §6 | Entries in `EVENT_CATALOG` (L189-234) **and** `GLOBAL_TRIGGER_CATALOG` (`types/automation.ts` L93-150 — different list) | stores | – | all | modify | – | M |
| Default RCM rules (A-table §3.0.5): M rules and E entry-action rules seeded like `rule-inv-paid-auto` | §6 | Rows in the rules table | `useAutomationStore` defaults | `AutomationRule` | A1-A30 | new | existing default-rule seeding | L |
| New actions in Records category: `create_insurance_check`, `run_eligibility`, `create_claim`, `scrub_claim`, `submit_claim`, `check_claim_status`, `post_remittance`, `update_invoice_from_claim`, `draft_appeal`, `start_call`, `send_message` | G7 | Catalog entries + params | `StepCatalogDrawer`, `AddAutomationDrawer`, `STEP_ALLOWED_TRIGGERS` (×3), `StepParametersFields`, `ruleEngine.ts` (before L998) | – | – | new | `generate_invoice` implementation as template | L |
| Fix `ruleEngine.ts` L404 (non-appointment/invoice moved as client) → dispatch insurance/claim movers; entity validation for step-level `update_to_stage` | G6 | – | `ruleEngine.ts` L360-418, L467-605 | – | – | modify | `validateRuleEntityTarget` | M |
| Health + Retry for failed actions | R7 | Retry button, health badge | rules table | `AutomationRule.health` | – | new | – | M |
| Generalize Undo | G10 | – | `undoStageMove` L596-647 | – | – | modify | `StageMovementTimelineModal` | M |

### 3.14 Tasks — `/tasks` — `Tasks.tsx`, `TaskDetailPage.tsx`, `tasksStore.ts`, `types/task.ts`

With queues = stage groups (R8), Tasks are only for ad-hoc human to-dos. Facts: table only; no entity link; priority = `isImportant`; `task.*` events never emitted; `TaskQuickCreateDrawer` (3063 lines) is mid-edit — **edit last**.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| `entityRef`, `priority`, `dueAt`, `payerId`, `amountAtStake`, `source`, `taskType` | §7 Task | – | `types/task.ts`, `migrateTaskEntity` (L675) | `TaskEntity` | emit `task.created/overdue` | modify | – | M |
| Linked-record card + open the record at the right stage | §8 | Card between description and metadata | `TaskDetailPage.tsx` L327→L334 | `entityRef` → route (`/claims?open=`, `/insurance?open=`, `/invoices?open=`) | – | new | – | M |
| Optional `create_task` rule action (only where a custom instruction helps) | §6 | action | `ruleEngine.ts` | `tasksStore.createTask` | – | new (optional) | – | S |

### 3.15 Chats / templates — `/chats` — `Chats.tsx`, `useWhatsappTemplates.ts`, `templateLibrary.ts`

Facts: variable `<select>` is **hard-coded** (L3350-3373); library uses camelCase keys while editor emits dotted keys; **no send-time resolver found (NC)**; delivery is simulated; `whatsapp/sms/email` steps don't execute (ruleEngine).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| 4 templates (estimate, statement, payment link, missing-insurance request) | §2 | `LIBRARY_TEMPLATES` entries | `templateLibrary.ts` L19+ | `useWhatsappTemplates` | A5, A9, A27, A28 | new | `TemplateLibraryDrawer` | S |
| Variables `billing.copay/estimate/balance/payment_link`, `insurance.payer/form_link` | §2 | new `<optgroup>`s (extract to a shared constant used by editor + `VariablePickerButton`) | `Chats.tsx` L3350-3373 | `resolveTemplateVars(record)` (new) | – | modify | – | M |
| Mock-dispatch `send_message` (writes conversation message + activity) | §6 | action executor | `ruleEngine.ts` | `useConversations` | A5, A9, A27, A28 | new | – | M |

### 3.16 AI Receptionist / voice — `Process.tsx` stage call settings, `CallTriggerDrawer.tsx`, `ReceptionSettingsTab`, `CallLogs.tsx`

Facts: `MyAIReceptionist.tsx` is orphaned; `/settings/reception` = kiosk config; voice calling is configured **per stage** (`CallTriggerSettings`, `useProcessStore.ts:27-66`); no voice runtime.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Payer benefits call (fallback)** configured on the insurance stage *Inconclusive* | F3, A7 | `callPurpose` + script (fixed benefit questions, payer hours, NPI/patient fields, record rep + reference #) | top of `CallTriggerDrawer` for that stage | `CallTriggerSettings.callPurpose/script` | `start_call` (E on *Inconclusive*) | modify | calling hours/retries/voicemail settings | M |
| **Patient balance reminder** on invoice stage *Reminder 2* (consent gate) | F9.3, A29 | same selector | `CallTriggerDrawer` | `Client.consents.voice` | `start_call` | modify | same | S |
| UI-only call result → *Pending review* | F3.4 | mock call generator + recording/transcript link | Call Logs/Details (`CallLog` L27-43; "Call Relationship" block L242) | `CallLog.entityRef`, `purpose` | `insurance.pending_review` | new | `CallDetails` | M |
| Kiosk toggle "Collect insurance & copay at check-in" | F4 | toggle | `ReceptionSettingsTab` Section 2 (L63-68) | `ReceptionConfig` | – | modify | – | S |

### 3.17 Settings (Billing setup), Integrations, Notifications, Reports, Permissions

| Screen / feature | Spec ref | UI element | Placement | Data / store | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|
| **Billing setup** tab: billing entity, locations + POS, payers + enrollment, fee schedules, claim defaults, scrub rules, clearinghouse link | §2, §7 | New `components/settings/BillingSetupTab.tsx` (own file); **do not reuse "Billing"** (= SaaS billing; `isBilling` route match L735-770) | `tabs` array (L3850 ✔), routing effect (L735-837), titles (L4084-4140), render near L8098, SETTINGS sidebar item; **guard**: `SettingsGuard` is SystemAdmin-only (Q6) | new reference stores (payer, enrollment, fee schedule, billing entity, location) | new | `NotificationsSettingsTab`/`ReceptionSettingsTab` pattern; `OrganizationLocationsSection` | L |
| Provider credentials (NPI, taxonomy, license, flags) | §7 | "Provider credentials" tab in `ManageTeamMember` (tabs L84) + `TeamMemberDrawer` fields | – | `teamStore.TeamMember` | modify | – | M |
| **Integrations** clearinghouse card (eligibility, claims, ERA; mock adapter with scenario picker) | §2, §1 | New category + `rcm.eligibility/claims/era/claim_status` capabilities | `integrationsRegistry.ts` L7, L74-178 **and** Settings' local `Integration` union (L368, L3144, L3226, L7769-7830); `IntegrationConfigDrawer.tsx:261` maps `rcm`→`invoice` workflow (fix) | `IntegrationSyncConfig`, sync logs | modify | Phorest entry pattern | M |
| **Notifications** for rejection, denial, auth expiry, unmatched ERA, deadline near | §2 | per-event toggles under Billings | `NotificationsSettingsTab`, `notificationSettingsStore` (`ROLE_NOTIFICATION_MODULES` L12-26 are module-level only) | `eventSettings` map; `addNotification({type:"billing", link, meta:{claimId…}})` | modify | existing store | M |
| **Reports** sources `claims`, `denials` (claim stage + denial fields), `payments`, `ar_aging`, `insurance` | §2 | new data sources | `ReportDataSource` (`invoiceTypes.ts`), `reportEngine.ts` L11 (`Record<>` forces metadata), `InvoiceContext.getReportRows` L915, `CustomReportBuilderModal.tsx` L225-249/L532-534, `Reports.tsx` L158-168 | – | modify | existing builder | M |
| **Roles/permissions**: add `billing` module and capability matrix | §8 | permission keys | `types/permissions.ts` (`ItemPermissions` flat 10 modules), `settings-constants.ts`, `RolesPermissionsDrawer.tsx` L39-51 (already lists `billings` — align id); role strings Provider/Coder/Biller added (Role is `string`) | `src/lib/rcmPermissions.ts` (static spec matrix) | modify | `canDoAction` typed by key | M |
| **Audit**: log view/edit of coverage, claim, payment | §8 | new modules `Billing`/`PHI Access` | `auditLogsStore.ts` (admin modules only; mutable localStorage) | – | modify | `recordAuditLog` | S |
| Patient portal `/patient/bill`, `/pay` | F9, A27 | show claim-adjusted balance + plan; target for `{{billing.payment_link}}`; coverage form for A5 (**no page specified in spec**) | `PatientBillScreen`, `PatientPaymentScreen`, `/patient/profile` | invoice + coverage | modify | existing screens | M |
| **Sidebar** | §2 | Add Insurance, rename "Insurance & Claims"→"Claims", add RCM Home | `DEFAULT_SIDEBAR_CONFIG` (v9→v10 + migration injection), `sidebarTemplateStore.ts` template, `ConfigureMenuModal.tsx` `ICON_MAP` (L75 ✔); live model has **no roles and no children** | – | modify | – | M |

---

## 4. Cross-checks

### 4.1 Feature coverage (spec item → where a user sees/triggers it)

**Flows**

| Flow | Pages |
|---|---|
| F1 Booking with insurance | Schedule drawer §3.1; patient portal booking (NC, no coverage UI); AI receptionist (voice, UI-only) |
| F2 Eligibility + resolver | Schedule drawer; Appointments chip; detail drawer Coverage tab; **Insurance page**; mock adapter in Integrations |
| F3 Voice payer call | `CallTriggerDrawer` on *Inconclusive*; Call Logs; Insurance page (*Pending review*) |
| F4 Check-in & collection | Detail drawer (desk); kiosk; `RecordPaymentModal` |
| F5 Visit → claim | AI Scribe Codes panel; Claims (*Awaiting note → Draft*) |
| F6 Scrub & submit | Claims (stages + drawer Scrub section); Billing setup › Scrub rules |
| F7 Remittance & posting | Claims "Post payments" + drawer Payments; Invoices |
| F8 Denials | Claims (denial stages + Kanban + drawer Denial section) |
| F9 Patient balance | Invoices (balance stages), client Billing tab, patient portal, Chats templates |

**Pipelines:** P1+P2 → Insurance page; P3+P4+P5 → Claims; P6 → Invoices; all editable in `/process`.

**Roles (spec §8 matrix)** — enforced by `rcmPermissions.ts` at: coverage edit/run eligibility (Insurance page, client Insurance tab, schedule drawer) · accept voice benefits (*Pending review* accept) · accept codes (Scribe Codes panel; Provider own visits) · create/edit/submit claims (Claims actions) · post payments (Post payments modal) · work denials/appeals (denial stages, Kanban) · write off (*Written off* stage move; Biller up to limit, Manager) · collect payments/plans (drawer/kiosk/Invoices) · billing setup (Settings tab) · RCM reports (Reports, RCM Home).

**Work queues:** §3.0.7. **Automations:** §3.0.5.

**Spec items with no page/record:** ERA (remittance) as a record — handled as a claim child table + modal (Q4); payer enrollment records (Billing setup › Payers, no queue page); A5 patient insurance form page; A10–A12 slice; P6 "Estimate shown" as a distinct stage (modeled as invoice *Draft* = estimate).
**RCM UI on main the spec doesn't ask for:** `CreateClaimDrawer` (dead), CMS-1500/ClaimSubmission/ClaimStatus modals (keep; useful), hard-coded claim seeds.

### 4.2 Data coverage — spec §7 entities → store/location

| Entity | Where it lives | Pages |
|---|---|---|
| Client additions | `clientsStore.ts` typed fields (+registry) | Clients, Profile, kiosk |
| Team member / Organization / Location | `teamStore.ts`; new `billingEntityStore`, `locationStore` | Settings, ManageTeamMember |
| Appointment additions | `appointmentService.ts` | Appointments, drawers |
| Service additions | `servicesStore.ts` (`cptCodes[]`, `authRequiredDefault`) | Services, Schedule drawer |
| Invoice additions | `invoiceTypes.ts` / `invoiceService.ts` | Invoices, portal |
| Task additions | `types/task.ts`, `tasksStore.ts` | Tasks |
| Payer, Payer enrollment, Fee schedule | **new reference stores** | Billing setup, Schedule drawer, claim drawer |
| Coverage | client Coverages table (field on `client`) | Insurance tab, Schedule drawer |
| Eligibility check + Authorization | **new `insuranceStore`** (one record per appointment; stage-bearing) | Insurance page, chips, drawers |
| Benefit line | child table on insurance record | Insurance drawer |
| Encounter / dx / procedure | claim fields + child tables (no encounter entity) | Claims, Scribe |
| Claim / line / event | `claimsStore` (extend properties, G12); events = activity + stage log | Claims |
| Remittance + adjustment | claim child table + ERA staging store | Claims |
| Denial | claim fields (stage = status) | Claims |
| Payment plan | invoice child table | Invoices |

### 4.3 Conflicts and recommended resolutions

| # | Conflict | Evidence | Recommendation |
|---|---|---|---|
| C-1 | Insurance defaults are **claim-shaped** (Draft & Intake…Submitted (837P)…Denied) and force-overwritten at load | `useProcessStore.ts` L769-776 ✔, L1346-1364 | Replace with §3.0.4 insurance set; change the overwrite to "seed if empty"; migrate legacy claims to the claim process |
| C-2 | Claim process deleted at load; claims use insurance stage ids; `clm-*` vs `ins-*` inconsistent | L1340-1343; `entityMigration.ts` L120; `Claims.tsx` L64-94 | Persist claim process; one-time remap |
| C-3 | Spec has 6 pipelines/entities; main has 5 entity types | spec §4 vs `EntityType` L92 ✔ | Fold (§3.0.3). If 18 claim stages is too many, add `encounter`/`denial` entity types later (same pattern) — Q1 |
| C-4 | `Denied` is **final/lost** today; denial workflow continues past it | L796 ✔ | Make Denied in-progress; Written off is the lost end |
| C-5 | `REQUIRED_SYSTEM_CATEGORIES` out of sync; name-based protection also hits custom stages; custom stages lack `systemCategory` | L381-388 ✔; `isPredefinedStage` | Fix lists; require a category when adding a stage |
| C-6 | Two claim movers with different substring maps, no events; `moveClaimToStage` maps "in_review" to "Ready to Submit" | `claimsStore.ts` L467; `Claims.tsx` L135-161 | One `claimService`; map by `systemCategory` |
| C-7 | `ruleEngine.ts` L404 moves any non-appointment/invoice record as a **client** | explorer §4 | Dispatch by recordType |
| C-8 | Double `stage.entered` (service + `logStageMove`) | `appointmentService.ts` L1222-1243; `invoiceService.ts` L987-1007 | Emit once (inside `logStageMove`); needed before entry actions to avoid duplicate sends/claims |
| C-9 | Check-in events may double-fire | `mockMaClient.ts` ~L1368-1385 vs `checkInAppointment` | Single owner before A13 |
| C-10 | `delay`/wait ignored; no scheduler | `ruleEngine.ts` | `rcmJobs.runDaily()` + "Run daily jobs now" (spec §6) |
| C-11 | Required-at-stage only for client processes | `processFieldValidation.ts` L58-66 | Generalize (G9) |
| C-12 | Drawer field values not on records | `ClaimDetailDrawer.tsx` L347-395 | Put RCM fields on the record |
| C-13 | Event names: spec `eligibility.*/encounter.*/auth.*` vs main `insurance.*/claim.*` | `EVENT_CATALOG`; spec §6 | Use main prefixes; map table in §3.0.5 |
| C-14 | Spec statuses vs stages: P1 stages "Not checked/Checking/Self-pay" have no status value; spec lists eligibility status = active, inactive, needs fix, provider issue, inconclusive, pending review | spec §4 P1 vs §7 | **Stage = status** (R1); stage list in §3.0.4 supersedes the spec's separate status enum; keep a computed read-only `statusLabel` for reports |
| C-15 | Spec "invoice after adjudication" vs main creating an invoice at booking (`createInvoiceFromAppointment`) | `invoiceService.ts` | Insured visit: invoice stays Draft (estimate) until claim adjudicates (A27 entry action updates it) |
| C-16 | Spec wants a pillar with grouped, role-filtered nav; live sidebar has no roles/children; `navigation.ts` dead | `SidebarMenuContext.tsx`; `Sidebar.tsx` | Flat items (Insurance, Claims, RCM Home); role gating by route guard + `rcmPermissions` (Q7) |
| C-17 | Roles: spec Front desk/Provider/Coder/Biller/Practice manager/Admin vs code `Reception/Manager/Admin/SystemAdmin/Agent`; `AuthContext` lets anyone switch role; `canDoAction` unenforced; `/settings/*` SystemAdmin-only | `navigation.ts:32`, `AuthContext.tsx`, `SettingsGuard.tsx` | Map Reception→Front desk, Manager→Practice manager; add Provider/Coder/Biller strings; capability hook; per-tab settings guard (Q6) |
| C-18 | Progress report overstates Phase 1/2/3 and stage lists are stale | §3.0.2 G13 | Trust code; correct report after Slice 1 |
| C-19 | Spec "Entity" vs PRD "exactly one process per entity": code lets users create more | G1 | Enforce for RCM entities |
| C-20 | Spec daily jobs/time triggers vs no scheduler | A2, A9, A11-12, A15, A18-19, A21, A26, A28-30 | Job button; honor `delay` when a backend exists |

### 4.4 Navigation — final sidebar (live model) and role visibility

Roles: **FD** Front desk (Reception) · **PR** Provider · **CD** Coder · **BL** Biller · **PM** Practice manager (Manager) · **AD** Admin. The live sidebar has no role filter — visibility below is enforced by a route guard + `rcmPermissions.ts` (Q7).

```
Overview                                   all
WORKSPACE
  Contact                                  FD● PR○ CD○ BL● PM● AD●   (Insurance + Billing tabs: FD● BL● PM● AD●)
  Call Logs                                FD● BL● PM● AD●
  Chats                                    FD● BL○ PM● AD●
  Process (Deals, client pipelines)        FD○ BL● PM● AD●
  Tasks                                    all
  Appointments                             FD● PR● CD○ BL○ PM● AD●   (Coverage chip/tab per capability)
  AI Scribe                                PR●(own) CD● BL○ AD●      (Codes panel; Sign)
REVENUE & INSIGHTS
  Revenue Cycle (RCM Home)  [new]          BL● PM● AD●
  Insurance                 [new]          FD● PR○ CD○ BL● PM● AD●
  Claims                    [renamed from "Insurance & Claims"]   PR— CD●(codes) BL● PM○ AD●
  Invoice                                  FD● BL● PM● AD●
  Product & Services                       FD○ BL● PM● AD●
  Reports                                  PR(own)● BL● PM● AD●
CUSTOMIZATIONS
  Workflows (stage sets) / Automation (rules) / Knowledge Base / Webforms   PM● AD●
SETTINGS
  Billing setup [new]                      PM● AD● BL○   ← needs per-tab guard (Settings is SystemAdmin-only)
  Organization, Team, Integrations (clearinghouse card), Audit Logs, AI*, Sections/Fields   AD● (PM○ where noted)
  Billing (SaaS plans/credits)             AD●
  Notifications                            all (own prefs)
```

---

## 5. Build plan by slice

Spec slices 1–5, rebased on entity pipelines. Estimates are front-end engineer-weeks, **inference**: spec says 3–4 / 3–4 / 4–5 / 4–5 / 2–3 (16–21); I estimate **5–6 / 4–5 / 5–6 / 4–5 / 2–3 = 20–25** because Slice 1 absorbs the engine gaps G1–G12 that the PRD assumed finished.

### Slice 1 — Foundation, data and setup (start here) — **5–6 wks**

- **Pages touched:** Process (§3.12), Automation (§3.13), Settings › Billing setup (§3.17), Client profile Insurance tab + demographics (§3.5), ManageTeamMember (NPI), Tasks fields (§3.14), Integrations card, sidebar. **Created:** none visible except Billing setup tab and the (empty) Insurance/RCM Home routes.
- **Stores/types:** new `src/lib/insuranceStore.ts`, `insuranceService.ts`, `claimService.ts`, `rcmJobs.ts`, `rcmPermissions.ts`, reference stores (`payerStore`, `payerEnrollmentStore`, `feeScheduleStore`, `billingEntityStore`, `locationStore`, `claimDefaultsStore`); changed `useProcessStore.ts` (stage sets, required categories, singleton, overwrite rule), `claimsStore.ts` (properties on record), `clientsStore.ts`/`canonicalClients.ts`, `teamStore.ts`, `types/task.ts`+`tasksStore.ts`, `FieldRegistryContext.tsx` (insurance module + claim/invoice/appointment fields), `processFieldValidation.ts` (generalize), `useAutomationStore.ts` (events, undo), `ruleEngine.ts` (L404 fix, movers), `integrationsRegistry.ts`.
- **Events/actions/automations:** register all events; register actions (stubs OK); seed default rules for A-table (disabled until their slice); fix double-emits. No A# live yet.
- **Mock data (spec §9):** 15 payers; 3 providers with NPIs; 1 billing entity; 2 locations (POS 11); 40 patients with typed demographics and coverages (derive from `canonicalClients` where `contactType === "Client"`); a default + one payer fee schedule; payer auth rules for 2 services.
- **Ordered tasks:**
  1. Fix `useProcessStore` (G1-G3, G8): claim process persisted; insurance stage set; required lists; remove insurance overwrite; singleton guards; add `claim` tab in `Process.tsx`.
  2. One-time migration: legacy claims → claim process; legacy `ins-*` ids; update `entityMigration.ts`.
  3. Emit `stage.entered` exactly once (C-8); fix check-in double-emit (C-9).
  4. `claimService` + `insuranceService` (one-door moves, events, required-at-stage via generalized validator, Undo by `systemCategory`).
  5. Move claim/insurance field values onto records (G12); add registry `insurance` module and the new claim/invoice/appointment sections.
  6. Reference stores + `BillingSetupTab` (+ per-tab guard) + provider credentials.
  7. Client typed fields + **Insurance tab** (coverages table) + Billing tab shell.
  8. Task fields + `entityRef` link card (edit `TaskQuickCreateDrawer` last).
  9. Sidebar: Insurance, Claims rename, RCM Home (v10 migration), `ICON_MAP`.
  10. `rcmPermissions` + `billing` module + audit modules.
- **Demo script:** Settings › Billing setup → enter EIN/NPI/POS once → Process › Insurance shows the verification stages, Process › Claims shows the claim stages (Denied now continues to Correct & resubmit / Appeal drafted…) → open a patient › Insurance tab → add primary + secondary coverage → create a claim manually and drag it through stages: required fields block *Denied* without reason codes; Stage History shows the moves with Undo working for claims.
- **Effort:** 5–6 wks.

### Slice 2 — Eligibility on the Insurance pipeline — **4–5 wks**

- **Pages touched:** Schedule drawer (§3.1), Appointments list/calendar (§3.2), detail drawer Coverage tab (§3.3), check-in desk (§3.4), Chats templates (§3.15), Notifications. **Created:** Insurance page (§3.9).
- **Stores/types:** mock clearinghouse adapter `src/lib/rcm/mockClearinghouse.ts` (scenario registry with **AAA-style reason codes**; no vendor names; none exist in main today), `eligibilityResolver.ts` (code → category → action table, pure + vitest), `benefitNormalizer.ts`, `resolveTemplateVars.ts`.
- **Events/actions/automations:** `insurance.*` events; actions `create_insurance_check`, `run_eligibility`, `send_message` (mock dispatch); **A1–A9, A10, A13** live (A2/A9 via job button). Move rules per status (A4–A8); E on *Inactive/Inconclusive/Verified*.
- **Mock data:** one scenario per seeded payer — active, inactive, member-not-found, DOB mismatch, provider not enrolled, payer down, inconclusive (+ "other plan" redirect for F2.7).
- **Ordered tasks:** adapter+resolver tests → insurance record creation on Booked → move rules + queue presets → Appointments column/calendar chip → detail drawer Coverage tab → Schedule drawer section + auth warning (A10) → Insurance page (list/drawer/Kanban via `PipelineBoard` extraction) → job button A2/A9 → templates + resolver of variables → front-desk Check-in button and A13 → kiosk insurance/copay steps (can slip to Slice 5).
- **Demo script:** Book an appointment for a "member not found" payer → resolver retries variants → record lands in *Needs fix* → chip amber on Appointments → fix coverage on the client Insurance tab → record auto re-checks → *Verified* (green) → detail drawer shows copay/deductible/estimate → run daily jobs (skips fresh checks) → switch scenario to inactive → red chip + message logged in Chats.
- **Effort:** 4–5 wks.

### Slice 3 — Visit to claim — **5–6 wks**

- **Pages touched:** AI Scribe (§3.6), Appointments Completed action, Invoices (claim link/columns §3.7), client Billing tab, Settings (fee schedule, scrub rules, claim defaults), Services (multi-CPT). **Reworked:** Claims (§3.8).
- **Stores/types:** `claimBuilder`, `scrubber` (10–15 rules), `mockClaimSubmission` (999/277CA scenarios), `cptCodes.ts` (ophthalmology), scribe sign/lock fields, claim child tables.
- **Events/actions/automations:** `claim.created/note_signed/coded/scrub_failed/submitted/rejected/accepted`; actions `create_claim`, `scrub_claim`, `submit_claim`; **A14–A20**; E on Completed, Draft.
- **Mock data:** ophthalmology codes (92004, 92014, 92083, 76519, 66984 with RT/LT), fee schedule, scrub rules, one 277CA rejection.
- **Ordered tasks:** `create_claim` idempotent per appointment → Claims page stage presets + stage groups → Scribe sign/lock + Codes panel (fix J06.9) → claim child tables in drawer → builder pulls billing entity/NPI/POS from records → scrubber → submit mock + rejection path → required-at-stage rules → Invoices claim link + columns → A15/A18/A19 jobs.
- **Demo script:** complete an eye-exam appointment → claim appears in *Awaiting note* → open the scribe note, accept codes (RT/LT), **Sign and send to billing** → claim *Coding review → Draft* → scrubber flags a missing modifier → *Scrub failed* (preset "Claim fixes") → fix → *Ready to submit* → run daily jobs → *Submitted* → mock 277CA rejects one → *Rejected* → fix and resubmit; timeline shows each event.
- **Effort:** 5–6 wks.

### Slice 4 — Money back (posting, denials, patient balance) — **4–5 wks**

- **Pages touched:** Claims (Post payments modal, denial stages/Kanban, Appeal draft), Invoices (balance stages, statement, plan), patient portal Bill/Pay, Chats templates, Call Logs, Notifications.
- **Stores/types:** ERA staging store + generator (10 mock ERAs), CARC/RARC→category table, `appealDrafter` (canned AI-propose; the Anthropic SDK is a dependency but unused today), payment-plan child table.
- **Events/actions/automations:** `era.received/unmatched`, `claim.paid/partially_paid/denied`, `invoice.reminder_due/overdue`; actions `post_remittance`, `update_invoice_from_claim`, `draft_appeal`, `check_claim_status`, `start_call`; **A21–A30**.
- **Mock data:** 10 ERAs — paid, partial, denied (CO-97, CO-16, PR-1, CO-50), unmatched.
- **Ordered tasks:** remittance model → matcher + auto-post (A22) → unmatched modal (A23) → underpayment (A24) → denial stages: categorize + deadline (A25) + Kanban → `draft_appeal` → A27 invoice update/statement → reminders (A28/A29) → Overdue job (A30) → portal balance/plan.
- **Demo script:** "Receive ERA" → payments post, one line denies (CO-97) → claim enters *Denied* (category + deadline set) → triage to *Appeal drafted* (AI draft) → *Appeal submitted* → another claim paid → invoice moves to *Sent* with payment link (logged in Chats) → patient portal shows balance → advance clock: *Reminder 1/2* → payment plan.
- **Effort:** 4–5 wks.

### Slice 5 — Home, prior auth, reports, voice UI — **2–3 wks**

- **Pages touched:** Insurance page (auth stages), Overview, Reports, Call Logs, `CallTriggerDrawer`, kiosk (if deferred). **Created:** RCM Home (§3.10).
- **Automations:** **A11, A12** (assigned here), voice `start_call` UI-only.
- **Ordered tasks:** KPI selectors → RCM Home tiles + job button → auth stages/fields polish → report sources → Overview KPI row → `callPurpose` selector and mock call result → kiosk steps → "Mock data" banner + audit entries.
- **Demo script:** manager's morning view on RCM Home → click *Prior auth* tile → expiring auth → renew → run jobs → Reports (denial rate by payer) → Insurance page *Pending review* from a mock voice call → accept.
- **Effort:** 2–3 wks.

**Total 20–25 wks.** Slices 1–2 (≈9–11 wks) validate the core experience.

---

## 6. Open questions

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | Is an **18-stage claim pipeline** acceptable, or should Charge capture and Denial be their own entity processes? | (a) one pipeline, optional stages deletable; (b) add `encounter`/`denial` entity types (same pattern, more pages) | **(a)** for the prototype — matches your "denial via stages"; revisit if clinics find the bar too long |
| Q2 | Prior auth as stages on the insurance record vs a separate Authorization entity | (a) fold (recommended); (b) separate singleton entity `authorization` | **(a)**; (b) only if auth must track per-service units independently of a visit |
| Q3 | Work queues = stage groups; keep Tasks only for ad-hoc to-dos? (spec says each queue is a saved view of Tasks and A4/A6/A8/A17/A20/A23/A24/A30 create tasks) | (a) stage is the queue, no auto tasks; (b) also auto-create a task per exception | **(a)**; optional `create_task` rule action where a custom instruction helps |
| Q4 | ERA/remittance has no entity pipeline — where does it live? | (a) claim child table + "Post payments / Unmatched payments" modal; (b) its own entity | **(a)** |
| Q5 | RCM Home: new page, or a row on Overview? | new page / Overview row | New light page (queue tiles + Run daily jobs); fall back to Overview row |
| Q6 | Who can open **Billing setup**? (`SettingsGuard` is SystemAdmin-only; spec gives Practice manager Yes) | per-tab guard in Settings / host under `/revenue-cycle/setup` / SystemAdmin only | Per-tab guard keyed to `rcmPermissions` |
| Q7 | Sidebar role gating: live sidebar has none | route guard + capability hook (recommended) / extend `NavItemConfig` with roles + children (L) | Route guard + hook now |
| Q8 | Insurance entity page: new `/insurance` page vs a mode on Claims | new page (recommended) / toggle on Claims | New page — follows "each entity has its own page" |
| Q9 | Invoice for insured visits: keep invoice-at-booking as **estimate/Draft** until the claim adjudicates? | as spec / keep today's flow | Estimate until adjudication (A27 updates it) |
| Q10 | Should stage-entry actions be defined on `Stage.workflowSteps` (as the PRD says) or as default `AutomationRule`s (how the engine actually works)? | rules (recommended) / build a `workflowSteps` executor | **Rules** — smallest change; consider the executor later |
| Q11 | Honor `delay` now (needs a persisted queue) or use the daily-jobs button? | job button (spec §6) / queue | Job button |
| Q12 | A5 patient "update your insurance" link — which page? | `/patient/profile` coverage editor / a webform | `/patient/profile` |
| Q13 | `Appointment.clientId` backfill: unmatched appointments | block and flag / silent default | Block and flag |
| Q14 | Per-line denial detail (spec: one denial per claim **or line**) with claim-level stages | line-level fields only (recommended) / split claims | Line fields on the Lines table |
| Q15 | Correct the stale `IMPLEMENTATION_PROGRESS_REPORT.md`? | now / after Slice 1 | After Slice 1 |
| Q16 | Spec file naming/tracking (`rcm-flow-spec.md.md`, untracked) and the missing `rcm-research.md` | rename + commit / leave | Rename and commit |

---

*What I did not verify:* anything at runtime (nothing was built or run); the Phase-5 intent beyond the PRD text; which invoice stages are actually stored (defaults show Draft/Payment recorded/Paid/Overdue while services/Kanban also handle Sent/Viewed/Partially paid/Void); `createAppointment` automation gating (L637-647); whether any send-time resolver exists for template variables.

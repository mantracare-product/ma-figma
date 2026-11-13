# RCM Page-by-Page Mapping — Revision 3

> Planning document only; no application code was changed. Previous version kept as `docs/rcm-page-mapping.rev2.md`. Inputs: `docs/rcm-flow-spec.md.md` (misnamed, untracked; spec sections: §2 Where RCM lives, §3 flow, §4 Pipelines P1–P6, §5 Flows F1–F9, §6 Automations A1–A30, §7 Fields, §8 Queues/roles, §9 Slices), the Entity Workflows PRD, `IMPLEMENTATION_PROGRESS_REPORT.md`, and the `main` working tree (uncommitted edits to task files, `useProcessStore.ts`, `Process.tsx`). Only `main`'s pages, UI and entity-wise workflow structure are used.
> **Verification:** I read the PRD, progress report and `useProcessStore.ts` (types L85-204, required categories L381-388, defaults L725-818) directly (✔). The five verification questions (§3.0.0) and all other anchors come from explorer reads of the working tree; nothing was built or run. Line numbers are approximate — re-confirm before editing. **NC** = needs confirmation.

## What Revision 3 changes (product-owner decisions)

| # | Decision | Effect on the plan |
|---|---|---|
| D1 | Multiple workflows per entity are allowed. Claim entity (`/claims`, "Insurance & Claims") has 3 default workflows: **Charge capture, Claim, Denial & appeal**. A claim moves between them with `move_to_workflow` (same record) | Old G1 (enforce singleton) removed. New work: persist several claim workflows, `Claim.processId`, per-process required categories, `move_to_workflow` |
| D2 | **Eligibility + prior auth = stages of a CLIENT process.** Result fields, resolver message and a check-history child table live on the client's process record. **No Insurance entity, no Insurance page, no per-appointment insurance record.** Client Insurance tab keeps coverages. Appointment chip = latest result written by `run_eligibility` | Rev 2's Insurance page, `insuranceStore` and `insuranceService` are deleted. Eligibility board = existing **Deals** board for that client process |
| D3 | **Work queues = saved views of Tasks** (as in the spec). Tasks are created by `create_task` stage-entry actions, linked via `entityRef`, and **auto-close when the record leaves the stage** they were created for. Each entity covers only its own journey | Reverses Rev 2's "stage groups, no tasks" |
| D4 | **Nothing hard-coded.** Actions are generic and configurable. Stage sets and A1–A30 are **editable starter templates**, seeded as rules, not enforced flows. Claim-creation timing is the clinic's automation | Stage sets become templates; actions get parameter specs (§3.0.5) |

---

## 1. Summary

1. **Structure:** eligibility + prior auth run as a **client process** (visible on the existing Deals board and client profile); charge capture, claim and denial run as **three workflows of the Claim entity**; patient balance runs on **Invoice**; human work runs through **Tasks (saved-view queues)**. No Revenue Cycle pillar, no Insurance page.
2. **Pages:** 15 existing screens touched; **0 required new pages** (RCM Home is an open decision: Overview row recommended); **1 shared component** to build (stage Kanban board extracted from Invoices/Deals).
3. **Verification (§3.0.0):** (Q1) a client stage-entered trigger **can** run rule actions, but only when the move goes through `logStageMove` (Deals drag/drawer do; assign-process, `moveClientToStage`, `setClientProcessStage` **emit nothing**); actions receive only `{recordType, recordId, data}`, no loaded records. (Q2) a client's process record is a `callLogs` row — **one per client+process**; values are flat on that row. (Q3) process fields **can** be tables and required-at-stage; no rule action persists fields today. (Q4) claims have **no `processId`** and claim processes are **deleted on load**. (Q5) tasks can't be created from rules yet (hook-bound, no `entityRef`); `stage.exited` exists but lacks the FROM process and isn't emitted by rule/claim/assign moves.
4. **Gaps:** G1 dropped; G3 (insurance entity) dropped; G2, G4–G12 re-checked; **16 new gaps** (N1–N16, §3.0.2) — headline ones: client stage events not emitted, `run_eligibility` must self-resolve its context, three overlapping client-stage stores, no `move_to_workflow` executor, per-process required categories, `stage.exited` carrying only the TO process, task hook/entityRef/saved views.
5. **Actions (D4):** 14 generic actions with parameter specs, minimum data, idempotency keys and Retry behavior (§3.0.5); A1–A30 re-expressed as **starter rules** (§3.0.5), including `create_task` for the spec's queue items.
6. **Biggest conflicts:** field values on claim/invoice/appointment drawers are drawer-local (not on records); claim sections have no per-workflow scoping (NC); client eligibility moves can overwrite `client.stage`; spec roles don't exist; `/settings` is SystemAdmin-only.
7. **Spec deltas:** 24 listed in §7 (spec not edited).
8. **Recommended start:** Slice 1 (engine + data foundation, now larger) then Slice 2 (eligibility on the client process) as the first demo — it needs **no new page**.
9. **Effort:** **20–25 front-end weeks** (rev 2: 20–25; Insurance page/store/service removed ≈ −2, multi-workflow claims + `move_to_workflow` ≈ +1.5, tasks/queues + auto-close ≈ +1.5, configurable actions/template seeding ≈ +1). Slices 1–2 ≈ 9–11 weeks.
10. **Remaining real questions:** 9 (§6).

---

## 2. Page inventory

Sidebar = live `DEFAULT_SIDEBAR_CONFIG` (`SidebarMenuContext.tsx:38-96` ✔, v9). **`src/app/config/navigation.ts` is dead code** (no importer). ● touchpoint · ○ indirect · – none. **No Insurance page / sidebar item.**

### 2.1 Clinic app (`ProtectedRoute` > `MainLayout`, `routes.tsx` 349 lines)

| Route | Component (lines) | Sidebar | Purpose today | Main stores | Spec |
|---|---|---|---|---|---|
| `/` | `Overview.tsx` (683) | WORKSPACE › Overview | Call/task dashboard | notificationsStore, tasksStore | ○ RCM KPI/queue row |
| `/scribe` | `AIScribeConsole.tsx` | WORKSPACE › AI Scribe | Scribe sessions | scribeSessionStore (sessionStorage) | ● |
| `/clients`, `/clients/:id` | `Clients.tsx` > `ClientProfile.tsx` (4458) | WORKSPACE › Contact | Contacts; Processes tab | clientsStore, processLogsStore | ● |
| `/deals` | `Deals.tsx` (4169) | WORKSPACE › Process | **Client-process** kanban/list, required-fields gate (L763 ✔) | useProcessStore, processLogsStore, `deals` | ● (**eligibility board lives here**) |
| `/process` | `Process.tsx` (8004) | CUSTOMIZATIONS › Workflows | Entity tabs, stage editor | useProcessStore | ● |
| `/automation` | `Automation.tsx` (622) | CUSTOMIZATIONS › Automation | Rules table + `AddAutomationDrawer` | useAutomationStore | ● |
| `/tasks`, `/tasks/:taskId` | `Tasks.tsx`, `TaskDetailPage.tsx` | WORKSPACE › Tasks | Task table + detail | tasksStore | ● (queues) |
| `/appointments` | `Appointments.tsx` (1721) | WORKSPACE › Appointments | List/calendar(month)/availability; auto per-stage presets | appointmentService | ● |
| `/chats` | `Chats.tsx` (3874) | WORKSPACE › Chats | Inbox/templates (simulated) | useWhatsappTemplates | ● |
| `/invoices` | `Invoices.tsx` (1030) | REVENUE & INSIGHTS › Invoice | List + stage Kanban | invoiceService | ● |
| `/claims` | `Claims.tsx` (694) | REVENUE & INSIGHTS › Insurance & Claims | Claims list; stages from the first **insurance** process | claimsStore | ● |
| `/reports` | `Reports.tsx` | REVENUE & INSIGHTS › Reports | Report builder | reportEngine | ● |
| `/services` | `Services.tsx` | REVENUE & INSIGHTS › Product & Services | Catalog (1 CPT/service) | servicesStore | ○ |
| `/settings/:tab/:subtab`, `/billing*` | `Settings.tsx` (13,305) | SETTINGS (SystemAdmin-only) | Tabs incl. SaaS "Billing" | many | ● |
| `/settings/team/:id` | `ManageTeamMember.tsx` | SETTINGS › Team | Member setup | teamStore | ● |
| others (`/call-logs`, `/web-forms`, `/knowledge-base`, `/organizations`, `/users`, `/payments`, `/transactions`, …) | – | – | Not RCM (payments/transactions = SaaS-side) | – | – |

Kiosk `/reception/*` → `AvatarReceptionView.tsx` (6736 lines; `:subStep` ignored). Patient portal `/patient/*` (`bill`, `pay`, `profile` relevant). `/admin/*` not RCM.

### 2.2 Screens that behave like pages

| Screen | File (lines) | Notes |
|---|---|---|
| Schedule appointment drawer | `appointments/ScheduleAppointmentDrawer.tsx` (1553) | `SectionCard`s Service L1313, Location L1334, Participants L1351, Schedule L1418; also mounted by `ActivityTab`, `ClientProfile` |
| Appointment detail drawer | `appointments/AppointmentDetailDrawer.tsx` (1294) | Tabs overview/documents/invoices/calls (L128, L782-787) |
| Process detail drawer | `deals/ProcessDetailDrawer.tsx` | Process-module fields, activity, history for a client-in-process (reads/writes the `callLogs` row) |
| Claim detail drawer | `claims/ClaimDetailDrawer.tsx` (1140) | Tabs overview/documents/billing; **also the create form** (`CreateClaimDrawer.tsx` is dead code) |
| Invoice detail drawer | `invoices/InvoiceDetailDrawer.tsx` (1185) | Tabs overview/documents/payments |
| Stage primitives | `common/SegmentedStageBar`, `ChevronStageRibbon` | Used by all entity pages |
| Dead/orphaned (don't build RCM here) | `AppointmentCard.tsx` ✔, `MyAIReceptionist.tsx` ✔, kiosk `ScheduledCheckinPanel`/`WalkInBookingPanel`/`InvoiceQrPaymentModal`, `TaskDetailDrawer`/`TaskContentSections` (NC) | |

---

## 3. Page-by-page mapping

### 3.0 Design basis

#### 3.0.0 Verification results (the five questions)

| # | Question | Answer | Evidence |
|---|---|---|---|
| **Q1** | Can a client-process stage-entered trigger run a rule action? What record context does the action get? | **Partly.** Fires only for moves that call `logStageMove` (emits `stage.entered`, `client.entered_stage`, and `stage.exited` only if `fromStageId` is set): Deals drag (`Deals.tsx:1132`) and process-drawer stage change (`ProcessDetailDrawer.tsx:802`). **Nothing is emitted by** `clientsStore.moveClientToStage` (L313-381), `clientProcessState.setClientProcessStage` (L22-41), assign-process `ClientProfile.tsx:1034-1127`, client create `Clients.tsx:931`, drawer handoff `ProcessDetailDrawer.tsx:735-748`. Executable stepKeys: `condition` L426, `fieldupdate` L438 (in-memory only), `update_to_stage` family L468-475 (client moves supported via `moveClientToStage(clientId, stageName, processId)`; default process falls back to Patient Care Journey if not found), `generate_invoice` L608, `generate_document` L766, `scheduleappointment` L965, `send_payment/send_invoice` L984-987; **everything else silently ignored** (no default branch). Context = `BusEvent {id,event,recordType,recordId,data?,orgId?,timestamp}` (`eventBus.ts:3-11`); `recordId` may be a client id, a client **name** (Deals) or a log id (drawer). The engine loads **no** client/process-record/appointment up front; each executor looks things up ad hoc. A stage rule may **fire twice** per move (`stage.entered` + `client.entered_stage`, different event ids; key L~278 = `recordId:ruleId:event.id`) — **NC** (not run). | `useAutomationStore.ts:551-594`, `ruleEngine.ts:157-246`, `:422-998` |
| **Q2** | Where is a client-process record stored? Several instances of one process per client? How is a process assigned? | **No single canonical record.** (1) `callLogs` row (`processLogsStore.ts:4`, type L6-23; `addProcessCallLog` L154 upserts by **clientId + process name**) = the process record used by Deals/ProcessDetailDrawer; (2) `Client.stage`, `Client.processes[]`, `processStagesMap` (`clientsStore.ts`, `ClientProfile.tsx:1060-1073`); (3) `deals` rows (`Deals.tsx:575-605`); (4) `clientProcessState.ts` `client.processStages[]` on **sessionStorage** (can diverge from localStorage `clients`). **One instance per client+process; several instances: not supported** (upserts at `addProcessCallLog`, `setClientProcessStage` L36-37, `processStagesMap` keyed by name). Assign: `ClientProfile.tsx:1034 handleConfirmAssignProcess`. A client can sit in **many different** processes at once. Process-field values live **flat on the callLogs row** via `updateProcessCallLogFields` (`processLogsStore.ts:312`, called `ProcessDetailDrawer.tsx:559`) — keys can collide with `id/status/date/process…`. | files cited |
| **Q3** | Table fields on process fields? Required at a stage? Can an action write them? | **Yes / yes / not today.** `FieldInputType` includes `table`, `group_repeatable`, `new_list` (`FieldRegistryContext.tsx:37-72`); table value = array of row objects with `id` (`FieldInputRenderer.tsx:528-640`); `DraggableOverviewSections.tsx:1055` renders tables for any mode incl. `mode="process"`. Required-at-stage: `isFieldRequiredForStage` (`processFieldValidation.ts:38`, stage **names**, case-insensitive), `getMissingRequiredProcessFields` L61 (module `process` only), emptiness L22 — **a table with one blank row counts as filled**. Enforced from Deals (RequiredFieldsModal), `ProcessDetailDrawer.tsx:~758`, `ClientProfile.tsx:1565`. `fieldupdate` (L438-465) persists nothing; the persistence function `updateProcessCallLogFields` is a plain (non-React) function, so a new executor can call it. Registry definitions are read through React hooks; a **non-hook reader is NC**. | cited |
| **Q4** | How does a record know its workflow? What breaks if a claim changes workflow? | Claim: **no `processId`** (`claimsStore.ts:81-84`: `status`, `currentStageId?`, `statusLabel?`). Appointment: `processId?` re-derived by `moveToStage` (`appointmentService.ts:1167-1215`) — the only cross-workflow precedent. Invoice: `processId?` exists but `invoiceService.moveToStage` (L958-990) never writes it and uses the singleton process. **Breaks / needs change:** `getStoredProcesses` deletes claim processes `useProcessStore.ts:1340-1343`; `saveStoredProcesses` L1562-1580 `nonClientTypes` omits claim; singleton ensure L1483-1491; insurance override rewrites ≤3-stage insurance processes (L1346-1364); `getWorkflowsForModule("claim")` L982-989 blends claim+insurance; `Process.tsx`: `ENTITY_TABS` has no claim tab (L1113-1119), claim→insurance mapping L1068/1091/1105, only the **first** claim/invoice process shown L1180-1184, no claim branch in `handleAddProcess` (L2817-2830), delete guard L2928; `Claims.tsx` loads insurance processes only (L64-68), process dropdown (L407-425) **does not filter claims**, stage bar resolves against one process (L533-560), presets keyed on `claim.status` (L165-205); `ClaimDetailDrawer.tsx` hard-codes `insProcs[0]` (L222-231); `claimsStore.moveClaimToStage` L467-498 substring map (maps "Appeal submitted" → Submitted); seeds have **no stage** and migration uses clm-* ids vs runtime ins-* (`entityMigration.ts` L120, L181-200); `REQUIRED_SYSTEM_CATEGORIES` is **per entity** (L381-388) so all three workflows would inherit draft/submitted/paid/denied; reports have **no claim source** (`reportEngine.ts`) and the `processes` rows are **mock** (`InvoiceContext.getReportRows` L915-987). Automation: `validateRuleEntityTarget` (`useAutomationStore.ts:290-343`) compares entity, **not process** (cross-workflow move allowed) and only checks legacy `rule.action`; `checkRuleCycle` L345-359 process-blind (cross-workflow cycles stopped only by `MAX_CHAIN_DEPTH` 10, `ruleEngine.ts:20`); `StageMove` stores the **TO** process only (L167-187) and `stage.exited` carries the TO process id (L577-583); `undoStageMove` L596-642 has no claim branch; activity `fromStage/toStage` are names only (`activityEngine.ts:92-96`). | cited |
| **Q5** | Tasks from rule actions with `entityRef`? Close on stage exit? | **Not yet / feasible.** `createTask` is inside the `useTasks()` hook (`tasksStore.ts:873-896`) but uses only plain functions (`getStoredTasks` L818, `saveStoredTasks` L841, `addNotification`) → extract to module functions. `TaskEntity` (`types/task.ts` L119+) has **no entityRef**; `migrateTaskEntity` (L675-815) spreads, so a new field persists. Id `tsk-<Date.now()>` can collide in the same ms. `stage.exited` emitted at `useAutomationStore.ts:577` **only if `fromStageId`**; ruleEngine's own moves (L368, L585) omit it; claims/assign never emit; exit `processId` = TO process. ruleEngine handles exit triggers (`isStageExitMatch` L185-187; drawer writes `stage.exit`). Non-React subscription is possible (`eventBus.subscribe`, `eventBus.ts:19-52`; engine self-registers `ruleEngine.ts:1043-1055`, imported `main.tsx:5`). Task completion emits no events (`toggleTaskStatus` L928, `updateTaskStage` L978). **No saved-views persistence** anywhere (`PageTopBar.onSaveFilter` L98 exists, unused). **No per-action idempotency**; engine key is in-memory, capped 2000 (`ruleEngine.ts:295-300`). Registration points for a new action: `StepCatalogDrawer.tsx:36-44`; `AddAutomationDrawer.tsx` (`STEP_ALLOWED_TRIGGERS` L81-100, catalog L190-200, default params L681-689); duplicated `STEP_ALLOWED_TRIGGERS` in `Process.tsx:958-968` and `AdminProcessTemplates.tsx:885-892`; `FlowBuilderTab.tsx:180-190, 655-662`; `StepParametersFields.tsx` (pattern: generate_invoice block L4990); executor in `ruleEngine.ts` step loop L422+ (executors read `act.params.*`, e.g. L611-640). | cited |

#### 3.0.1 Ground rules (PRD + decisions)

| # | Rule | Consequence |
|---|---|---|
| R1 | A stage is the record's status; each record has one `currentStageId`; logic keys off `systemCategory` where one exists | Starter stages carry a `systemCategory`; engine tolerates a deleted/missing category (rule shows *Needs attention*) |
| R2 | **Multiple workflows per entity allowed (D1)** | RCM adds workflows; no singleton work |
| R3 | Stage **entry** is the only trigger for entry actions; move-to-stage rules live on Global Automation and move only the event's own entity | Cross-entity effects (create claim, update invoice, create task) are **entry actions/rule actions**, not move rules |
| R4 | One door per entity (service moves + emits events) | Add `claimService`; route client-process moves through `logStageMove` |
| R5 | Idempotent actions, cause tracking, loop guard, failures show Retry, Undo | Per-action idempotency keys (§3.0.5); generalize Undo by `systemCategory` and from/to process |
| R6 | **Nothing hard-coded (D4)** | Starter templates seeded as editable rules/stages; no service may depend on a specific stage *name* |
| R7 | **Queues are Task saved views (D3)** | Tasks created by `create_task`, linked by `entityRef`, auto-close on stage exit |

#### 3.0.2 Gaps (G1 dropped; G2–G13 re-checked; N1–N16 new)

| # | Gap | Status vs D1–D4 | Evidence |
|---|---|---|---|
| ~~G1~~ | Singleton enforcement | **Dropped (D1)** | – |
| G2 | Claim processes persisted, **several** | Re-scoped: persist 3 workflows — remove delete at `useProcessStore.ts:1340-1343`; add claim to `saveStoredProcesses` `nonClientTypes` (L1562-1580) and ensure/seed (L1483-1491); claim tab + multi-process list in `Process.tsx` (L1113-1119, L1180-1184, L2817-2830, L2928); `getWorkflowsForModule("claim")` claim-only; legacy claim stage-id migration | Q4 |
| ~~G3~~ | Insurance entity/record/store | **Dropped (D2).** The `insurance` entity process becomes unused; its claim-shaped defaults (L769-776 ✔) and overwrite rule (L1346-1364) must stop touching claims. Decide to retire or leave (Q-R3) | – |
| G4 | Entry actions run as `AutomationRule`s with a stage-entered trigger, not via `Stage.workflowSteps` | **Reinforced by D4**: starters are seeded as rules | `ruleEngine.ts:182-236` |
| G5 | Delay/wait never executed; no scheduler | Still: daily jobs via a "Run daily jobs now" button on the **Automation page** | `ruleEngine.ts`; `InvoiceContext.tsx:332` |
| G6 | Events for claim; ruleEngine `else` moves non-appointment/invoice as a **client** (L398-411) | Still + client events (N1) | Q1/Q4 |
| G7 | New actions need registration in ~6 places | Now 14 actions (§3.0.5); consider de-duplicating `STEP_ALLOWED_TRIGGERS` (×3) | Q5 |
| G8 | `REQUIRED_SYSTEM_CATEGORIES` per entity; name-based `isPredefinedStage` locks stages named Paid/Draft/…; custom stages get no category | **Changed:** needs **per-process** required categories (`Process.requiredCategories`), minimal by default (D4); see N9 | `useProcessStore.ts:381-388, 869-937` |
| G9 | Required-at-stage only for `process`-module fields | **Helps D2** (client process fields work today); for claim fields it needs generalizing; table emptiness weak (N16) | `processFieldValidation.ts:58-66` |
| G10 | Undo hardcoded to appt-1/inv-1/2/5 | Still; add claim branch + from/to process | `useAutomationStore.ts:596-642` |
| G11 | PRD Phase-2 UI (partition line, cards under stages) not rendered | Unchanged, optional | `Process.tsx` |
| G12 | Field values not on records | **Split:** client-process fields persist on the `callLogs` row (OK); **claim/invoice/appointment drawer values are drawer-local** (`mantra_claim_fieldvalues_<id>`, `mantra_inv_fields_<id>`, `mantra_appt_fields_<id>`) → RCM fields read by actions/scrubber/reports must be real record properties | `ClaimDetailDrawer.tsx:347-395` |
| G13 | Progress report overstates Phases 1–3 | Unchanged | – |
| **N1** | Assign-process, `moveClientToStage`, `setClientProcessStage` emit **no** stage events → "client enters Needs fix" can't trigger rules | New: route all client-process moves through `logStageMove` with `fromStageId` | Q1 |
| **N2** | Engine gives actions no records; `run_eligibility` must resolve client (`getStoredClients`), process record (`getStoredCallLogs` by clientId+process) and appointments itself; no helpers exist | New: add `resolveRecordContext(event)` helper | Q1 |
| **N3** | One process record per client+process | New (design): per-check history = **child table keyed by appointmentId**; top-level fields = latest; Deals shows one card per client | Q2 |
| **N4** | Four overlapping client stage stores (`client.stage`, `processStagesMap`, `processStages` [sessionStorage], deals rows); `moveClientToStage` sets the single `client.stage` → a parallel eligibility process can overwrite the client's main stage | New (NC severity): eligibility moves must write only per-process stage + deal row; do not touch `client.stage` | Q1/Q2 |
| **N5** | No `move_to_workflow` executor. Client `nextProcessTransitions` is manual only (`ProcessDetailDrawer.tsx:719-748`); `movetonewprocess`/`assign_process` catalog-only; claims: none | New | Q1/Q4 |
| **N6** | Tasks: hook-bound mutators, no `entityRef`, id collision, no task events, **no saved-view store** | New | Q5 |
| **N7** | `stage.exited`: only with `fromStageId`; rule moves, claims, assign omit it; carries TO process id → task auto-close and exit rules can mis-match across workflows | New: add `fromProcessId/fromProcessName` to `StageMove`, emit exit with FROM process | Q4/Q5 |
| **N8** | Appointment has no coverage fields; no UI reads one; `AppointmentCard` dead; detail-drawer values drawer-local | New: optional `Appointment.coverage {status, stageName, checkedAt, summary}`; `updateAppointment` persists it (`appointmentService.ts:1247`) | Q3b |
| **N9** | `isPredefinedStage` name list also locks custom stages | Folded into G8 | – |
| **N10** | Claims list: process dropdown doesn't filter; presets keyed on `claim.status` enum (incl. both Denied/Rejected); no workflow column; no claim report source; `processes` report rows are mock | New | Q4 |
| **N11** | `validateRuleEntityTarget` entity-only, legacy-only; `checkRuleCycle` process-blind | New: validate step-level moves and detect cross-workflow cycles | Q4 |
| **N12** | Seed claims have no stage; migration reads `mantra_claims_v1` but `saveClaim` writes `claims_<orgId>` in fresh workspaces; clm-* vs ins-* ids | New | `entityMigration.ts`, `claimsStore.ts:402-404` |
| **N13** | Section/field scoping per **workflow** for claim-module fields (needed for "per-workflow drawer sections") — `processIds` scoping exists only for `process` module | **NC** — add `workflowIds` to claim sections/fields | `FieldRegistryContext.tsx` |
| **N14** | `createAppointment` reportedly blocked unless an appointment automation exists (L637-647) | NC; affects A1 testing | `appointmentService.ts` |
| **N15** | Two double-emit sources: `stage.entered` + `*.entered_stage`; service + `logStageMove` (appointment L1222-1243, invoice L987-1007); check-in `mockMaClient` + `checkInAppointment` | Fix before entry actions (duplicate sends/claims) | Q1 |
| **N16** | Required table field passes with one blank row | New: treat "all rows blank" as empty | `processFieldValidation.ts:22` |

#### 3.0.3 Entity / workflow map

| Spec pipeline | Hosted as | Record | Notes |
|---|---|---|---|
| P1 Coverage verification + P2 Prior auth | **Client process** (starter name "Coverage & authorization"), assigned to a client when needed | The client's `callLogs` process row; stage = latest verification/auth state; check history = child table | One row per client+process (N3). Visible on **Deals**; stage editable on `/process` › Processes tab |
| P3 Charge capture | Claim entity workflow **"Charge capture"** | Claim | Replaces the spec's Encounter entity |
| P4 Claim | Claim entity workflow **"Claim"** | same Claim (moved with `move_to_workflow`) | |
| P5 Denial | Claim entity workflow **"Denial & appeal"** | same Claim | Replaces the spec's Denial entity |
| P6 Patient balance | Invoice entity stages (existing workflow, extended) | Invoice | Invoice code is effectively single-workflow today (no `processId` written) |
| Human work | Task entity; queues = saved views | Task + `entityRef` | D3 |
| Appointment | unchanged stages; gets entry actions + `coverage` fields | Appointment | chip data |

#### 3.0.4 Default starter templates (all editable; none enforced)

*Starter* = seeded by a "Load RCM starter templates" action (and optionally at clinic signup); users can rename, delete or reorder stages and edit/disable the seeded rules. `systemCategory` is optional metadata used for grouping/reports only (R6). "Req." = required category in that process (kept minimal, per-process — G8).

**A. Client process "Coverage & authorization" (starter)** — stage types per client-process model (`stageCategory`, `stagePosition`); no `REQUIRED_SYSTEM_CATEGORIES` (clients have none ✔ L382).

| # | Stage | Meaning (spec P1/P2) | Position / category | Typical owner | Starter rule(s) that move into it |
|---|---|---|---|---|---|
| 1 | Not checked | Awaiting first check | initial / in_progress | System | process assigned |
| 2 | Checking | Request in flight | intermediate | System | `run_eligibility` started |
| 3 | Needs fix | Name/DOB/ID mismatch after retries | intermediate | Front desk | result map |
| 4 | Provider setup issue | Provider not enrolled | intermediate | Biller | result map |
| 5 | Inconclusive | No usable answer after retries | intermediate | Biller | result map |
| 6 | Pending review | Voice/manual benefits captured | intermediate | Biller | voice call result |
| 7 | Auth required | Booking matches payer×service rule / renewal | intermediate | Biller | A10 / A11 |
| 8 | Auth submitted | Request sent | intermediate | Biller | manual / action |
| 9 | Verified | Active; cleared (auth not needed or approved) | final / success | – | result map; auth approved |
| 10 | Auth expired | Date/units exceeded | intermediate | Biller | A11 |
| 11 | Inactive | 271 inactive | final / lost | Front desk | result map |
| 12 | Auth denied | Payer denies auth | final / lost | Biller | manual |
| 13 | Self-pay | No coverage / chose self-pay | final / success | – | manual / A1 condition |

**B. Claim entity — 3 workflows (starters)**

| Workflow | Stages (position/category · optional `systemCategory`) | Req. (per-process) | Leaves via |
|---|---|---|---|
| **Charge capture** | Awaiting note (initial · `awaiting_note`) → Coding review (`coding_review`) → Hold (`hold`) → Ready to bill (final/success · `ready_to_bill`) | none | `move_to_workflow` → *Claim* / Draft when Ready to bill is entered (A16) |
| **Claim** | Draft (initial · `draft`) → Scrub failed (`scrub_failed`) → Ready to submit (`ready`) → Submitted (`submitted`) → Rejected (`rejected`) → Accepted by payer (`accepted`) → Pending (payer) (`in_review`) → Partially paid (`partially_paid`) → Paid (final/success · `paid`) → Closed (final/success · `closed`) | `submitted`, `paid` (services map claim `status` from category; missing category ⇒ "Unmapped") | `move_to_workflow` → *Denial & appeal* on denial (A25) |
| **Denial & appeal** | New denial (initial · `denied`) → Correct & resubmit (`denial_correct`) → Appeal drafted (`appeal_drafted`) → Appeal submitted (`appeal_submitted`) → Written off (final/lost · `written_off`) | none | `move_to_workflow` → *Claim* / Ready to submit (corrected resubmission) or / Paid (appeal won, ERA posts) |

*Compared with Rev 2's single 18-stage pipeline: stages are split across workflows by journey; "Denied" is the first stage of the denial journey (not a final-lost stage in the claim journey).*

**C. Invoice (P6)** — existing stages stay; starters **add** four: Reminder 1 (`reminder_1`), Reminder 2 (`reminder_2`), Payment plan (`payment_plan`), Written off (`written_off`, final/lost). Existing Draft (= estimate for insured visits), Sent (= statement/balance due), Partially paid, Overdue, Paid, Void are reused (which are *stored* stages is NC: code defaults are Draft, Payment recorded, Paid, Overdue but services/Kanban also handle Sent/Viewed/Partially paid/Void). Required categories stay `draft, paid, void` (`REQUIRED_SYSTEM_CATEGORIES` ✔ L384) — **needs per-process override if clinics may delete them (R6)**.

**D. Appointment / Task** — no new stages.

#### 3.0.5 Generic actions and A1–A30 as starter rules

**Mechanisms:** each starter rule = *trigger → [conditions] → action chain*. Triggers: **ST** stage-entered/exited (any entity), **EV** domain event, **JOB** daily-job event (emitted by `rcmJobs.runDaily()`; button on the Automation page; delay is not honored by the engine, G5). All parameters below are editable in the existing Add Automation drawer (new param blocks in `StepParametersFields.tsx`).

**Generic action specs (14)** — each is registered once (G7) and runs on **any** trigger.

| Action | Configurable parameters | Minimum data to run | Idempotency key | Failure / Retry |
|---|---|---|---|---|
| `run_eligibility` | scope (appointment \| client \| coverage), coverage selector (primary/secondary/all), service-type codes (default from the appointment's service), service-date source, **dedupe window** (default 30 d), **result→stage map** (status → stage in a chosen client process), retries (variants ≤3, backoff 1/5/30 min), write targets (client-process fields + history row; `Appointment.coverage` on/off), follow other-payer redirect (F2.7), adapter/scenario (mock) | client legal name + DOB + sex; coverage member ID + payer; rendering provider NPI; service date | `clientId:coverageId:serviceDate:serviceTypeSet` within the window (skip if a verified result is fresh) | Transport error → backoff retries → result "Inconclusive"; action marked **Failed + Retry** on the Automation page (health); never undoes recorded facts |
| `move_to_workflow` | record type (claim \| client), **target workflow**, target stage (default initial), keep field values (yes), end current enrollment (client only), cause label | record id; target workflow exists with that stage | `recordId:targetWorkflowId` — if already there, no-op | Invalid target ⇒ rule health "Needs attention"; cycle guard (depth 10; save-time cross-workflow check, N11); Retry |
| `create_claim` | **trigger/source record** (appointment \| scribe session \| invoice \| client), **start workflow + stage**, lines source (service→CPT map \| scribe codes \| none/draft), payer/coverage source (client primary coverage on DOS \| eligibility result \| explicit), provider source (appointment provider \| scribe doctor), billing entity/POS source (Billing setup), assignee rule, dedupe scope (per appointment / per scribe session / per invoice) | clientId + date of service | `claim:{sourceType}:{sourceId}:{startWorkflowId}` → returns existing (like `createInvoiceFromAppointment`) | Missing optional data ⇒ create in the start stage with `missingData[]` flag (and optional `create_task`); no clientId ⇒ Failed + Retry |
| `create_task` | title/description templates (with record variables), **queue**, task type, priority, due (offset from now / visit date / field), assignee rule (role/member/record owner), amount-at-stake source, `autoCloseOnStageExit` (default **on**) | trigger record id (type + stage) | **open task with same `entityRef.id + entityRef.stageId + ruleId`** (re-entering a stage after leaving legitimately creates a new task) | Store error ⇒ Failed + Retry; notification failure ignored |
| `update_to_stage` (exists) | entity/record, process, stage | record id | existing | existing (needs explicit `processId` for client moves — default falls back to Patient Care Journey) |
| `scrub_claim` | rule set, on-pass stage, on-fail stage, write issues to | claim lines, ≥1 ICD, billing entity, rendering NPI | `claimId:scrubVersion` | Failed + Retry |
| `submit_claim` | immediate vs batch window, adapter, on-submit stage, ack handling | claim in a submit-ready stage, passed scrub | `claimId:frequency:submissionSeq` | Transport error ⇒ retry then Failed + Retry; rejection arrives as event |
| `check_claim_status` | age threshold, stage filter, on-pending/on-missing stage | submitted claim with payer claim #/tracking id | `claimId:checkDate` | Failed + Retry |
| `post_remittance` | match rules (claim #, patient), auto-post thresholds, target stages (paid/partial/denied), unmatched handling | ERA with trace #, payer, claim refs | `traceNumber:payerClaimNumber` | Unmatched ⇒ event `era.unmatched` (no failure) |
| `update_invoice_from_claim` | which claim stage triggers, invoice target stage, statement/payment-link on/off | claim with patient responsibility + linked invoice | `claimId:invoiceId:claimEventSeq` | Failed + Retry |
| `draft_appeal` | template, source fields (claim + note + payer reason), AI settings | denial reason codes + claim | `claimId:appealRevision` | Failed + Retry; **propose-only** — a person edits/sends |
| `send_message` | channel, template, variables (`billing.*`, `insurance.*`), recipient rule, consent check | recipient + consent | `recordId:templateId:ruleId:eventId` | Failed + Retry; mock-dispatch to `useConversations` + activity in prototype |
| `start_call` | purpose (payer benefits \| balance reminder), script, hours/retries (`CallTriggerSettings`), consent check | payer phone / patient consent | `recordId:purpose:day` | Failed + Retry |
| `notify` | recipients/role, message, link | – | `recordId:ruleId:eventId` | ignored on failure |

**A1–A30 as starter rules** (all disabled/enabled and editable; "queue" = `create_task` queue name, D3; every `create_task` auto-closes when the record leaves the stage it was created for):

| A# | Trigger | Condition | Action chain (generic actions) | Target |
|---|---|---|---|---|
| A1 | EV `appointment.booked` | has coverage | `run_eligibility` (real time; result→stage map into the client process) | client process stage + `Appointment.coverage` |
| A2 | JOB daily 6 pm (visits in 3 d / tomorrow) | skip fresh checks | `run_eligibility` (batch) | same |
| A3 | EV `coverage.updated` | future appointments exist | `run_eligibility` | same |
| A4 | ST enter *Needs fix* (client process) | – | `create_task` queue **Insurance fixes** ("Confirm {field} with patient", due before visit, `entityRef`=client+stage) | Tasks |
| A5 | ST enter *Inactive* | – | `create_task` (Insurance fixes) + `send_message` ("please update your insurance", form link) | Tasks, Chats |
| A6 | ST enter *Provider setup issue* | – | `create_task` queue **Enrollment** | Tasks |
| A7 | ST enter *Inconclusive* | voice enabled | `start_call` (payer benefits) | Call logs → *Pending review* |
| A8 | ST enter *Inconclusive* | voice off / call failed | `create_task` queue **Benefits to verify** | Tasks |
| A9 | JOB (verified, 2 d before visit) | stage = Verified | `send_message` (estimate) | Chats |
| A10 | EV `appointment.booked` | payer×service needs auth | `update_to_stage` → *Auth required* + `create_task` queue **Prior auth** | client process |
| A11 | JOB (auth ≤14 d or 80% units) | – | `update_to_stage` → *Auth expired* + `create_task` (Prior auth, "Renew auth") | client process |
| A12 | JOB daily | visit in 2 d, not Verified | `notify` front desk + biller | in-app |
| A13 | EV `appointment.checked_in` | last check > 1 d | `run_eligibility` | same as A1 |
| A14 | EV `appointment.completed` | – | `create_claim` (start *Charge capture* / Awaiting note) + `notify` provider. **Alternative starter variants (enable one):** create at scribe signing, at check-in, at invoice paid | Claim |
| A15 | JOB daily 7 pm | claim in *Awaiting note* > 24 h | `notify` provider | in-app |
| A16 | EV `claim.note_signed` / codes accepted | – | `update_to_stage` → *Coding review*…*Ready to bill*; ST enter *Ready to bill* → `move_to_workflow` → *Claim*/Draft; ST enter *Draft* → `scrub_claim` | Claim |
| A17 | EV `claim.scrub_failed` | – | `update_to_stage` → *Scrub failed* + `create_task` queue **Claim fixes** | Claim, Tasks |
| A18 | JOB daily 5 pm | claims in *Ready to submit* | `submit_claim` (batch) | Claim → Submitted |
| A19 | JOB daily | *Submitted* > 2 d, no ack | `notify` biller | in-app |
| A20 | EV `claim.rejected` | – | `update_to_stage` → *Rejected* + `create_task` (Claim fixes, payer reason in plain words) | Claim, Tasks |
| A21 | JOB daily | *Accepted* with no ERA 30 d | `check_claim_status` → *Pending (payer)* + `create_task` queue **Denials and A/R** | Claim, Tasks |
| A22 | EV `era.received` | – | `post_remittance` → events `claim.paid/partially_paid/denied` | Claim |
| A23 | EV `era.unmatched` | – | `create_task` queue **Posting** (match manually) | Tasks |
| A24 | EV `claim.partially_paid` | under expected by > $5 or 5% | `update_to_stage` → *Partially paid* + `create_task` (Posting, "Review underpayment") | Claim, Tasks |
| A25 | EV `claim.denied` | – | `move_to_workflow` → *Denial & appeal* / New denial + categorize (CARC/RARC→category, deadline from payer rules) + `create_task` (Denials and A/R) | Claim, Tasks |
| A26 | JOB (appeal deadline ≤14 d, not appealed) | – | `notify` manager + raise task priority | Tasks |
| A27 | ST enter claim *Paid* / *Partially paid* / *Written off* | linked invoice | `update_invoice_from_claim` → invoice *Sent* + `send_message` (statement + payment link) | Invoice, Chats |
| A28 | JOB (invoice *Sent* unpaid 15 / 30 d) | no plan | `update_to_stage` → *Reminder 1/2* + `send_message` | Invoice, Chats |
| A29 | JOB (45 d unpaid) | voice consent | `start_call` (balance reminder) | Call logs |
| A30 | EV `invoice.overdue` (60 d) | – | `update_to_stage` → *Overdue* + `create_task` queue **Patient balances** (manager decision) | Invoice, Tasks |

Seeding: A-table is stored as a **starter-template bundle** (processes + stages + rules + saved task views + templates); "Load RCM starter templates" is idempotent and never overwrites edited items. Spec's 26 events are provided as needed: new `coverage.*`, `claim.*` (incl. `note_signed`, `coded`, `scrub_failed`, `rejected`, `accepted`, `denied`, `paid`, `partially_paid`), `era.*`, `denial.deadline_near`, `balance.*`, `task.*`; **eligibility/authorization are client-process stage events**, not `eligibility.*` events (spec delta).

#### 3.0.6 Fields

| Where | New fields / sections | Child tables | Required at stage | Persistence |
|---|---|---|---|---|
| **Client process "Coverage & authorization"** (process-module fields, `processIds` = this process) | *Latest result* (status, payer, plan, copay, deductible remaining, coinsurance, OOP remaining, network, plan dates, other payers, last checked, source); *Resolver* (rejection code, category, action, attempt #, **message**); *Authorization* (required?, auth #, units approved/used, valid from–to, referring provider, status, request/decision dates); *Call* (call reference, reviewedBy/At) — keys namespaced `elig_*`/`auth_*` to avoid collisions with `callLogs` keys | **Check history** (table: appointmentId, date, trigger, source, status, reason code, summary, raw ref) and **Benefit lines** (table) | e.g. *Auth submitted*: request date; *Verified via voice*: call ref + reviewer; table emptiness fix (N16) | `callLogs` row via `updateProcessCallLogFields` (plain function) |
| **Appointment** | `coverage {status, stageName, checkedAt, summary}`, `coverageId`, `financialClass`, claim link | – | – | optional typed fields; `updateAppointment` |
| **Client** | legal first/last name, DOB, sex, address, guarantor, selfPay, consents {sms, voice, cardOnFile}; **Coverages** table (primary/secondary/tertiary, subscriber + relationship, effective/term, card front/back) | Coverages | – | `clientsStore` typed |
| **Claim — by workflow drawer** (sections scoped per workflow, N13) | *Charge capture*: Visit (rendering provider, location, DOS, scribe session), Codes (ICD/CPT/modifier tables), Hold reason. *Claim*: Submission (claim #, frequency, payer claim #, batch, 999/277CA), Money (billed, expected, allowed, paid, adjustments, patient resp.), Scrub issues, Payments/remittances. *Denial & appeal*: Denial (reason codes, category, root cause), Appeal (deadline, level, letter, outcome, amount at stake). Common: assignee, timely-filing deadline, priority | Diagnoses, Lines (CPT, modifiers ×4, units, charge, pointers, paid, allowed, line denial codes), Scrub issues, Payments | *Coding review*: ≥1 ICD+CPT; *Submitted*: billing NPI/tax ID/POS; *New denial*: reason codes; *Appeal drafted*: deadline + letter; *Correct & resubmit*: frequency = corrected | **properties on `Claim`** (G12), not drawer-local |
| **Invoice** | claim link, insurance paid, adjustments, patient responsibility, statements count/last sent | Payment plan | *Payment plan*: instalment + frequency | `ClientInvoice` properties |
| **Task** | `entityRef {type,id,processId,stageId,ruleId}`, `taskType`, `queueId`, `priority` (low/normal/high/urgent), `dueAt`, `payerId`, `amountAtStake`, `source`, `closedBy` | – | – | `TaskEntity` |
| Reference data (no pipeline) | Payer, payer enrollment, fee schedule, billing entity, locations (POS), scrub rules, claim defaults → **Settings › Billing setup**; team NPI/taxonomy/license → team store | – | – | new reference stores |

**No `insurance` registry module** (D2).

#### 3.0.7 Work queues = Task saved views

New **`taskViewsStore`** (localStorage) + a "Queue" selector and "Save view" on Tasks (`PageTopBar.onSaveFilter` exists but is unused). A view = {name, queueId filter, priority/due/overdue filter, columns}. Sort: due date, then amount at stake. Columns: Queue, Title, **Linked record** (`entityRef` link), Priority, Due, SLA breached, Amount at stake, Assignee.

| Queue (spec §8) | Created by | Auto-closes when | Opens (linked record) |
|---|---|---|---|
| Insurance fixes | A4, A5 | client leaves *Needs fix* / *Inactive* | Client profile › Insurance tab with field highlighted (`?tab=insurance&field=`), or Deals process drawer |
| Benefits to verify | A8 | client leaves *Inconclusive* (e.g. → *Pending review*/*Verified*) | Deals process drawer (check history) |
| Enrollment | A6 | client leaves *Provider setup issue* | Billing setup › Payers (enrollment) |
| Prior auth | A10, A11 | client leaves *Auth required* / *Auth expired* | Deals process drawer (Authorization section) |
| Claim fixes | A17, A20 | claim leaves *Scrub failed* / *Rejected* | Claims › claim drawer (`/claims?open=&workflow=`) |
| Posting | A23, A24 | task completed manually (unmatched ERA) / claim leaves *Partially paid* | Claims › Post payments / claim drawer |
| Denials and A/R | A21, A25 | claim leaves *Pending (payer)* / *New denial* / denial stages | Claims › claim drawer |
| Patient balances | A30 | invoice leaves *Overdue* | Invoice drawer |

Auto-close = subscriber on `stage.exited` matching `entityRef.type/id/stageId` (not `processId` on the event — it is the TO process until N7 is fixed).

---

### 3.1 Schedule appointment drawer — drawer on `/appointments`, `/clients/:id` — `ScheduleAppointmentDrawer.tsx`

Facts: `primaryInsurance/secondaryInsurance` are type-only (L79-80), never passed (`Appointments.tsx:1559-1611`); booking → `handleBookingComplete` → `createAppointment` (`appointmentService.ts:630`, emits `appointment.booked` L837); mounted also by `ActivityTab` and `ClientProfile` (props must be optional).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse (main) | Effort |
|---|---|---|---|---|---|---|---|---|
| Insurance vs self-pay; pick/add coverage from canonical payers | F1.1-2 | Segmented control + coverage select (from the **client's Coverages table**) + "Add coverage" | New `SectionCard` "Coverage" between Participants (L1413) and Schedule (L1418) | client Coverages; payer list (Billing setup) | `coverage.added`; A1 reads it | new | `SectionCard`/`FieldRow`, `CustomDropdown` | M |
| **Verify now** + result chip | F1.3, F2 | Button runs `run_eligibility` for this client/coverage; chip = result (from `Appointment.coverage` / client process stage) | same section | client process fields + `Appointment.coverage` | `run_eligibility` (A1) | new | stage colors | M |
| Auth-required warning | F1.4 | Inline alert; A10 moves the client process to *Auth required* | same; footer summary L1263 | Service `authRequiredDefault`, payer auth rules | A10 | new | – | M |
| Estimate in confirmation | F1.5 | Text | confirmation | benefit lines + fee schedule | A9 | new | – | S |
| Gate: coverage chosen or self-pay | F1 | extend `isFormComplete` (L1180) | footer | – | – | modify | – | S |

### 3.2 Appointments list and calendar — `/appointments` — `Appointments.tsx`, `AppointmentCalendarView.tsx`

Facts: list columns ID, Title, Stages (`SegmentedStageBar` L1317), Client, Date, Time, Provider, Service; auto per-stage presets (L1149-1164); row actions L1469-1540 (no check-in); calendar month-only with hard-coded "✓ CONFIRMED" (L320-325); `AppointmentCard` dead.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Coverage chip (green/amber/red/grey) | §2 | Chip from `Appointment.coverage.status` (grey = not checked) | **new "Coverage" column** after Service; dot in month cell (L196-218); chip in day-card header (L319) | `Appointment.coverage` (N8) | written by `run_eligibility` | modify | stage colors | M |
| Click chip → coverage panel | §2 | opens detail drawer Coverage panel | list + calendar | – | – | modify | existing open handlers | S |
| "Verify upcoming" | A2 | Toolbar button → runs the batch rule | list toolbar | `rcmJobs` | A2 (JOB) | new | – | S |
| `clientId` always set | §7 | none | payload | `Appointment.clientId` required | – | modify | – | M |
| Mark complete | A14 | existing action (`Appointments.tsx:1651`) | row/drawer | – | `appointment.completed` ✔ → starter rule | modify | existing | S |

### 3.3 Appointment detail drawer — `AppointmentDetailDrawer.tsx` (1294)

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Coverage summary: status, copay, deductible remaining, coinsurance, OOP, estimate | §2 | New "Coverage" **tab** (or card above `DraggableOverviewSections`, ~L826) showing the appointment's latest result + the **client process stage** + link to the process drawer (history table) | tabs array L782-787 + body | `Appointment.coverage` + client process fields | A13 | new | `ChevronStageRibbon` | M |
| Re-run / View raw | F2 | buttons (raw = history row payload) | same | `run_eligibility` | A13 | new | – | S |
| Accept/Edit pending-review benefits | F3.4 | opens process drawer fields; accept = move client process to *Verified* | same | process fields | stage move (cause manual) | new | one-door move | S |
| Check in | F4 | "Check in" button (none today; `checkInAppointment` L1138 sets `checkedInAt` only) | header | `appointmentService` | `appointment.checked_in` → A13 (fix double emit first, N15) | new | – | S |
| Claim link + workflow/stage chip | – | chip | Overview section | `Claim.appointmentId` | – | new | – | S |

### 3.4 Check-in (desk + kiosk) — detail drawer; `AvatarReceptionView.tsx`

Facts: `mockMaClient` (~L1368-1385) emits check-in events *and* calls `checkInAppointment` (double-fire NC); kiosk `PHONE→OTP→PATIENT_PICK→DETAILS_SUMMARY` (L5025-5107) → `handleConfirmCheckin` L2373; payment = separate `BILLING` screen (L5316, QR L5114).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Coverage chip + copay; auto re-run if stale | F4.1 | Chip + copay | desk: drawer header; kiosk: `DETAILS_SUMMARY` row (L5028-5069) | `Appointment.coverage` | A13 | new | – | S |
| Confirm insurance unchanged; capture card photos | F4.2 | kiosk states `INSURANCE_CONFIRM`, `CARD_CAPTURE` before L2373/L5092; desk: coverage editor | kiosk + drawer | client Coverages | `coverage.updated` → A3 | new | `ScreenState` pattern | M |
| Collect copay/deposit | F4.3 | kiosk `COPAY` (reuse BILLING QR); desk `RecordPaymentModal` | kiosk + drawer | `invoiceService.recordPayment` (L758) | `invoice.*` ✔ | modify | existing modal | M |
| Override with reason | F4.4 | alert + reason field | desk + kiosk | audit | – | new | – | S |

### 3.5 Deals — `/deals` — `Deals.tsx` (**the eligibility board**) and Process detail drawer

Facts: Deals shows client processes (L763 ✔) with kanban/list and a required-fields gate (`RequiredFieldsModal`); stage drag calls `triggerStageMoveAutomation` → `logStageMove` (L1132) so rules fire; a row = client+process (one card per client); `ProcessDetailDrawer` renders process-module fields incl. tables.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Eligibility & prior-auth board (P1/P2) | §2 | **No new UI**: the "Coverage & authorization" process appears in the existing process filter; kanban columns = starter stages | Deals process filter (L762-800) | client process + `callLogs` | A1–A13 | exists (config) | Deals kanban | S |
| Result/resolver/auth fields + **check-history table** | §7 | process-module fields + table field in the process drawer | `ProcessDetailDrawer` (`DraggableOverviewSections mode="process"`, tables supported ✔ Q3) | `callLogs` row | `run_eligibility` writes | new (fields) | field registry | M |
| Stage-required data (auth request date, call ref + reviewer) | P2/F3 | `RequiredFieldsModal` on drag | Deals/drawer | `requiredStages` (works for `process` fields ✔) | – | modify | existing gate | S |
| "Run eligibility" button on a card/drawer | F2 | button | drawer header | action | `run_eligibility` | new | – | S |
| Assign "Coverage & authorization" to a client when needed | F1 | rule or manual (`ClientProfile` Processes tab) | `handleConfirmAssignProcess` (L1034-1127) — must emit stage-entry event (N1) | – | A1 | modify | existing | M |

### 3.6 Client profile — `/clients/:id` — `ClientProfile.tsx`

Facts: tab array L2349-2357 ✔ (overview, processes, forms, appointments, invoices, documents, products); `activeProfileTab` L933; Invoices body L3423-3710; no typed DOB/sex/address.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Insurance tab**: Coverages (primary/secondary/tertiary, subscriber, card images) + current verification stage chip | §2, §7 | New tab `insurance` + coverage editor | add to array L2349-2357, union L933, body after L3710 | client Coverages table; client process stage | `coverage.added/updated` → A3 | new | registry table field | L |
| Eligibility process visible in Processes tab with history | P1 | existing Processes tab shows the process + drawer | Processes tab | `callLogs` row | – | exists | – | S |
| **Billing tab**: claims (workflow + stage chips), patient invoices, payments, statements, plan | §2, F9 | New tab `billing`; move Invoices tab content into it | after Insurance | `claimsStore`, `invoiceService.getInvoicesByClient` | – | modify | existing invoice list | M |
| Typed demographics, guarantor, consents | §7 | section in Overview | `DEFAULT_CLIENT_SECTIONS` (L424-457) | `clientsStore` | – | modify | registry | M |
| Highlight field from a task | §8 | `?tab=insurance&field=` | Insurance tab | – | – | new | – | S |

### 3.7 AI Scribe — `/scribe` — `TranscriptDetailDrawer.tsx`, `scribeSessionStore.ts`

Facts: no sign/lock; `saveScribeSession` (L630-672) emits no event; **hard-coded `icd_code: "J06.9"`** ✔ (`TranscriptDetailDrawer.tsx:218`); no CPT; sessions in sessionStorage.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Codes panel** (ICD-10 + CPT/modifiers; accept/edit/decline) → writes to the claim's Codes tables | F5 | card with rows + `CPTCodeInput` | `TranscriptDetailDrawer` col. 1 after L521 | claim tables (found by `appointmentId`/scribe session) | `claim.coded` | new | `CPTCodeInput`, `ClaimDiagnosisCode` | L |
| Fix hard-coded ICD | – | read `d.icd10Code` | L218 | – | – | modify | – | S |
| **Sign and send to billing** | F5 | primary button | drawer header L391-405 | `ScribeSession.status='signed'`, `signedBy/At` | `claim.note_signed` (new) → A16 / `create_claim` variant | new | – | M |
| Ophthalmology codes (92004, 92014, 92083, 76519, 66984 + RT/LT/50) | §9 | seed | `cptCodes.ts` + scribe presets | – | – | modify | – | S |

### 3.8 Claims — `/claims` (Insurance & Claims) — `Claims.tsx`, `ClaimDetailDrawer.tsx`, `claimsStore.ts`

Facts: loads insurance processes (L64-68); dropdown doesn't filter (L164-195); status presets keyed on `claim.status` (L269-320); two movers, no events (`handleStageChange` L135-161; `moveClaimToStage` L467); creation via drawer create mode; mock `submitClaimElectronically` (L434).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Workflow selector** (Charge capture / Claim / Denial & appeal / All) | D1 | Segmented control; "All" = list with a Workflow column | `PageTopBar` leftElement (replaces the process dropdown L407-425) | `Claim.processId` (new) → filter `filteredClaims` | – | modify | `WorkflowGearDropdown` | M |
| **One board per workflow** | §2 | Kanban toggle; columns = the selected workflow's stages | Claims toolbar | claim processes | drag → `claimService.moveToStage` | new | shared `PipelineBoard` extracted from `Invoices.tsx` L700+ / `Deals.tsx` | L |
| Stage bar/ribbon resolve against the claim's own workflow | D1 | – | table "Stages" col (L533-560); drawer `ChevronStageRibbon` L707-725 | `claim.processId` (not `insProcs[0]`) | – | modify | stage primitives | M |
| **`move_to_workflow`** button/menu + rule action | D1 | "Move to workflow…" menu in drawer | drawer header | `claimService.moveClaimToWorkflow` (processId, stage, status from `systemCategory`) | `stage.exited` (FROM process) + `stage.entered` (TO) | new | appointment `moveToStage` precedent | L |
| **Per-workflow drawer field sections** (§3.0.6) | §7 | sections scoped to the claim's workflow | `DEFAULT_CLAIM_SECTIONS` L75-124; `SYSTEM_SEEDS.claim` | **properties on Claim** (G12); `workflowIds` scoping (N13) | – | modify | `DraggableOverviewSections mode="claim"` | L |
| One-door `claimService` (move, submit, post, create) emitting `claim.*`, `stage.entered/exited`, logging, Undo | R4 | – | `src/lib/claimService.ts` replaces both movers | `claimsStore` | all `claim.*` | new | `appointmentService.moveToStage` | L |
| Required fields at stage (claim) | G9 | `RequiredFieldsModal` on drag/ribbon | list + drawer | generalized `requiredStages` | – | new | existing modal | M |
| Post payments / ERA; unmatched ERA | F7 | toolbar "Post payments" + modal | Claims header | Payments child table | `era.*` → A22/A23 | new | `RecordPaymentModal` pattern | L |
| Appeal draft | F8 | button in *Appeal drafted* | drawer Appeal section | `appealLetter` | `draft_appeal` | new | – | M |
| Submit / Resubmit / Void / CMS-1500 / Defer | F6 | existing buttons rewired | row actions L609-633 | – | A18, A21 | modify | existing modals | M |
| Timeline | §7 | ActivityTab entries (workflow-change type; names + process) | drawer right | `activityEngine` | – | modify | `ActivityTab` | S |
| Retire dead `CreateClaimDrawer`; migrate claims (stage, `processId`) | N12 | – | – | `entityMigration.ts` | – | modify | – | M |

### 3.9 Invoices — `/invoices` — `Invoices.tsx`, `InvoiceDetailDrawer.tsx`, `RecordPaymentModal.tsx`

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Patient-balance starter stages (Reminder 1/2, Payment plan, Written off) | P6 | new stages; Kanban columns appear automatically | invoice process; Kanban L314-322 | invoice process | A28, A30 | modify | dynamic columns | M |
| Stage presets (Patient balances) | §2 | presets generated from stages (copy Appointments' L1149-1164) | `PageTopBar filterPresets` L383-415 | – | – | modify | Appointments generator | S |
| Claim link, Insurance paid, Patient owes columns | F9.1 | 3 columns + "View claim" | `invoiceColumns` L495-690; export L480-489 | `ClientInvoice` props | – | modify | – | S |
| Payments tab breakdown | F9.1 | replace 4 metric cards | `InvoiceDetailDrawer.tsx` L929-955 | derived from claim + payments | `update_invoice_from_claim` | modify | – | M |
| Statement / payment-plan sections | F9.2/4 | draggable sections | Overview sections L76-125 | payment-plan table | A27, A28 | new | `DEFAULT_INVOICE_SECTIONS` | M |
| ERA/insurance payment with claim link | F7 | claim id + adjustment lines | `RecordPaymentModal` L111-138, L282-330 | `Payment.claimId` | – | modify | existing insurance type | M |
| Insured-visit invoice stays Draft/estimate until adjudication | F9 | per A27 | invoice process | – | A27 | modify | `createInvoiceFromAppointment` | M |

### 3.10 Tasks (queues) — `/tasks` — `Tasks.tsx`, `TaskDetailPage.tsx`, `tasksStore.ts`, `types/task.ts`

Facts: table only (no board/saved views); workflow switcher in `PageTopBar` leftElement (~L592-670); filters in `filteredTasks` (L191-235); `TaskQuickCreateDrawer` (3063 lines) is mid-edit — **edit last**; `task.*` events never emitted.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Extract mutators to plain module functions; collision-safe ids; emit `task.created/completed/overdue` | N6 | – | `tasksStore.ts` L851-1027 | – | `create_task` action | modify | existing functions | M |
| New fields (`entityRef`, `taskType`, `queueId`, `priority`, `dueAt`, `payerId`, `amountAtStake`, `source`, `closedBy`) | §7 | – | `types/task.ts`; `migrateTaskEntity` L675 | `TaskEntity` | – | modify | – | M |
| **Queue selector + saved views** (§3.0.7) | §8 | chips/dropdown + "Save view" | `Tasks.tsx` leftElement + predicate in `filteredTasks`; `PageTopBar.onSaveFilter` (L98) | new `taskViewsStore` | – | new | `PageTopBar` | M |
| Columns: Queue, Linked record, Priority, Due, SLA, Amount | §8 | table columns | `Tasks.tsx` L237+ | – | – | modify | – | S |
| **Linked-record card** (opens client Insurance tab / process drawer / claim / invoice) | §8 | card | `TaskDetailPage.tsx` L327→L334 | `entityRef` → route map | – | new | – | M |
| **Auto-close on stage exit** | D3 | subscriber (no UI; badge "auto-closed") | init with the engine (`ruleEngine.ts:1043-1055` / `main.tsx:5`) | `stage.exited` w/ FROM process (N7) | – | new | `eventBus.subscribe` | M |
| `create_task` action | D3/D4 | action + params block | registration points (Q5) | `tasksStore` | all queue rules | new | generate_invoice pattern | M |

### 3.11 Process (Workflows) and Automation — `/process`, `/automation`

| Spec feature | Spec ref | UI element | Placement | Data / store | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|
| **Claim tab with 3 workflows** (Add/rename/delete allowed) | D1 | add `claim` tab (map claim→this tab; tab label "Insurance & Claims"); show all processes of the entity | `ENTITY_TABS` L1113-1119; L1068/1091/1105; `clientVisibleProcesses` L1158-1187; `handleAddProcess` L2817-2830; delete guard L2928 | `useProcessStore` | modify | existing tab pattern | M |
| Persist claim workflows; per-process required categories; stop insurance overwrite touching claims | G2/G8 | – | `useProcessStore.ts` L1340-1364, L1483-1491, L1562-1580, L381-388, L869-937 | `Process.requiredCategories` | modify | – | M |
| **Load RCM starter templates** (processes, stages, rules, task views, templates) — idempotent, never overwrites edits | D4 | button | Process page header + Automation page | seed functions | new | `DEFAULT_ENTITY_PROCESSES`, default-rule seeding | L |
| Custom stages pick a "behaves like" category (optional) | G8 | select in Add Stage | `handleAddStage` L3317-3416 | `Stage.systemCategory` | modify | existing form | S |
| New actions (14, §3.0.5): catalog, params blocks, executors | G7 | action cards + params | `StepCatalogDrawer`, `AddAutomationDrawer`, `STEP_ALLOWED_TRIGGERS` ×3, `StepParametersFields`, `ruleEngine.ts` L422+ | – | new | `generate_invoice` pattern | L |
| Events: add `coverage.*`, `claim.*`, `era.*`, `denial.*`, `balance.*`, `task.*` to **both** catalogs (`EVENT_CATALOG` L189-234; `GLOBAL_TRIGGER_CATALOG` `types/automation.ts` L93-150) | §6 | – | stores | – | modify | – | M |
| Fix ruleEngine: record-type dispatch (L398-411), step-level move validation, cross-workflow cycle check, client emits (N1/N7/N11/N15) | G6 | – | `ruleEngine.ts`, `useAutomationStore.ts` | – | modify | `validateRuleEntityTarget` | L |
| Health + Retry for failed actions; generalized Undo | R5 | button/badge | Automation table | `AutomationRule.health` | new/modify | – | M |
| **"Run daily jobs now"** | §6 | button | Automation page header | `rcmJobs.runDaily()` | new | – | S |

### 3.12 Chats, voice, settings, notifications, reports, roles

| Screen / feature | Spec ref | Change | Placement | Status | Effort |
|---|---|---|---|---|---|
| **Chats** — 4 templates (estimate, statement, payment link, missing-insurance) + variables `billing.*`, `insurance.*`; shared variable list; `resolveTemplateVars`; mock-dispatch for `send_message` | §2 | `templateLibrary.ts` L19+; hard-coded `<select>` `Chats.tsx` L3350-3373; `ruleEngine.ts` | modify/new | M |
| **AI Receptionist / voice** — `callPurpose` (payer benefits on *Inconclusive*; balance reminder on invoice *Reminder 2*) in stage call settings; UI-only mock call result → *Pending review* | F3, F9.3 | `CallTriggerDrawer.tsx` (`CallTriggerSettings`, `useProcessStore.ts:27-66`); Call Logs (`CallLog` L27-43) | modify | M |
| **Settings › Billing setup** — billing entity, locations + POS, payers + enrollment, fee schedules, claim defaults, scrub rules, clearinghouse link; own file `BillingSetupTab.tsx`; not the SaaS "Billing" tab | §2 | `tabs` array (L3850 ✔) + routing effect L735-837 + titles L4084-4140 + render near L8098; **`SettingsGuard` is SystemAdmin-only** (spec gives Practice manager Yes) | new | L |
| Provider credentials (NPI, taxonomy, license) | §7 | `ManageTeamMember` tabs (L84) + `TeamMemberDrawer` + `teamStore` | modify | M |
| **Integrations** — clearinghouse card (eligibility, claims, ERA; mock adapter, scenario picker) | §1/§2 | new category in `integrationsRegistry.ts` (L7, L74-178) **and** Settings' local `Integration` union (L368, L3144, L3226, L7769-7830); `IntegrationConfigDrawer.tsx:261` maps `rcm`→`invoice` | modify | M |
| **Notifications** — per-event toggles (rejections, denials, auth expiry, unmatched ERA, deadline near) | §2 | `NotificationsSettingsTab`, `notificationSettingsStore` (module-level only today) | modify | M |
| **Reports** — sources `claims` (by workflow/stage), `denials`, `payments`, `ar_aging`, `eligibility` (from client-process history) | §2 | `ReportDataSource` (`invoiceTypes.ts`), `reportEngine.ts` L11, `InvoiceContext.getReportRows` L915 (real rows, not the mock), `CustomReportBuilderModal` L225-249/L532-534, `Reports.tsx` L158-168 | modify | M |
| **Roles/permissions** — `billing` module + capability matrix; role strings Provider/Coder/Biller; per-tab settings guard | §8 | `types/permissions.ts`, `settings-constants.ts`, `RolesPermissionsDrawer.tsx` L39-51 (already lists `billings` — align), new `rcmPermissions.ts` | modify | M |
| **Audit** — view/edit of coverage, claim, payment | §8 | `auditLogsStore.ts` (admin modules only) add `Billing`/`PHI Access` | modify | S |
| **Patient portal** `/patient/bill`, `/pay`, `/profile` — claim-adjusted balance + plan; payment-link target; coverage editor for A5 | F9 | existing screens | modify | M |
| **Sidebar** — no Insurance item; keep "Insurance & Claims"; (if RCM Home becomes a page) one item | §2 | `DEFAULT_SIDEBAR_CONFIG` v9→v10 + migration, `sidebarTemplateStore.ts`, `ConfigureMenuModal` `ICON_MAP` (L75 ✔) | modify | S–M |
| **RCM Home** — decision (Q-R1): Overview row (queue counts from Task saved views + KPIs from claim stages/invoice) vs new page | §2 | `Overview.tsx` after L383 (row) | open | M |

---

## 4. Cross-checks

### 4.1 Feature coverage

| Spec item | Where the user sees/triggers it |
|---|---|
| F1 Booking with insurance | Schedule drawer §3.1; patient portal booking (NC); voice (UI-only) |
| F2 Eligibility + resolver | Schedule drawer; Appointments chip; detail drawer; Deals board + process drawer; Integrations (mock adapter) |
| F3 Voice payer call | stage call settings (*Inconclusive*); Call Logs; process drawer (*Pending review*) |
| F4 Check-in & collection | detail drawer; kiosk; `RecordPaymentModal` |
| F5 Visit → claim | AI Scribe Codes/Sign; Claims › Charge capture |
| F6 Scrub & submit | Claims › Claim workflow; Billing setup › Scrub rules |
| F7 Remittance & posting | Claims "Post payments" + Payments section; Tasks (Posting) |
| F8 Denials | Claims › Denial & appeal board + drawer |
| F9 Patient balance | Invoices; client Billing tab; portal; Chats |
| P1+P2 | client process on Deals/Process; P3 Charge capture; P4 Claim; P5 Denial & appeal; P6 Invoice stages |
| A1–A30 | §3.0.5 (each = a starter rule; results visible on the pages named there) |
| 8 queues | Tasks saved views (§3.0.7) |
| Roles (10 capabilities) | enforced via `rcmPermissions.ts` at coverage edit/Verify (Schedule drawer, client Insurance tab), accept voice benefits (process drawer), accept codes (Scribe; Provider own visits), claim create/edit/submit (Claims), post payments (Post payments), denials/appeals (Denial workflow), write-offs (*Written off* moves), collect payments/plans (drawer/kiosk/Invoices), billing setup (Settings tab), RCM reports (Reports/Overview) |

**Spec items with no page/record:** ERA/remittance as a record (claim child table + modal); payer-enrollment record (Billing setup › Payers; Enrollment queue links there); A5 patient insurance form page; P6 "Estimate shown" (invoice Draft); A10–A12 slice (assigned 2 and 5). **RCM UI on main the spec doesn't ask for:** none required (dead `CreateClaimDrawer` to be removed).

### 4.2 Data coverage — spec §7 entity → store

| Entity | Store / where |
|---|---|
| Client additions, Coverages | `clientsStore.ts` (typed) |
| Team member / Organization / Location / Payer / Payer enrollment / Fee schedule | `teamStore.ts`; **new** reference stores (`billingEntityStore`, `locationStore`, `payerStore`, `payerEnrollmentStore`, `feeScheduleStore`) |
| Appointment additions | `appointmentService.ts` (`Appointment.coverage`, ids) |
| Service additions | `servicesStore.ts` |
| Invoice additions, Payment plan | `invoiceService.ts` / `invoiceTypes.ts` (child table) |
| Task additions, queues | `types/task.ts`, `tasksStore.ts`, **new** `taskViewsStore` |
| Eligibility check, Benefit line, Authorization | **client process fields + child tables on the `callLogs` row** |
| Encounter / dx / procedure, Claim line, Claim event, Remittance/adjustment, Denial | **`Claim` properties + child tables**; claim event = activity + stage log |
| Claim | `claimsStore.ts` (+ `processId`) |

### 4.3 Conflicts and recommended resolutions

| # | Conflict | Evidence | Recommendation |
|---|---|---|---|
| C-1 | Claim processes deleted at load; claims use insurance stage ids; `clm-*` vs `ins-*`; seeds have no stage | Q4, N12 | Persist 3 claim workflows; add `Claim.processId`; one-time migration of stage ids and seeds |
| C-2 | Required categories per entity vs three workflows | `useProcessStore.ts:381-388` | Per-process `requiredCategories`, minimal defaults; services tolerate missing categories |
| C-3 | Spec/PRD "one process per entity" vs decision D1 and current code (multi-process allowed) | `saveStoredProcesses` L1562-1580 | Follow D1; PRD update later |
| C-4 | Client moves don't emit events; `moveClientToStage` overwrites `client.stage`; 4 stage stores | Q1/Q2, N1/N4 | Route client-process moves via `logStageMove`; eligibility process writes only its own stage + deal row |
| C-5 | `stage.exited`/`StageMove` carry only the TO process; rule moves lack `fromStageId` | N7 | Add FROM process; supply `fromStageId` everywhere |
| C-6 | Stage rule may fire twice; service + `logStageMove` double-emit; check-in double emit | N15 | Emit once inside `logStageMove`; single check-in owner |
| C-7 | Field values drawer-local for claim/invoice/appointment | G12 | Properties on records; client-process fields already on the `callLogs` row |
| C-8 | Claim sections lack workflow scoping (NC) | N13 | `workflowIds` on claim sections/fields |
| C-9 | Engine gives no record context; `fieldupdate` persists nothing | Q1/Q3 | `resolveRecordContext` + new persisting executors |
| C-10 | Required-at-stage: client fields only; table with a blank row counts as filled | Q3, N16 | Generalize; empty-row check |
| C-11 | `validateRuleEntityTarget` entity-only/legacy-only; cycle check process-blind | Q4 | Validate step-level moves; cross-workflow cycle detection |
| C-12 | Claims page presets/status enum vs stages; no claim report source; `processes` report rows mock | N10 | Stage-based presets; new report sources; real rows |
| C-13 | Spec roles don't exist; `canDoAction` unenforced; `/settings` SystemAdmin-only; live sidebar has no roles | `AuthContext.tsx`, `SettingsGuard.tsx` | Map Reception→Front desk, Manager→Practice manager; add Provider/Coder/Biller; capability hook; per-tab settings guard |
| C-14 | `insurance` entity process becomes unused | G3 | Retire or leave dormant; stop the overwrite rule (L1346-1364) |
| C-15 | Spec: invoice after adjudication vs invoice at booking | `invoiceService.ts` | Insured visit invoice stays Draft/estimate until A27 updates it |
| C-16 | Spec wants a pillar/11 screens; live sidebar flat | §7 deltas | Not needed (screens are Deals/Claims/Tasks views) |
| C-17 | Progress report overstates | G13 | Update after Slice 1 |

### 4.4 Navigation — final sidebar (live model; no Insurance item)

Roles: **FD** Front desk (Reception) · **PR** Provider · **CD** Coder · **BL** Biller · **PM** Practice manager (Manager) · **AD** Admin. The live sidebar has no role filter; visibility is enforced by route guards + `rcmPermissions.ts`.

```
Overview  (+ RCM row if chosen: queue counts, KPIs)        all (row: BL● PM● AD●)
WORKSPACE
  Contact (Insurance + Billing tabs)       FD● PR○ CD○ BL● PM● AD●
  Call Logs                                FD● BL● PM● AD●
  Chats                                    FD● BL○ PM● AD●
  Process (Deals — incl. "Coverage & authorization" board)   FD● BL● PM● AD●
  Tasks (queue saved views)                all (queues filtered by role)
  Appointments (coverage chip/panel)       FD● PR● CD○ BL○ PM● AD●
  AI Scribe (Codes, Sign)                  PR●(own) CD● BL○ AD●
REVENUE & INSIGHTS
  Product & Services                       FD○ BL● PM● AD●
  Invoice (balance stages)                 FD● BL● PM● AD●
  Insurance & Claims (workflow selector, boards)   CD●(codes) BL● PM○ AD●
  Reports (RCM sources)                    PR(own)● BL● PM● AD●
CUSTOMIZATIONS
  Workflows (client process + 3 claim workflows + invoice stages) / Automation (rules, starter templates, "Run daily jobs now") / Knowledge Base / Webforms   PM● AD●
SETTINGS
  Billing setup [new]                      PM● AD● BL○   ← per-tab guard needed
  Organization, Team, Integrations, Audit Logs, AI*, Sections/Fields   AD●
  Billing (SaaS)                           AD●
  Notifications                            all (own prefs)
```

---

## 5. Build plan by slice

Spec slices rebased on D1–D4. Estimates are front-end engineer-weeks (**inference**): **6–7 / 3–4 / 5–6 / 4–5 / 2–3 = 20–25** (Rev 2: 5–6 / 4–5 / 5–6 / 4–5 / 2–3). Slice 1 grows (multi-workflow claims, task extraction + saved views, action framework, template seeding); Slice 2 shrinks (no Insurance page/store).

### Slice 1 — Engine and data foundation (start here) — **6–7 wks**

- **Pages touched:** Process (§3.11), Automation, Tasks (§3.10), Settings › Billing setup, ManageTeamMember, Client profile (Insurance tab + typed fields), Integrations card, Deals (process config only), Claims (workflow selector skeleton), sidebar.
- **Stores/types:** new `src/lib/claimService.ts`, `taskViewsStore.ts`, `rcmJobs.ts`, `rcmPermissions.ts`, `resolveRecordContext` helper, `starterTemplates.ts`, reference stores (`payerStore`, `payerEnrollmentStore`, `feeScheduleStore`, `billingEntityStore`, `locationStore`, `claimDefaultsStore`); changed `useProcessStore.ts` (persist claim workflows, `requiredCategories`, overwrite rule), `claimsStore.ts` (`processId`, properties, migration), `useAutomationStore.ts` (`StageMove.fromProcessId`, validation, Undo, events), `ruleEngine.ts` (dispatch, `create_task`, `move_to_workflow`, record context), `clientsStore.ts`/`clientProcessState.ts`/`ClientProfile.tsx` assign (emit via `logStageMove`), `tasksStore.ts`/`types/task.ts`, `appointmentService.ts` (`coverage`, `clientId`), `FieldRegistryContext.tsx` (fields/sections incl. `workflowIds`), `processFieldValidation.ts` (table emptiness; claim fields).
- **Events/actions:** register events; implement **`create_task`** (+ auto-close subscriber) and **`move_to_workflow`** first; register the rest as stubs.
- **Mock data (spec §9):** 15 payers; 3 providers with NPIs; 1 billing entity; 2 locations (POS 11); 40 patients with typed demographics + coverages (from `canonicalClients` where `contactType === "Client"`); default + one payer fee schedule; payer auth rules for 2 services.
- **Ordered tasks:**
  1. `useProcessStore`: persist claim processes, add claim to ensure/save lists, claim tab + multi-process list/add/delete in `Process.tsx`; `requiredCategories`; stop insurance overwrite for claims.
  2. `Claim.processId` + migration (seeds get stages; ids mapped; fix `mantra_claims_v1` vs `claims_<orgId>`).
  3. `StageMove.fromProcessId`; exit events with FROM process; supply `fromStageId` everywhere; single emission (N7/N15).
  4. Client-process moves (assign, `moveClientToStage`, `setClientProcessStage`) via `logStageMove`; keep `client.stage` untouched for non-primary processes (N1/N4).
  5. `claimService` (one door) + `moveClaimToWorkflow`; claim branch in ruleEngine and Undo.
  6. Tasks: extract mutators, `entityRef`, queue/priority fields, `taskViewsStore`, queue selector, linked-record card, auto-close subscriber.
  7. Starter-template seeding (processes, stages, rules disabled by default, task views).
  8. Registry: client-process fields + history table; claim sections by workflow; typed client fields; Coverages table.
  9. Billing setup + provider credentials; permissions + audit modules; sidebar v10.
- **Demo script:** Load RCM starter templates → Process › Insurance & Claims shows 3 claim workflows → open a claim, **Move to workflow… › Denial & appeal** (same record; history shows both workflows; Undo works) → in a rule, `create_task` on a client-process stage creates a task in the **Insurance fixes** view; drag the client out of the stage on Deals → task auto-closes.
- **Effort:** 6–7 wks.

### Slice 2 — Eligibility on the client process — **3–4 wks**

- **Pages touched:** Schedule drawer (§3.1), Appointments list/calendar (§3.2), detail drawer (§3.3), Deals/process drawer (§3.5), client profile, check-in desk (§3.4), Chats templates, Notifications. **No new page.**
- **Stores/types:** `mockClearinghouse.ts` (scenario registry with **AAA-style reason codes**; none exist in main today), `eligibilityResolver.ts` (code → category → action; pure + vitest), `benefitNormalizer.ts`, `resolveTemplateVars.ts`.
- **Actions/automations:** `run_eligibility`, `send_message` (mock dispatch), `notify`; starters **A1–A10, A13** (A2/A9 via the jobs button).
- **Mock data:** one scenario per seeded payer — active, inactive, member-not-found, DOB mismatch, provider not enrolled, payer down, inconclusive (+ other-plan redirect).
- **Ordered tasks:** adapter + resolver tests → `run_eligibility` executor (context resolution, dedupe, history row, appointment `coverage`, result→stage map) → process fields/table + Deals board verified → appointment chip + detail panel → Schedule drawer Coverage section + auth warning → A4–A8 queue rules + task views → jobs button A2/A9 → templates/variables → front-desk Check-in + A13 → kiosk steps (may slip to Slice 5).
- **Demo script:** book an appointment for a "member not found" payer → client enters *Needs fix* on the Deals board; chip amber on Appointments; task appears in **Insurance fixes** → fix coverage on the client Insurance tab → re-run → *Verified*, chip green, task auto-closed → detail drawer shows copay/deductible/estimate and history table → switch scenario to inactive → red chip + task + patient message in Chats.
- **Effort:** 3–4 wks.

### Slice 3 — Visit to claim — **5–6 wks**

- **Pages touched:** AI Scribe (§3.7), Claims (§3.8), Invoices (claim link/columns), client Billing tab, Settings (fee schedule, scrub rules, claim defaults), Services (multi-CPT), Appointments Completed action.
- **Stores/types:** `claimBuilder`, `scrubber` (10–15 rules), `mockClaimSubmission` (999/277CA), `cptCodes.ts`, scribe sign/lock fields, claim child tables, shared `PipelineBoard`.
- **Actions/automations:** `create_claim`, `scrub_claim`, `submit_claim`; starters **A14–A20** (A14 with its 3 timing variants; A15/A18/A19 jobs).
- **Mock data:** ophthalmology codes (92004, 92014, 92083, 76519, 66984 with RT/LT), fee schedule, scrub rules, one 277CA rejection.
- **Ordered tasks:** `create_claim` idempotent + minimum-data flags → Claims workflow selector/board/columns → Scribe sign + Codes panel (fix J06.9) → per-workflow drawer sections → builder reads billing entity/NPI/POS → scrubber → submit mock + rejection → required-at-stage for claim fields → A14–A20 starters + task views (Claim fixes) → Invoices claim link.
- **Demo script:** complete an eye-exam appointment → claim appears in **Charge capture › Awaiting note** → sign the note, accept codes (RT/LT) → claim moves to the **Claim** workflow (Draft) → scrubber flags a missing modifier (*Scrub failed*, task in **Claim fixes**) → fix → *Ready to submit* → run daily jobs → *Submitted* → one rejection → *Rejected* → fix/resubmit; change the starter rule to create the claim at scribe signing and show it works without code.
- **Effort:** 5–6 wks.

### Slice 4 — Money back — **4–5 wks**

- **Pages touched:** Claims (Post payments, Denial & appeal board, appeal draft), Invoices (balance stages, statements, plan), patient portal, Chats, Call Logs, Notifications.
- **Stores/types:** ERA staging + generator (10 ERAs), CARC/RARC→category table, `appealDrafter` (canned AI-propose; the Anthropic SDK is a dependency but unused today), payment-plan table.
- **Actions/automations:** `post_remittance`, `update_invoice_from_claim`, `draft_appeal`, `check_claim_status`, `start_call`; starters **A21–A30**.
- **Mock data:** 10 ERAs — paid, partial, denied (CO-97, CO-16, PR-1, CO-50), unmatched.
- **Ordered tasks:** remittance model → matcher/auto-post (A22) → unmatched task (A23) → underpayment (A24) → denial hand-off via `move_to_workflow` (A25) + categorize/deadline → `draft_appeal` → A27 invoice update/statement → reminders (A28/A29) → Overdue job (A30) → portal balance/plan.
- **Demo script:** "Receive ERA" → payments post, one line denies (CO-97) → claim moves to **Denial & appeal › New denial** (task in **Denials and A/R**) → draft appeal → *Appeal submitted* → another claim paid → invoice becomes *Sent* with payment link → advance clock: *Reminder 1/2* → payment plan.
- **Effort:** 4–5 wks.

### Slice 5 — Overview, reports, prior-auth polish, voice UI — **2–3 wks**

- **Pages touched:** Overview (RCM row, if chosen), Reports, Deals/process drawer (auth fields), Call Logs, `CallTriggerDrawer`, kiosk (if deferred).
- **Automations:** A11, A12 (assigned here); `start_call` UI-only.
- **Ordered tasks:** KPI selectors → Overview row (or page) → auth stages/fields polish → report sources → `callPurpose` + mock call result → kiosk steps → "Mock data" banner + audit entries.
- **Demo script:** manager's view: queue counts + KPIs → open **Prior auth** view → renew → run jobs → Reports (denial rate by payer) → *Pending review* from a mock voice call → accept.
- **Effort:** 2–3 wks.

**Total 20–25 wks.** Slices 1–2 (≈9–11 wks) validate the core experience.

---

## 6. Open questions (only the real remaining ones)

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q-R1 | RCM Home: new page or Overview row? | page / Overview row | **Overview row** (queue counts come from Task views; KPIs from claim/invoice) — add a page later if needed |
| Q-R2 | Eligibility on a client process gives **one process record per client** (history in a table). Is "latest result per client" acceptable for Deals, or do you need one card per appointment? | one card/client + history table / extend `callLogs` to multi-instance (touches 4 stores) | One card per client + history table (N3) |
| Q-R3 | The old `insurance` entity process/tab: retire or keep dormant? | retire after migration / keep | Retire after claims migrate; keep the "Insurance & Claims" **label** for the claim tab |
| Q-R4 | Per-process required categories — which (if any) are mandatory for the Claim workflows? | none / `submitted`+`paid` / today's draft/submitted/paid/denied | `submitted` + `paid` for *Claim*; none for the other two (D4) |
| Q-R5 | Should eligibility moves be allowed to touch the single `client.stage` (N4)? | never / only when the process is the client's primary | Never; write only the per-process stage + deal row |
| Q-R6 | Who may open **Billing setup**? (`SettingsGuard` SystemAdmin-only; spec gives Practice manager Yes) | per-tab guard / host under another route / SystemAdmin only | Per-tab guard keyed to `rcmPermissions` |
| Q-R7 | Auto-close semantics: mark task **completed** or a distinct "auto-closed" state? | completed + `closedBy:"auto"` / new status | Completed + `closedBy` |
| Q-R8 | Section/field scoping per workflow for claim drawers (N13): add `workflowIds` to registry sections/fields? | yes / use `requiredStages`-style names | `workflowIds` (NC how scoping works for claim module today) |
| Q-R9 | Role mapping: spec Front desk/Provider/Coder/Biller/Practice manager vs code `Reception/Manager/Admin/SystemAdmin/Agent` | add strings + map / rename | Add Provider/Coder/Biller strings; map Reception→Front desk, Manager→Practice manager |

*Items closed by your decisions (no longer questions): singleton enforcement, claim-pipeline length/denial entity, prior auth as entity vs stages, queues as stage groups vs tasks, Insurance page, insured-visit invoice timing (kept as starter A27).*

---

## 7. Spec deltas (`docs/rcm-flow-spec.md.md` differs from these decisions — spec not edited)

| # | Spec location | Spec says | Revision 3 |
|---|---|---|---|
| 1 | Header / §2 | New sidebar pillar "Revenue Cycle" | No pillar; RCM lives in Deals, Claims, Tasks, Invoices, Appointments, Client profile |
| 2 | §2 table | 11 new screens (Eligibility worklist, Prior auth list, Charges to review, Claims, Rejections, Denials board, Payment posting, A/R follow-up, Patient balances, reports, RCM Home) | Deals board / Claims workflows / Tasks views / Invoices stages; RCM Home = Overview row (Q-R1) |
| 3 | §4 intro | "Six pipelines… replace the current default Insurance and Claims and Claim processes" | One client process + three claim workflows + invoice stages; the old `insurance` process is retired (Q-R3) |
| 4 | §4 P1 | "entity: eligibility check, one per appointment" | Client process; one record per client; per-appointment history table |
| 5 | §4 P2 | Authorization is its own entity/pipeline | Stages of the client process; auth data are process fields |
| 6 | §4 P3 | Charge capture entity: **encounter** | Claim workflow "Charge capture"; no Encounter entity |
| 7 | §4 P5 | Denial entity (one per denied claim or line) | Claim workflow "Denial & appeal"; line detail in the Lines table |
| 8 | §4 intro | "Stage names map to a fixed system status… explicit mapping table" | Starters are editable; `systemCategory` optional; minimal per-process required categories |
| 9 | §4 P1 stages | Stages "Not checked/Checking/Self-pay" alongside status values | Stage = state; no separate status enum |
| 10 | §5 F2.7 | Auto-run a second check for another plan | `run_eligibility` parameter (follow other payers) |
| 11 | §5 F5.3 | Claim created after codes accepted; "Charge capture → claim" is a fixed step | Claim-creation timing is the clinic's automation (`create_claim`, any trigger; 3 starter variants) |
| 12 | §6 intro | "26 new events and 4 new rule actions" (`create_task`, `run_eligibility`, `create_claim_from_encounter`, `start_call`) | 14 generic, configurable actions (§3.0.5); `create_claim` replaces `create_claim_from_encounter`; eligibility/auth are client-process stage events |
| 13 | §6 events | `eligibility.*`, `auth.*`, `encounter.*`, `denial.deadline_near`, `era.*`, `balance.*` | `coverage.*`, `claim.*` (incl. `note_signed`/`coded`), `era.*`, `denial.deadline_near`, `balance.*`, `task.*`; claims use main's event prefixes |
| 14 | §6 catalog | A1–A30 are the automations | Same 30 as **editable starter rules** (not enforced flows) |
| 15 | §6 A4–A8, A17, A20, A23–A24, A30 | `create_task` items | Same — via the `create_task` action with auto-close (D3); **A10–A12 are in no spec slice** |
| 16 | §6 note | Daily triggers via a "Run daily jobs now" button in RCM Home | Button on the **Automation** page header |
| 17 | §7 additions | Appointment `latestEligibilityCheckId` | `Appointment.coverage {status, stageName, checkedAt, summary}` |
| 18 | §7 new entities | 16 entities incl. Eligibility check, Benefit line, Authorization, Encounter (+dx, procedure), Claim event, Remittance(+claim, adjustment), Denial, Payment plan | Fields/child tables on the client process, the Claim (by workflow), the Invoice; claim event = activity timeline; **no Encounter/Denial/Authorization/Insurance entities** |
| 19 | §7 Claim | `encounterId` required | Claim holds its own visit data (Visit section); `appointmentId` link |
| 20 | §7 Eligibility check | one row per check with `coverageId`, `appointmentId` | History-table row |
| 21 | §8 queues | "saved, filtered view of Tasks" | **Consistent** (D3) — needs the saved-view store and `entityRef` that main lacks |
| 22 | §8 roles | Add a Billing module to `types/permissions.ts` | Same, plus a static capability matrix (`rcmPermissions.ts`) since `canDoAction` is unenforced |
| 23 | §9 decisions | Build on `rcm-2`; port eligibility drawer from `rcm`; insurance model choice; remove vendor branding | **Not applicable** — `main` only; no branch code used |
| 24 | §9 slices | Slice 2 = Eligibility worklist; Slice 4 includes denials board; no home for A10–A12; estimates 3–4/3–4/4–5/4–5/2–3 | Slice 2 = client process + chip/panel (no worklist page); denial board = Claims workflow; A10 in Slice 2, A11–A12 in Slice 5; estimates 6–7/3–4/5–6/4–5/2–3 |
| 25 | Spec file | named `rcm-flow-spec.md.md`, untracked | rename + commit |

---

*What I did not verify:* anything at runtime (nothing was built or run); whether a stage rule really fires twice per client move (Q1, NC); whether a non-hook reader for the field registry exists (Q3, NC); claim-module section scoping per workflow (N13, NC); `createAppointment` automation gating (N14, NC); which invoice stages are actually stored (§3.0.4 C, NC); the exact effect of eligibility moves on `client.stage` in practice (N4, NC).

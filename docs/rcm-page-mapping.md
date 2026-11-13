# RCM Page-by-Page Mapping — Revision 4 (architecture and capabilities)

> Planning document only; no application code was changed. Previous versions: `docs/rcm-page-mapping.rev2.md`, `docs/rcm-page-mapping.rev3.md`. Inputs: `docs/rcm-flow-spec.md.md` (misnamed, untracked; spec sections: §2 Where RCM lives, §3 flow, §4 Pipelines P1–P6, §5 Flows F1–F9, §6 Automations A1–A30, §7 Fields, §8 Queues/roles, §9 Slices), the Entity Workflows PRD, `IMPLEMENTATION_PROGRESS_REPORT.md`, and the `main` working tree (uncommitted edits to task files, `useProcessStore.ts`, `Process.tsx`). Only `main`'s pages, UI and entity-wise workflow structure are used.
> **Verification:** I read the PRD, the progress report and `useProcessStore.ts` (types L85-204, required categories L381-388, defaults L725-818) directly (✔); everything else is from explorer reads of the working tree. Nothing was built or run. Line numbers are approximate — re-confirm before editing. **NC** = needs confirmation.

## Framing — read this first

This document describes **architecture and capabilities**, not a fixed flow. The system must let a clinic **build its own pipelines, stages, automations and queues**. Every stage set, rule, queue, process, field group and role named below is a **SAMPLE template** for understanding and demo; **none is enforced**, any can be edited, deleted or replaced, and no service may depend on a specific stage *name*. Where a stage set or rule list appears, it is labelled **Sample**. The capabilities that *are* fixed are the generic building blocks: pipelines/stages, multi-instance processes, configurable actions, field groups, tasks with saved-view queues, and permission keys.

### Decisions (final, from the product owner)

| # | Decision | Effect |
|---|---|---|
| D1 | Multiple workflows per entity. Claim entity (`/claims`, "Insurance & Claims") ships three **sample** workflows: Charge capture, Claim, Denial & appeal. A record moves between workflows with `move_to_workflow` (same record) | Persist several claim workflows; `Claim.processId`; per-process required categories |
| D2 | Eligibility and prior auth are **automation nodes (actions)**, not stages or entities: `run_eligibility`, `check_auth_required`, `request_prior_auth` can be placed on any stage-entry or event trigger of **any** pipeline (client process, appointment, claim, invoice). Each writes its result to a **clinic-configured target** (the record it runs on, a linked appointment, or a client-process instance) and appends a history row. "Coverage & authorization" is only a sample process. **No Insurance entity, no Insurance page** | Field groups + registry registration; cross-record writer |
| D3 | Work queues = **saved views of Tasks**; tasks created by `create_task`, linked by `entityRef` (with `instanceId` where the record is a process instance); auto-close when the linked record leaves the stage the task was created for. Each entity covers only its own journey | Task extraction, `entityRef`, saved-view store |
| D4 | Nothing hard-coded; actions generic/configurable; **A1–A30 are sample rules**; claim-creation timing is whatever the clinic's automation decides | Sample bundles seeded as editable rules |
| D5 | **Multi-instance processes.** A client can be in the same process many times, each with a unique `instanceId` (e.g. one eligibility instance per appointment). A new instance is created by an action (`start_process`/`assign_process`, made a real executor) with a **dedupe key** (clientId + processId + source record such as appointmentId). Automations run per instance and never look at earlier instances' stages. `run_eligibility` has a configurable dedupe window; a fresh verified result may be **copied** to a new instance instead of a new payer call; window 0 = always call. **Removes** the "one record per client" design, N3, Q-R2 and the appointment-linked auto-close workaround | Instance model + migration |
| D6 | Billing-setup access and role names are handled by the **existing Roles & Permissions module in Team**: add RCM permission keys to the existing model; clinics assign them to their own roles (sample roles optional). No hard-coded per-tab guard, no static `rcmPermissions` matrix | Permission keys; minimal guard change |
| D7 | RCM Home = a **row on Overview** (no new page, no sidebar item) | – |

---

## 1. Summary

1. **Capabilities, not a flow.** RCM = generic pipelines, multi-instance processes, 18 configurable actions, field groups, Task-view queues and permission keys; everything named (stages, A1–A30, queues, roles) is a **Sample**.
2. **Pages:** 15 existing screens touched; **0 new pages**; 1 shared component (stage Kanban board extracted from Invoices/Deals); RCM Home = Overview row.
3. **Verification (V1–V4, §3.0.0):** (V1) there is **no process-instance concept** — a client-in-process is a `callLogs` row found by client + process **name**, the Deals card is a `deals` row matched by `clientName` only, and process rows **leak into call lists**; the audit lists ≈33 sites that need `instanceId` (≈4.5–7.5 wks). (V2) Only process rows have a plain field writer; appointment/claim/invoice values are drawer-local; the field registry has **no non-React reader**. (V3) `canDoAction`/`canAccess` have **zero callers**, roles live in **sessionStorage**, `SettingsGuard` is hard-coded to SystemAdmin, and the Roles drawer **silently drops** its `billings` row on save. (V4) No prior-auth rules, payer store, coverage store or `Service.requiresAuth` exist.
4. **Gaps:** 37 gap rows (§3.0.2): 3 dropped/deleted (G1, G3, N3), 8 new (N17–N24: instance model, call-list leak, Deals name matching, cross-record writer + registry reader, permission gaps, prior-auth stores, field-group registration, rule run-order), the rest re-checked against D1–D7 (N9 is a one-line row folded into G8); the `start_process` executor is N5.
5. **Actions (§3.0.5):** 18 generic actions each with parameters, minimum data, idempotency key and Retry behavior; `run_eligibility` has a write-target and dedupe-window spec; `create_task` carries `instanceId`; A10/A11 use the prior-auth node.
6. **Effort (re-summed bottom-up, §5):** **42.0–55.5 front-end engineer-weeks** across 6 slices (Slice 1 = 9.0–11.0). Rev 3's 20–25 was a top-down figure that under-counted its own scope; of the +22.0–30.5 increase, ≈12.5–15.5 is new scope (D2/D5/D6) and ≈9.5–15.0 is the bottom-up recount.
7. **Biggest conflicts:** instance keying across 4 stores; Deals matches by `clientName`; process rows in call lists; drawer-local field values; roles unenforced; `moveClientToStage` writes the single `client.stage`.
8. **Spec deltas:** 30 listed in §7 (spec not edited).
9. **Closed questions:** Q-R1, Q-R2, Q-R6, Q-R9, and Q7 (roleId + email lookup adopted); **7 real questions remain** (§6).
10. **Recommended start:** Slices 1–3 together are the **first RCM demo (23.5–31.0 weeks)**: Slice 1 (instances, permission keys + roleId, event fixes, call-list separation, `start_process`), Slice 2 (Billing setup, Coverages, tasks + queue views, `recordWriter`/`fieldRegistryCore`, template loading) and Slice 3 (eligibility + prior-auth nodes). Slice 3's demo depends on Slice 2 items, so the slices are sequential, not parallel.

---

## 2. Page inventory

Sidebar = live `DEFAULT_SIDEBAR_CONFIG` (`SidebarMenuContext.tsx:38-96` ✔, v9). **`src/app/config/navigation.ts` is dead code** (no importer; its role arrays are not used by `Sidebar.tsx`). ● touchpoint · ○ indirect · – none. **No Insurance page; no RCM Home page or sidebar item.**

### 2.1 Clinic app (`ProtectedRoute` > `MainLayout`, `routes.tsx` 349 lines)

| Route | Component (lines) | Sidebar | Purpose today | Main stores | Spec |
|---|---|---|---|---|---|
| `/` | `Overview.tsx` (683) | WORKSPACE › Overview | Call/task dashboard | notificationsStore, tasksStore, call logs | ● **RCM row** (D7) |
| `/scribe` | `AIScribeConsole.tsx` | WORKSPACE › AI Scribe | Scribe sessions | scribeSessionStore (sessionStorage) | ● |
| `/clients`, `/clients/:id` | `Clients.tsx` > `ClientProfile.tsx` (4458) | WORKSPACE › Contact | Contacts; Processes tab | clientsStore, processLogsStore | ● |
| `/deals` | `Deals.tsx` (4169) | WORKSPACE › Process | Client-process kanban/list; required-fields gate | `deals`, `callLogs`, useProcessStore | ● (**card per instance**) |
| `/process` | `Process.tsx` (8004) | CUSTOMIZATIONS › Workflows | Entity tabs, stage editor | useProcessStore | ● |
| `/automation` | `Automation.tsx` (622) | CUSTOMIZATIONS › Automation | Rules table + `AddAutomationDrawer` | useAutomationStore | ● |
| `/tasks`, `/tasks/:taskId` | `Tasks.tsx`, `TaskDetailPage.tsx` | WORKSPACE › Tasks | Task table + detail | tasksStore | ● (queues) |
| `/appointments` | `Appointments.tsx` (1721) | WORKSPACE › Appointments | List/calendar(month)/availability; per-stage presets | appointmentService | ● |
| `/chats` | `Chats.tsx` (3874) | WORKSPACE › Chats | Inbox/templates (simulated) | useWhatsappTemplates | ● |
| `/invoices` | `Invoices.tsx` (1030) | REVENUE & INSIGHTS › Invoice | List + stage Kanban | invoiceService | ● |
| `/claims` | `Claims.tsx` (694) | REVENUE & INSIGHTS › Insurance & Claims | Claims list; stages from the first insurance process | claimsStore | ● |
| `/reports` | `Reports.tsx` | REVENUE & INSIGHTS › Reports | Report builder | reportEngine | ● |
| `/services` | `Services.tsx` | REVENUE & INSIGHTS › Product & Services | Catalog (1 CPT/service) | servicesStore | ○ |
| `/call-logs` | `CallLogs.tsx` (2300) | WORKSPACE › Call Logs | Calls — **currently also lists process rows** | callLogs | ○ |
| `/settings/:tab/:subtab`, `/billing*` | `Settings.tsx` (13,305) | SETTINGS (SystemAdmin-only via `SettingsGuard`) | Tabs incl. SaaS "Billing", Team › Roles | many | ● |
| `/settings/team/:id` | `ManageTeamMember.tsx` | SETTINGS › Team | Member setup | teamStore | ● |

Kiosk `/reception/*` → `AvatarReceptionView.tsx` (6736 lines). Patient portal `/patient/*` (`bill`, `pay`, `profile`, `status` relevant). `/admin/*` not RCM (platform RBAC `adminRolesStore.ts` is separate).

### 2.2 Screens that behave like pages

| Screen | File (lines) | Notes |
|---|---|---|
| Schedule appointment drawer | `appointments/ScheduleAppointmentDrawer.tsx` (1553) | `SectionCard`s Service L1313, Location L1334, Participants L1351, Schedule L1418; also mounted by `ActivityTab`, `ClientProfile` |
| Appointment detail drawer | `appointments/AppointmentDetailDrawer.tsx` (1294) | Tabs L782-787; `DraggableOverviewSections customFieldsModule="appointment"` L829; values in `mantra_appt_fields_<id>` |
| Process detail drawer | `deals/ProcessDetailDrawer.tsx` | Process-module fields, activity, history; re-finds its row by client + process **name** (L514-554) |
| Claim / Invoice detail drawers | `claims/ClaimDetailDrawer.tsx` (1140), `invoices/InvoiceDetailDrawer.tsx` (1185) | Registry sections; values drawer-local |
| Roles drawer | `settings/RolesPermissionsDrawer.tsx` | Hard-coded module list L39-51 |
| Stage primitives | `common/SegmentedStageBar`, `ChevronStageRibbon` | Used by all entity pages |
| Dead/orphaned (don't build RCM here) | `AppointmentCard.tsx` ✔, `MyAIReceptionist.tsx` ✔, kiosk `ScheduledCheckinPanel`/`WalkInBookingPanel`/`InvoiceQrPaymentModal`, `CreateClaimDrawer.tsx`, `TaskDetailDrawer`/`TaskContentSections` (NC) | |

---

## 3. Page-by-page mapping

### 3.0 Design basis (capabilities)

#### 3.0.0 Verification results

**Carried over from Revision 3 (still valid)**

| # | Finding | Evidence |
|---|---|---|
| Q1 | A client stage-entered trigger runs rule actions **only** when the move calls `logStageMove`: Deals drag (`Deals.tsx:1132`) and process-drawer stage change (`ProcessDetailDrawer.tsx:802`). **Nothing is emitted by** `clientsStore.moveClientToStage` (L313-381), `clientProcessState.setClientProcessStage` (L22-41), assign-process (`ClientProfile.tsx:1034-1127`), `Clients.tsx:931`, drawer handoff (`ProcessDetailDrawer.tsx:735-748`). Executable stepKeys: `condition` L426, `fieldupdate` L438 (in-memory only), `update_to_stage` family L468-475, `generate_invoice` L608, `generate_document` L766, `scheduleappointment` L965, `send_payment/send_invoice` L984-987; **all others silently ignored**. Context = `BusEvent {id,event,recordType,recordId,data?,orgId?,timestamp}` (`eventBus.ts:3-11`); no record is loaded. A stage rule may fire twice (`stage.entered` + `client.entered_stage`) — **NC** | `useAutomationStore.ts:551-594`; `ruleEngine.ts:157-246, 422-998` |
| Q3 | Process fields can be **tables** (`FieldInputType` L37-72; `FieldInputRenderer.tsx:528-640`; `DraggableOverviewSections.tsx:1055`) and **required at a stage** (`processFieldValidation.ts:38, 61`); a table with one blank row counts as filled (L22) | cited |
| Q4 | Claims have no `processId` (`claimsStore.ts:81-84`); claim processes deleted at load (`useProcessStore.ts:1340-1343`); `saveStoredProcesses` omits claim (L1562-1580); `ENTITY_TABS` has no claim tab (`Process.tsx:1113-1119`); only first claim/invoice process shown (L1180-1184); `Claims.tsx` loads insurance processes (L64-68), its process dropdown doesn't filter claims (L407-425); `ClaimDetailDrawer.tsx` uses `insProcs[0]` (L222-231); `REQUIRED_SYSTEM_CATEGORIES` per entity (L381-388); `StageMove`/`stage.exited` carry only the TO process (`useAutomationStore.ts:167-187, 577-583`); `validateRuleEntityTarget` entity-only (L290-343); `undoStageMove` no claim branch (L596-642); reports have no claim source | cited |
| Q5 | `createTask` is hook-bound (`tasksStore.ts:873-896`) but extractable; no `entityRef` (`types/task.ts` L119+); `stage.exited` only with `fromStageId` (`useAutomationStore.ts:577`); engine handles exit triggers (`isStageExitMatch` L185-187); non-React subscribe possible (`eventBus.ts:19-52`, engine init `ruleEngine.ts:1043-1055`, `main.tsx:5`); no saved-view persistence (`PageTopBar.onSaveFilter` L98 unused); no per-action idempotency (`ruleEngine.ts:295-300` in-memory, cap 2000) | cited |

**New in Revision 4**

| # | Question | Answer | Evidence |
|---|---|---|---|
| **V1** | What is keyed by clientId + process **name** and must move to `instanceId`? | **There is no instance concept.** A "process instance" is a `CallLog` row in `localStorage.callLogs` (`processLogsStore.ts:6-23`; `addProcessCallLog` L154-198 upserts by **clientId + process name**; id `PRC-<clientId>-<last 4 digits of Date.now()>` — can collide; no `processId`/`instanceId`/`kind`). It is told apart from a real call only by the `PRC-` prefix, so **`CallLogs.tsx` lists process rows** (L503-513, L1050-1062), as do `AppointmentDetailDrawer.tsx:660`, `CallDetailDrawer.tsx:347`, `Overview.tsx:174-176`. Name-keyed sites: `updateProcessCallLogStage` (L200-310: maps **all** matches, also writes `client.processStagesMap[name]`/`stage`, rewrites **every** `deals` row of that client whose stage starts with the process name, dispatches `patient_portal_client_changed`), `updateProcessCallLogFields` (L312-345; fallback creator `CALL-<PROCESS>` L328, not unique), `clientProcessState.ts:18-85` (sessionStorage `processStages[]`, replace-by-processId L36), `clientsStore.ts` (`processes: string[]`, `stage` last-writer-wins, `processStagesMap`, `moveClientToStage` L313-381 falls back to "Patient Care Journey" L330-355), Deals (`deals` rows `{id,dealName,clientName,stage:"Process: Stage"}` with **no clientId** L83-93; `getClientIdByName` falls back to **"CL-001"** L132-136; kanban drop L2802-2915; list/stage handlers L1707-1804; `setDeals(prev.map(d => d.clientName === …))` rewrites all of a client's deals L1754, L1791, L4035; `triggerStageMoveAutomation` `recordId: clientId||clientName` L1135), `ProcessDetailDrawer` (L274, L514-554, L559, L733-748 [activity `processId` is a name], L802-833, L854, L1433-1434), `ClientProfile` (process list builds a `Set` of names L1635-1730; Processes tab keeps only the last row per name L2478-2481; `handleConfirmAssignProcess` L1034-1127 updates the existing deal L1080-1086; stage clicks L1407-1419, L1549-1587; drawer L4215-4260), `Clients.tsx:918-960` (deal row `DEAL-<clientId>-<idx>` in sessionStorage), `mockMaClient.ts` (`syncDealRecord` by `clientName` only L1039; `addProcessCallLog` L795, L1119, L1489), patient portal (`PatientStatusScreen.tsx:268-310`, `PatientPortalLayout.tsx:218-231`), `activityEngine.ts` (`processId/processName`, no instanceId L18-35; name filter L287-293), test drawers (`TestProcessChatDrawer.tsx:77,110,158-164`, `TestWebsiteChatDrawer.tsx:158`). Not affected: `entityMigration.ts` (L116-120), tasks/notifications, `websiteChatSimulator`, `useCrmBindOptions`; no tests reference these. | cited |
| V1 cont. | Proposed model, migration, effort | **Model:** persist the process row with `kind:"process_instance"` (explicit discriminator, not the `PRC-` prefix), `instanceId` (= row `id` for new and backfilled rows so existing id-patches keep working), `clientId`, `processId`, `processName` (denormalized), stage, `source {type,id}`, `dedupeKey = clientId|processId|source.type:source.id`, `status`, `parentInstanceId?`. Add `instanceId`/`clientId` to `Deal`, `instanceId` to `ActivityBase` and `StageMove`. `client.processStagesMap` keyed by instanceId; keep the name-keyed map and `processes[]` as derived legacy mirrors (primary = most recent active instance); `client.stage` stays "latest moved", non-authoritative. **Migration** (idempotent, gated by `callLogs_schema_v2`, run where `getStoredCallLogs` already migrates L121-137, all key variants `callLogs`, `_demo`, `_<org>`): classify process rows; `instanceId = "PI-"+hash(clientId|processId)`; collapse duplicate (client, process) pairs to the newest; backfill `deals[].instanceId/clientId` (don't reuse `getClientIdByName`); backfill activity; keep name-based shims (`updateProcessCallLogStage/Fields` resolve to the primary instance and warn when >1); add `getCallsOnly()`/`getProcessInstances()` and move CallLogs, `AppointmentDetailDrawer:660`, `CallDetailDrawer:347`, `Overview` to `getCallsOnly()`. **Effort** 4.5–7.5 wks (store 1.0–1.5; Deals 1.0–1.5; drawer + profile 1.0–1.5; activity/StageMove/engine 0.5–1.0; reception/portal/test drawers 0.5–1.0; call-list separation + QA 0.5–1.0). **Risks:** missed `clientName` writers (cards move together), process rows in call lists, localStorage/sessionStorage/per-org key split, portal choosing the wrong instance, rule-driven `moveClientToStage` bypassing instances | explorer V1(b)–(d) |
| V1 cont. | Per-instance automations | Stage events must carry `recordId = instanceId` plus `data.instanceId/processId/stageId/clientId/source`; idempotency key `recordId:ruleId:event.id` (`ruleEngine.ts:295`) is then per instance for free (with `recordId = clientId` it would merge two instances). Change sites: `Deals.tsx:1135`, `ProcessDetailDrawer.tsx:802-805`, `ruleEngine.ts:368-372` and `:585-590`; the client mover resolves the client by `event.data.clientId||event.data.id` (L402-409, L553-566) and must resolve the **instance**. Recommend keeping `recordType` = entity of the process (`"client"`) and adding `data.instanceId`; whether a separate `process_instance` record type is needed is **NC** | `useAutomationStore.ts:564-583`; `ruleEngine.ts:224, 231` |
| **V2** | Can an action write fields to a **different** record type? | **Partly, not generically.** Cross-record writes today: `generate_invoice` (finds the appointment, `updateAppointment(appt.id,{invoiceId})`, `ruleEngine.ts:607-654`) and stage moves. No "write fields" action exists. Writers: **appointment** `updateAppointment(id, patch)` (`appointmentService.ts:1247`; typed columns, extra keys spread at runtime; custom field values are **drawer-local** `mantra_appt_fields_<id>` `AppointmentDetailDrawer.tsx:256,338,432`; open drawers refresh only on `[effectiveAppt,…]` L240-277 → write then touch); **process row** `updateProcessCallLogFields` (plain; any keys; `PROCESS_LOGS_STORE_EVENT` + `ma_record_data_changed`); **claim** `saveClaim` (`claimsStore.ts:396`; typed; values `mantra_claim_fieldvalues_<id>` `ClaimDetailDrawer.tsx:369,383`; `mantra_claims_changed`); **invoice** `mantra_inv_fields_<id>` (`InvoiceDetailDrawer.tsx:336,420,531`; `mantra_invoices_changed`); **client** `saveStoredClients`. Drawer writes replace the **whole** stored object, so a stale drawer can clobber a rule-written key → rule writes must merge (read-modify-write) then fire the touch event. **Proposal:** `src/lib/recordWriter.ts` — `writeRecordFields(ref{type,id,clientId?}, values, {source,ruleId}) → {ok, written[]}`: typed columns → service; unknown keys → merge into the drawer-local key; process → by `instanceId`; always fire the entity event + `ma_record_data_changed`; log `field_update` activity (`activityEngine.ts:98`) | cited |
| V2 cont. | Field registry outside React | **No exported non-hook reader.** Custom fields/sections are stored under `mantra_field_registry_v1`/`mantra_section_registry_v1` (L625-626); system fields come from exported `SYSTEM_SEEDS` (L1456) and `SYSTEM_SECTIONS` (L2146); `getAllFields/getFieldsForOrg/getSectionsForOrg` are **context methods** (L2544-2554, impl. L3376-3395); `loadCustomFieldsFromStorage` (L2764) is private and **writes back** (L2834, L2919). `chatbotFlowEngine.ts:2,147` and `VariablePickerButton.tsx:36` already read `SYSTEM_SEEDS` outside React. `processFieldValidation.ts` is non-React (takes `allFields`) but imports a value from the `.tsx` (L9). **Minimum refactor:** a new `src/lib/fieldRegistryCore.ts` with pure `getAllFieldsPure(module)`, `getSectionsPure(module)`, a **read-only** loader, `getFieldsForOrgPure(module, org, processId)`; org scope for non-React code — **NC where it comes from**. **Registering new groups:** (1) `SYSTEM_SEEDS[module]` + `SYSTEM_SECTIONS[module]` + `SYSTEM_FIELD_KEYS` (L636-649) (static; seeds are single-`module` and never reusable); (2) admin custom fields, shareable across modules via `isReusable` + `reusableModules` (L586-587; custom only; `getCustomFields` L3171-3191); (3) seed into the stored registry at load like `ensureScribeSeeds/ensureServiceSeeds` (L2711, L2745). `FieldDefinition.module` is single-valued; `processIds` scoping only for `process`. Drawers: all four render registry fields (`customFieldsModule="appointment"|"claim"|"invoice"`, process via `getSectionsForOrg("process",…)`); the appointment drawer's base layout `DEFAULT_APPOINTMENT_SECTIONS` (L79-107) uses different keys from `SYSTEM_SECTIONS.appointment`. Table/group types exist; rendering inside all four drawers **NC** | cited |
| **V3** | Roles & Permissions in Team | **Cosmetic today.** `ItemPermissions` = fixed 10 keys + `processInstances`/`stageInstances` (`types/permissions.ts:9-24`; "No other modules allowed"); `Role` L26-33; `canDoAction` (`lib/permissions.ts:3-33`) finds the role **by name**, requires `user.id` and `record.assignedToUserId`; **`canDoAction`/`canAccess` have zero callers**. Roles UI: `RolesPermissionsDrawer.tsx` `ROLE_PERMISSION_MODULES` is a **hard-coded 11-row list** (L39-51; incl. `billings`, `dashboard`, `documentTemplates`, `integrations`); actions shown = read/write/delete/import/export (write = add+edit); `convertToItemPermissions` (L261-…) writes only `if (mod.id in base)` (~L289) → **the Billings row (and 3 others) are silently dropped on save**; `getModulePermsFromRole` gives **missing keys read+write at level all** (L181-190). Roles are stored in **`sessionStorage["settings_roles"]`** (`Settings.tsx:1376-1395`), seeds Admin/Manager/Executive (`DEFAULT_ROLES` L114+); team roles tab `Settings.tsx:1290, 4968`. `TeamMember.role` is a name string (`teamStore.ts:3-20`), seed members' roles ("Ophthalmologist"…) match no Role. `AuthContext.tsx:5-36` has `role` string (default "SystemAdmin"), `user {name,email,role}`, **no id, no permissions**; nothing maps user → TeamMember → Role. `SettingsGuard.tsx:7-8`: `role === "SystemAdmin"`; toast + `Navigate "/"`; applied as a layout route over all `/settings*` and `/billing*` (`routes.tsx:~253-264`) — per route group, not per tab. `/claims`, `/payments`, `/reports`, `/invoices`, `/transactions` are outside any guard. The `tabs` array (`Settings.tsx:3850-3869`) has no role filter (render site NC). `/settings/billing-setup` falls through to `setActiveTab(rawTab)` (L859). | cited |
| **V4** | Where would `request_prior_auth` get its rules? | **Nowhere exists.** `Service` has `cptCode?` only (`servicesStore.ts:11-37`); `prior_auth_number` is a claim text field (`FieldRegistryContext.tsx:2091`); `preCertification` is **not on main**; `POPULAR_PAYERS` (`claimsStore.ts:98-106`, 7 payers) is imported only by dead `CreateClaimDrawer`; no payer store, no coverage store (`clientsStore` has no insurance fields), `Appointment` has no payer/coverage/auth fields. Step-param patterns: service picker `StepParametersFields.tsx:168`, row list `selectedServices` in the `generate_invoice` block (L4990-5091, L5198); no rules-table UI there → the rules table belongs in **Billing setup › Payers**, the step only picks a mode/override. **Proposal:** plain store `src/lib/priorAuthRulesStore.ts` (`mantra_prior_auth_rules_v1`, change event) with `getRules()`, `saveRule()`, `deleteRule()`, `getRule(payerId, serviceId|cpt)`, `isAuthRequired(payerId, serviceId)`; rule `{id, payerId, serviceId?, cptCode?, required, units?, validityDays?, notes?}`; per-service default `Service.requiresAuthDefault`. **Sample mock (8 rows):** bcbs/99214 N; bcbs/70553 Y (1 unit, 60 d); aetna/70553 Y (1, 90 d); uhc/97110 Y (12, 30 d); cigna/66984 Y (1, 60 d); medicare/99214 N; medicare/70553 N; medicaid/66984 Y (30 d, "state form"). Needs a coverage source first (client Coverages table + `Appointment.coverageId` or run-time primary coverage); until then `request_prior_auth` takes an explicit payer parameter. Whether the engine reaches stores the same way as services is **NC** | cited |

#### 3.0.1 Ground rules

| # | Rule | Consequence |
|---|---|---|
| R1 | A stage is the record's status; each record has one `currentStageId`; `systemCategory` is optional metadata | Engine tolerates a deleted/missing category (rule shows *Needs attention*) |
| R2 | Multiple workflows per entity (D1) and **multiple instances per process** (D5) | Instances are first-class; automations are per instance |
| R3 | Stage entry is the only trigger for entry actions; move rules live on Global Automation and move only the event's own entity | Cross-entity effects use actions, not move rules |
| R4 | One door per entity (service moves + emits events) | `claimService`; client-process moves via `logStageMove` |
| R5 | Idempotent actions, cause tracking, loop guard, failures show Retry, Undo | Per-action idempotency keys (§3.0.5) |
| R6 | Nothing hard-coded (D4) | Samples are seeded rules/stages; no service depends on a stage name |
| R7 | Queues = Task saved views (D3) | `create_task` + `entityRef` + auto-close |
| R8 | Access via permission keys in Team (D6) | No role names in code |

#### 3.0.2 Gaps (re-checked against D1–D7)

| # | Gap | Status | Evidence |
|---|---|---|---|
| ~~G1~~ | Singleton enforcement | **Dropped (D1)** | – |
| G2 | Several claim workflows persisted | Re-scoped (remove claim delete L1340-1343; add claim to `saveStoredProcesses`/ensure lists L1483-1491, L1562-1580; claim tab + multi-process list in `Process.tsx`; `getWorkflowsForModule("claim")` claim-only; `Claim.processId`; migrate seeds and clm-*/ins-* ids; fix `mantra_claims_v1` vs `claims_<orgId>`) | V Q4 |
| ~~G3~~ | Insurance entity/record | **Dropped (D2).** The `insurance` entity process becomes unused; stop its overwrite rule (L1346-1364) touching claims | – |
| G4 | Entry actions run as `AutomationRule`s with a stage-entered trigger, not `Stage.workflowSteps` | Reinforced by D4: samples are seeded rules | `ruleEngine.ts:182-236` |
| G5 | Delay/wait never executed; no scheduler | Still: daily jobs via a "Run daily jobs now" button on the **Automation** page | `ruleEngine.ts` |
| G6 | Events for claim/instances; ruleEngine `else` moves non-appointment/invoice as a client (L398-411) | Still; plus instance-aware dispatch | V1 |
| G7 | New actions need registration in ~6 places | 18 actions (§3.0.5); consider de-duplicating `STEP_ALLOWED_TRIGGERS` (×3) | Q5 |
| G8 | Required categories are per entity; name-based `isPredefinedStage` locks stages | Needs per-process `requiredCategories`, minimal | `useProcessStore.ts:381-388, 869-937` |
| G9 | Required-at-stage only for `process` fields | Works for instance fields (D2/D5); claim fields need generalizing; table emptiness weak (N16) | `processFieldValidation.ts` |
| G10 | Undo hardcoded to appt-1/inv-1/2/5 | Still; add claim + instance + cross-workflow | `useAutomationStore.ts:596-642` |
| G11 | PRD Phase-2 UI not rendered | Unchanged, optional | – |
| G12 | Drawer-local values for appointment/claim/invoice | Still: fields read by actions/scrubber/reports must be record properties **or** written through `recordWriter` (merge + touch) | V2 |
| G13 | Progress report overstates | Unchanged | – |
| N1 | Client-process moves (assign, `moveClientToStage`, `setClientProcessStage`) emit no events | Route all through `logStageMove` with `fromStageId` and instance | V1 |
| N2 | Engine gives no record context | `resolveRecordContext(event)` helper (client, instance, linked appointment) | Q1 |
| ~~N3~~ | One record per client | **Deleted (D5)** — replaced by the instance model (N17) | – |
| N4 (reworded) | `moveClientToStage` writes the single `client.stage`; three other name-keyed stage copies | Instance moves must **not** write `client.stage` (non-authoritative); name-keyed maps become derived mirrors | V1 |
| N5 | No `move_to_workflow` executor; no `start_process`/`assign_process` executor (`movetonewprocess`/`assign_process` are catalog-only) | New | Q1/V1 |
| N6 | Tasks: hook-bound mutators, no `entityRef`/`instanceId`, id collision, no task events, no saved-view store | New | Q5 |
| N7 | `stage.exited` carries only TO process and only with `fromStageId` | Add FROM process + instance; supply `fromStageId` everywhere | Q4/Q5 |
| N8 | Appointment has no coverage fields; no UI reads one | `Appointment.coverage {instanceId?, status, checkedAt, summary}` via `updateAppointment` | V2 |
| N9 | `isPredefinedStage` name list also locks custom stages named Paid/Draft/Completed/… regardless of entity | Folded into G8 (per-process required categories; drop the name-based locks) | `useProcessStore.ts:869-920` |
| N10 | Claims list: dropdown doesn't filter; presets keyed on `claim.status`; no claim report source; `processes` report rows mock | New | Q4 |
| N11 | `validateRuleEntityTarget` entity-only/legacy-only; `checkRuleCycle` process-blind | Validate step-level moves; cross-workflow cycle check | Q4 |
| N12 | Seed claims have no stage; migration id mismatches | New | Q4 |
| N13 | Claim sections/fields lack per-workflow scoping | **NC** — add `workflowIds` | registry |
| N14 | `createAppointment` reportedly gated on an appointment automation (L637-647) | NC | – |
| N15 | Double emits: `stage.entered` + `*.entered_stage`; service + `logStageMove`; check-in `mockMaClient` + `checkInAppointment` | Emit once | Q1 |
| N16 | Required table passes with one blank row | Treat all-blank rows as empty | `processFieldValidation.ts:22` |
| **N17** | **No instance model** (V1): `addProcessCallLog` overwrites the earlier instance's stage; id collisions; no discriminator | New: instance store + migration (§3.0.0 V1) | V1 |
| **N18** | **Process rows leak into call lists** (`CallLogs`, `AppointmentDetailDrawer:660`, `CallDetailDrawer:347`, `Overview`) | `kind` discriminator + `getCallsOnly()` | V1 |
| **N19** | **Deals matches by `clientName`** (no clientId on `Deal`; `getClientIdByName` → "CL-001"; `syncDealRecord` by name) | Deal gets `instanceId`/`clientId`; every `d.clientName ===` site rewritten | V1 |
| **N20** | **No cross-record field writer; no non-React registry reader** | `recordWriter` + `fieldRegistryCore` | V2 |
| **N21** | **Permission gaps:** fixed 10 keys; hard-coded drawer list; dead rows dropped on save; missing keys display read+write; roles in sessionStorage; user→role by name; no user id/permissions in AuthContext; zero `canDoAction` callers; `SettingsGuard` SystemAdmin-only per route group; settings `tabs` unfiltered | Permission keys + shared roles store + resolver (`TeamMember.roleId` + email lookup, Slice 1 e) + `PermissionGuard` | V3 |
| **N22** | **Prior-auth rules/coverage/payer stores absent** | `priorAuthRulesStore`, client Coverages, payer store | V4 |
| **N23** | Registry field groups are single-module; seeds not reusable; appointment drawer base layout differs from `SYSTEM_SECTIONS` | Register groups as **reusable custom fields** seeded at load (`ensure*Seeds` precedent) or per-module seeds | V2 |
| **N24** | **No defined run order for rules on the same event** (no `order` field on `AutomationRule`; iteration order of matching rules in `executeRulesForEvent` not verified) — A10 depends on A1's instance | **NC.** Add `AutomationRule.order` (default 100, ties by creation) and run matching rules in that order, each chain awaited; sample A1 = 10, A10 = 20 (§3.0.5) | `useAutomationStore.ts:68-97`; `ruleEngine.ts:157-246` |

#### 3.0.3 Entity / workflow map (capabilities; named processes are samples)

| Capability | Where it lives | Notes |
|---|---|---|
| Coverage verification and prior auth | **Actions** (`run_eligibility`, `check_auth_required`, `request_prior_auth`) placeable on any pipeline. Results are written to a configured **target** and appended to a history table. *Sample:* client process "Coverage & authorization" with one **instance per appointment** | Visible on Deals as one card per instance; clinics may instead write results only to the appointment or a claim |
| Charge capture / claim / denial | Claim entity, *sample* workflows **Charge capture, Claim, Denial & appeal**; `move_to_workflow` between them | Any number of workflows; the claim record is the same throughout |
| Patient balance | Invoice entity stages (*sample* additions) | Invoice code is effectively single-workflow today |
| Human work | Task entity; queues = saved views | `entityRef {type,id,instanceId?,processId,stageId,ruleId}` |
| Appointment | gets entry actions and `coverage` fields | chip data |
| Instances | any client process can have many instances (`start_process` with dedupe key) | D5 |

**Field groups (minimal) and the modules they register in** — registered as **reusable custom fields** seeded at load (`ensureRcmFieldSeeds`, precedent `ensureScribeSeeds` L2711) so clinics can attach/edit them anywhere (N23); instance fields are scoped with `processIds`.

| Group | Fields (minimal) | process (instance) | appointment | claim | invoice | client |
|---|---|---|---|---|---|---|
| **EG1 Eligibility result** | status, payer, plan, copay, deductible remaining, coinsurance, OOP remaining, network, plan begin/end, other payers, checkedAt, source | ✔ full | ✔ summary (status, copay, deductible remaining, checkedAt, instanceId) | ✔ summary at DOS | optional (estimate) | – |
| **EG2 Resolver** | reason code, category, action taken, attempt #, message (what to fix) | ✔ | – | – | – | – |
| **EG3 Authorization** | required?, status, auth #, units approved/used, valid from–to, requested/decided dates, referring provider, rule id | ✔ | ✔ summary (required?, status, auth #) | ✔ (auth # / status) | – | – |
| **EG4 Check history** (table) | checkedAt, trigger, source, status, reason code, summary, sourceRecord {type,id}, rawRef | ✔ | optional | optional | – | – |
| **EG5 Benefit lines** (table) | service type, kind, level, network, amount/%, remaining, period, confidence | ✔ | – | – | – | – |
| Coverages (reference table) | payer, member ID, group, plan, priority, subscriber + relationship, effective/term, card front/back | – | – | – | – | ✔ (Insurance tab) |

Keys are namespaced (`elig_*`, `auth_*`) to avoid colliding with `callLogs` row keys (V1/V2).

#### 3.0.4 Sample templates (all editable; none enforced; label every one "Sample")

*Samples are seeded by "Load sample templates" (Process page + Automation page); loading is idempotent and never overwrites edited items. `systemCategory` is optional.*

**Sample A — client process "Coverage & authorization"** (a clinic can build its own; stages are states a clinic wants to see on the Deals board, one card per instance):

| # | Stage | Meaning | Position / category | Typical owner |
|---|---|---|---|---|
| 1 | Not checked | instance created, no check yet | initial / in_progress | System |
| 2 | Checking | request in flight | intermediate | System |
| 3 | Needs fix | name/DOB/ID mismatch after retries | intermediate | Front desk |
| 4 | Provider setup issue | provider not enrolled | intermediate | Biller |
| 5 | Inconclusive | no usable answer after retries | intermediate | Biller |
| 6 | Pending review | voice/manual benefits captured | intermediate | Biller |
| 7 | Auth required | rule says auth needed | intermediate | Biller |
| 8 | Auth submitted | request sent | intermediate | Biller |
| 9 | Verified | cleared (active; auth not needed or approved) | final / success | – |
| 10 | Auth expired | date/units exceeded | intermediate | Biller |
| 11 | Inactive | 271 inactive | final / lost | Front desk |
| 12 | Auth denied | payer denies | final / lost | Biller |
| 13 | Self-pay | no coverage / chose self-pay | final / success | – |

Instance card title (sample): `{service} — {date time} (Appt #{id})` from the instance `source`.

**Sample B — Claim entity workflows** (3 sample workflows; a clinic may have more or fewer):

| Workflow (Sample) | Sample stages | Leaves via |
|---|---|---|
| Charge capture | Awaiting note → Coding review → Hold → Ready to bill | `move_to_workflow` → Claim / Draft |
| Claim | Draft → Scrub failed → Ready to submit → Submitted → Rejected → Accepted by payer → Pending (payer) → Partially paid → Paid → Closed | `move_to_workflow` → Denial & appeal on denial |
| Denial & appeal | New denial → Correct & resubmit → Appeal drafted → Appeal submitted → Written off | `move_to_workflow` → Claim / Ready to submit (corrected) or Paid (appeal won) |

Required categories are **per process** and minimal (sample: Claim = `submitted`, `paid`; others none). Claim `status` is derived from `systemCategory` when present, otherwise "Unmapped".

**Sample C — Invoice:** existing stages stay; sample additions Reminder 1, Reminder 2, Payment plan, Written off (which stages are stored today is NC: code defaults are Draft, Payment recorded, Paid, Overdue; services/Kanban also handle Sent/Viewed/Partially paid/Void). Required categories stay `draft, paid, void` unless overridden per process.

**Sample D — Task queues** (saved views): Insurance fixes, Benefits to verify, Enrollment, Prior auth, Claim fixes, Posting, Denials and A/R, Patient balances (§3.0.7).

**Sample E — roles** (via an "Add sample roles" action in the Roles drawer, **not** hard-coded in `DEFAULT_ROLES`): Front desk, Provider, Coder, Biller, Practice manager (§3.0.8).

#### 3.0.5 Actions and sample rules

**Mechanisms:** triggers **ST** stage-entered/exited (any entity, any instance), **EV** domain event, **JOB** daily-job event (emitted by `rcmJobs.runDaily()`, button on the Automation page; the engine does not honor `delay`, G5). Actions are placeable on any trigger and take configurable parameters; results go to **targets** the clinic chooses.

**The 18 generic actions**

| # | Action | Configurable parameters | Minimum data | Idempotency key | Failure / Retry |
|---|---|---|---|---|---|
| 1 | `run_eligibility` | **write targets** (any of: *this record*, *linked appointment*, *a process instance* [current or one created by `start_process`]) with a **result→stage map** per target; scope (client \| coverage \| appointment); coverage selector (primary/secondary/all); service-type codes (default from the appointment's service); service-date source; **dedupe window** (default 30 d; **0 = always call**; a fresh verified result within the window is **copied** to the new target/instance instead of calling the payer); retries (variants ≤3, backoff 1/5/30 min); follow other-payer redirect (F2.7); adapter/scenario (mock); append **history row** to each target's check-history table | client legal name + DOB + sex; coverage member ID + payer; rendering provider NPI; service date | `clientId:coverageId:serviceDate:serviceTypeSet` inside the window (copy-fresh path) + `targetRef` for the write | Transport error → backoff → result "Inconclusive"; **Failed + Retry** on the Automation page; never undoes recorded facts |
| 2 | `check_auth_required` | rule source (payer×service rules in Billing setup, or per-service default), payer source (coverage on the record/instance, or explicit), service source, outputs (`required?`, rule id, units, validity) → fields on chosen target(s). **Write targets:** *an existing process instance* and/or *the linked appointment*; **it never creates an instance** — if no instance exists for the source record (e.g. A1 not enabled), the write falls back to the **appointment only** (appointment summary fields), and the action reports `targetFallback: "appointment"` in its result | payer + service (CPT/serviceId) | `recordId:ruleId:eventId` | Missing payer ⇒ "unknown" result + optional task; Retry |
| 3 | `request_prior_auth` | targets and stage map (e.g. "after request → stage X"; applied only when an instance target exists), channel (portal/fax/manual — mock), units/validity from the rule, referring provider source, renewal mode, auto-create task (queue). **Write targets:** same rule as action 2 — Authorization fields + the **history row** go to the existing instance **and** the appointment summary; with no instance they go to the appointment only; it does **not** create an instance | auth **required** per action 2 (or explicit), payer, service, patient | `clientId:payerId:serviceId:validFrom` | Failed + Retry; request recorded as **Authorization** fields + history row (on each target that has the check-history table; appointment-only fallback stores the summary fields and a note) |
| 4 | `start_process` (alias `assign_process`) | process, **dedupe key** (default `clientId+processId+source{type,id}`), source record, entry stage, instance title template, end-current (n/a) | clientId, processId | **dedupe key** — re-save or reschedule of the same booking returns the existing instance (`alreadyExisted`) | Missing process ⇒ health "Needs attention"; Retry |
| 5 | `move_to_workflow` | record type (claim \| process instance), target workflow, target stage (default initial), keep field values (yes), cause label | record id; target workflow/stage exist | `recordId:targetWorkflowId` (no-op if already there) | Invalid target ⇒ health; cycle guard (depth 10 + save-time cross-workflow check, N11); Retry |
| 6 | `create_claim` | trigger/source record (appointment \| scribe session \| invoice \| client \| instance), **start workflow + stage**, lines source (service→CPT map \| scribe codes \| none), payer/coverage source (client primary on DOS \| a result target \| explicit), provider source, billing entity/POS (Billing setup), assignee rule, dedupe scope | clientId + date of service | `claim:{sourceType}:{sourceId}:{startWorkflowId}` → returns existing | Missing optional data ⇒ create with `missingData[]` (+ optional `create_task`); no clientId ⇒ Failed + Retry |
| 7 | `create_task` | title/description templates, **queue**, task type, priority, due (offset / visit date / field), assignee rule, amount-at-stake source, `autoCloseOnStageExit` (default on) | trigger record | **open task with the same `entityRef.{id, instanceId?, stageId}` + `ruleId`** (re-entering a stage after leaving legitimately creates a new task) | Store error ⇒ Failed + Retry |
| 8 | `update_to_stage` *(exists; extend)* | record type, process, stage, **target instance** | record/instance id; explicit `processId` for client moves (the default falls back to Patient Care Journey) | existing | existing |
| 9 | `update_fields` *(replaces the non-persisting `fieldupdate`)* | target record(s), field → value map (templates), merge mode | target ref | `targetRef:fieldSetHash:eventId` | Failed + Retry; writes via `recordWriter` |
| 10 | `scrub_claim` | rule set, on-pass / on-fail target stages, issue table target | claim lines, ≥1 ICD, billing entity, rendering NPI | `claimId:scrubVersion` | Failed + Retry |
| 11 | `submit_claim` | immediate vs batch window, adapter, on-submit stage, ack handling | claim in a submit-ready stage, passed scrub | `claimId:frequency:submissionSeq` | Transport error ⇒ retry then Failed + Retry |
| 12 | `check_claim_status` | age threshold, stage filter, on-pending / on-missing stage | submitted claim with tracking id | `claimId:checkDate` | Failed + Retry |
| 13 | `post_remittance` | match rules, auto-post thresholds, target stages, unmatched handling | ERA with trace #, payer, claim refs | `traceNumber:payerClaimNumber` | Unmatched ⇒ event `era.unmatched` |
| 14 | `update_invoice_from_claim` | triggering claim stage, invoice target stage, statement/payment-link on/off | claim with patient responsibility + linked invoice | `claimId:invoiceId:claimEventSeq` | Failed + Retry |
| 15 | `draft_appeal` | template, source fields, AI settings (**propose-only**) | denial reason codes + claim | `claimId:appealRevision` | Failed + Retry |
| 16 | `send_message` | channel, template, variables (`billing.*`, `insurance.*`), recipient rule, consent check | recipient + consent | `recordId:templateId:ruleId:eventId` | Failed + Retry; mock-dispatch to `useConversations` + activity |
| 17 | `start_call` | purpose (payer benefits \| balance reminder), script, hours/retries (`CallTriggerSettings`), consent | payer phone / patient consent | `recordId:purpose:day` | Failed + Retry |
| 18 | `notify` | recipients (permission key or member), message, link | – | `recordId:ruleId:eventId` | ignored on failure |

**Run-order rule (rules on the same event).** Rules that match the **same event** run in a **defined order**: ascending `AutomationRule.order` (number, default 100; ties broken by creation time), each rule's action chain completing (awaited) before the next rule starts. Sample rules set it explicitly so dependent rules are safe: **A1 = 10** (creates the instance and runs eligibility), **A10 = 20** (needs the instance A1 created), **A13 = 10**. Whether the engine has any ordering today is **needs confirmation**: `eventBus.emit` awaits listeners sequentially, but the order in which `executeRulesForEvent` iterates matching rules (`ruleEngine.ts:157-246`) was not verified and there is no `order` field on `AutomationRule` (`useAutomationStore.ts:68-97`) — recorded as gap **N24**.

**A1–A30 as SAMPLE rules.** All sample rules ship **disabled**. "Load sample templates" offers **"Enable demo set"** per capability group so demo scripts are reproducible:

- **Set E** = A1–A10, A13 (eligibility and prior auth)
- **Set E2** = A11–A12 (auth renewal and reminders)
- **Set C** = A14–A20 (visit to claim)
- **Set M** = A21–A30 (money back)

Every `create_task` auto-closes when the linked record/instance leaves the stage it was created for. "Instance" = a process instance created per appointment by `start_process`.

| A# | Trigger | Condition | Action chain (sample) | Set |
|---|---|---|---|---|
| A1 | EV `appointment.booked` | has coverage | `start_process` (sample process; dedupe clientId+processId+appointmentId) → `run_eligibility` (targets: this instance + this appointment; window 30 d; copy-fresh; result→stage map on the instance) | E |
| A2 | JOB daily 6 pm | visits in 3 d / tomorrow | for each upcoming appointment's instance: `run_eligibility` (window skips fresh) | E |
| A3 | EV `coverage.updated` | future appointments exist | `run_eligibility` per future instance (**window 0**) | E |
| A4 | ST enter *Needs fix* (instance) | – | `create_task` queue Insurance fixes (`entityRef` instance) | E |
| A5 | ST enter *Inactive* | – | `create_task` (Insurance fixes) + `send_message` (update insurance link) | E |
| A6 | ST enter *Provider setup issue* | – | `create_task` queue Enrollment | E |
| A7 | ST enter *Inconclusive* | voice enabled | `start_call` (payer benefits) | E |
| A8 | ST enter *Inconclusive* | voice off / call failed | `create_task` queue Benefits to verify | E |
| A9 | JOB | instance *Verified*, 2 d before visit | `send_message` (estimate) | E |
| A10 | EV `appointment.booked` (**order 20 — runs after A1 on the same event so the instance exists**) | has coverage | `check_auth_required` → if required `request_prior_auth`. **Write target:** Authorization fields + the history row go to the **instance** (created by A1) **and** the appointment summary; **if no instance exists (A1 not enabled) the write falls back to the appointment only and A10 does not create an instance**; stage map applies only when an instance exists. Then `create_task` queue Prior auth (`entityRef` = the instance if present, else the appointment) | E |
| A11 | JOB | auth ≤14 d to expiry or 80% units | `check_auth_required` (renewal) → `request_prior_auth` (renew) + `create_task` (Prior auth) | E2 |
| A12 | JOB daily | visit in 2 d, auth not approved | `notify` front desk + biller | E2 |
| A13 | EV `appointment.checked_in` | last check > 1 d | `run_eligibility` (target: this appointment's instance) | E |
| A14 | EV `appointment.completed` | – | `create_claim` (start Charge capture/Awaiting note) + `notify` provider. **Variants (enable one):** at scribe signing / at check-in / at invoice paid | C |
| A15 | JOB daily 7 pm | claim in *Awaiting note* > 24 h | `notify` provider | C |
| A16 | EV `claim.note_signed` / codes accepted | – | `update_to_stage` through Coding review; ST enter *Ready to bill* → `move_to_workflow` → Claim/Draft; ST enter *Draft* → `scrub_claim` | C |
| A17 | EV `claim.scrub_failed` | – | `update_to_stage` *Scrub failed* + `create_task` Claim fixes | C |
| A18 | JOB daily 5 pm | claims in *Ready to submit* | `submit_claim` (batch) | C |
| A19 | JOB daily | *Submitted* > 2 d, no ack | `notify` biller | C |
| A20 | EV `claim.rejected` | – | `update_to_stage` *Rejected* + `create_task` Claim fixes | C |
| A21 | JOB daily | *Accepted*, no ERA 30 d | `check_claim_status` + `create_task` Denials and A/R | M |
| A22 | EV `era.received` | – | `post_remittance` | M |
| A23 | EV `era.unmatched` | – | `create_task` queue Posting | M |
| A24 | EV `claim.partially_paid` | under expected by >$5 or 5% | `update_to_stage` *Partially paid* + `create_task` Posting | M |
| A25 | EV `claim.denied` | – | `move_to_workflow` → Denial & appeal / New denial + `update_fields` (category, deadline) + `create_task` Denials and A/R | M |
| A26 | JOB | appeal deadline ≤14 d, not appealed | `notify` manager + `update_fields` (priority) | M |
| A27 | ST enter claim *Paid* / *Partially paid* / *Written off* | linked invoice | `update_invoice_from_claim` + `send_message` (statement + payment link) | M |
| A28 | JOB | invoice *Sent* unpaid 15 / 30 d | `update_to_stage` *Reminder 1/2* + `send_message` | M |
| A29 | JOB | 45 d unpaid + voice consent | `start_call` (balance reminder) | M |
| A30 | EV `invoice.overdue` | 60 d | `update_to_stage` *Overdue* + `create_task` Patient balances | M |

Events (names follow main's prefixes): `coverage.*`, `claim.*` (incl. `note_signed`, `coded`, `scrub_failed`, `rejected`, `accepted`, `denied`, `paid`, `partially_paid`), `era.*`, `denial.deadline_near`, `balance.*`, `task.*`. Eligibility/prior-auth results are **action results and instance stage events**, not `eligibility.*` events.

#### 3.0.6 Fields

| Where | Groups / fields | Persistence |
|---|---|---|
| **Process instance** (process-module fields scoped by `processIds`) | EG1–EG5 (§3.0.3) | the instance row (`callLogs`) via `updateProcessInstanceFields` (by `instanceId`); required-at-stage works today |
| **Appointment** | `coverage {instanceId?, status, checkedAt, summary}`, `coverageId`, `financialClass`, claim link; EG1/EG3 summaries as registry fields | typed fields via `updateAppointment`; registry values via `recordWriter` (merge + touch) |
| **Client** | legal first/last name, DOB, sex, address, guarantor, selfPay, consents {sms, voice, cardOnFile}; **Coverages** table | `clientsStore` typed |
| **Claim, by workflow drawer** (sections scoped per workflow, N13) | *Charge capture*: Visit, Codes tables, Hold reason; *Claim*: Submission, Money, Scrub issues, Payments; *Denial & appeal*: Denial, Appeal; common: assignee, timely-filing deadline, priority; EG3 summary | **properties on `Claim`** (G12) |
| **Invoice** | claim link, insurance paid, adjustments, patient responsibility, statements; Payment plan table | `ClientInvoice` properties |
| **Task** | `entityRef {type,id,instanceId?,processId,stageId,ruleId}`, `taskType`, `queueId`, `priority`, `dueAt`, `payerId`, `amountAtStake`, `source`, `closedBy` | `TaskEntity` |
| Reference (Billing setup) | payers, enrollment, fee schedule, **prior-auth rules**, billing entity, locations (POS), scrub rules, claim defaults; team NPI/taxonomy/license | new plain stores (localStorage + change event) |

**No `insurance` registry module, no Insurance entity.**

#### 3.0.7 Work queues = Task saved views (Sample queues)

New `taskViewsStore` (localStorage) + "Queue" selector and "Save view" on Tasks (`PageTopBar.onSaveFilter`, L98, exists unused). A view = {name, queue/priority/due/overdue filter, columns}; sort: due date, then amount at stake. Columns: Queue, Title, **Linked record** (`entityRef`; process instances show their source title), Priority, Due, SLA breached, Amount at stake, Assignee.

| Sample queue | Created by (sample rule) | Auto-closes when | Opens |
|---|---|---|---|
| Insurance fixes | A4, A5 | the instance leaves *Needs fix* / *Inactive* | Client profile › Insurance tab (field highlighted) or the Deals instance drawer |
| Benefits to verify | A8 | instance leaves *Inconclusive* | Deals instance drawer (history table) |
| Enrollment | A6 | instance leaves *Provider setup issue* | Billing setup › Payers (enrollment) |
| Prior auth | A10, A11 | instance leaves *Auth required* / *Auth expired* | Deals instance drawer (Authorization) |
| Claim fixes | A17, A20 | claim leaves *Scrub failed* / *Rejected* | Claims › drawer |
| Posting | A23, A24 | task completed (unmatched ERA) / claim leaves *Partially paid* | Claims › Post payments / drawer |
| Denials and A/R | A21, A25 | claim leaves *Pending (payer)* / *New denial* | Claims › drawer |
| Patient balances | A30 | invoice leaves *Overdue* | Invoice drawer |

Auto-close = subscriber on `stage.exited` matching `entityRef.type/id/instanceId/stageId` (never trusting `processId` on the event until N7 is fixed). Tasks cover only their own entity's journey.

#### 3.0.8 Permission keys (D6) — assigned in Team › Roles, no hard-coded roles

Add to the **existing** model (`types/permissions.ts:9-24`, optional keys, each with the existing actions): **`billingSetup`**, **`eligibility`**, **`priorAuth`**, **`claims`**, **`rcmPayments`** (not `payments`, which collides with the Settings billing sub-tab), **`denials`**, **`rcmReports`**. Edits (V3): type keys; `createDefaultPermissions` (`settings-constants.ts:36-47`, default deny); rows in `ROLE_PERMISSION_MODULES` (`RolesPermissionsDrawer.tsx:39-51`); fix the **missing-key fallback** to deny (L181-190); fix the **dropped keys** (`convertToItemPermissions` ~L289 — either implement or remove the dead `billings/dashboard/documentTemplates/integrations` rows); merge defaults on load (`Settings.tsx:1376-1383`); **move roles to a shared `rolesStore` in localStorage** (today sessionStorage `settings_roles`).

**Minimal change so a permission (not SystemAdmin) opens Billing setup:** (1) `rolesStore` + `useCurrentPermissions()` that resolves the current user → **`TeamMember` by email → `TeamMember.roleId` → Role** → `hasPermission(moduleKey, action)` (adds `roleId` to `TeamMember`, `teamStore.ts:3-20`, and a role picker in the member drawer; matching `AuthContext.user.role` to a Role **by name** is acceptable only as a fallback for a throwaway prototype) (record-less, since scopes own/role mean nothing for setup screens); SystemAdmin = true. (2) A new `PermissionGuard` route for `settings/billing-setup` **outside** `SettingsGuard` (the guard is per route group, `routes.tsx:~253-264`); (3) in `Settings.tsx`, hide/lock the other tabs for non-admins when reached via that route (the `tabs` array is unfiltered; render site NC); (4) the deep link already works (`setActiveTab(rawTab)` L859; avoid the `billing` branch L788-794). Call points for `hasPermission`: Billing setup tab; "Verify now"/`run_eligibility` buttons (`eligibility`); prior-auth actions (`priorAuth`); Claims create/edit/export (`claims`); Post payments (`rcmPayments`); Denial & appeal moves/appeals (`denials`); Reports/Overview RCM row (`rcmReports`). Caveats: today's role→user mapping is by **name** and the seed team roles match no Role — resolved by `roleId` + email lookup (Slice 1 item e; Q7 closed); default dev user is SystemAdmin (non-admin behavior is testable only via `setRole`/`user_role`).

**Sample roles** (Sample E, via "Add sample roles"): Front desk — `eligibility` r/add, `claims` r; Provider — `claims` r (own), `priorAuth` r; Coder — `claims` r/edit; Biller — `claims` all, `rcmPayments`, `denials`, `eligibility`, `rcmReports` r; Practice manager — all RCM including `billingSetup`.

---

### 3.1 Schedule appointment drawer — drawer on `/appointments`, `/clients/:id` — `ScheduleAppointmentDrawer.tsx`

Facts: `primaryInsurance/secondaryInsurance` are type-only (L79-80), never passed (`Appointments.tsx:1559-1611`); booking → `handleBookingComplete` → `createAppointment` (`appointmentService.ts:630`, emits `appointment.booked` L837); mounted by `ActivityTab`/`ClientProfile` too (props optional).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse (main) | Effort |
|---|---|---|---|---|---|---|---|---|
| Insurance vs self-pay; pick/add coverage | F1.1-2 | Segmented control + coverage select (client Coverages table) + "Add coverage" | new `SectionCard` "Coverage" between Participants (L1413) and Schedule (L1418) | client Coverages; payer list | `coverage.added` | new | `SectionCard`, `CustomDropdown` | M |
| **Verify now** + result chip | F1.3, F2 | Button runs `run_eligibility` (targets configured in the rule/preset: this appointment and an instance); chip from `Appointment.coverage` | same | `Appointment.coverage` + instance | `run_eligibility` (A1) | new | – | M |
| Auth warning | F1.4 | Alert from `check_auth_required` | same; footer L1263 | `priorAuthRulesStore` | A10 | new | – | M |
| Estimate in confirmation | F1.5 | Text | confirmation | benefit lines + fee schedule | A9 | new | – | S |
| Gate: coverage chosen or self-pay | F1 | extend `isFormComplete` L1180 | footer | – | – | modify | – | S |

### 3.2 Appointments list and calendar — `/appointments` — `Appointments.tsx`, `AppointmentCalendarView.tsx`

Facts: columns ID, Title, Stages (`SegmentedStageBar` L1317), Client, Date, Time, Provider, Service; auto per-stage presets L1149-1164; no check-in action (L1469-1540); calendar month-only with hard-coded "✓ CONFIRMED" (L320-325); `AppointmentCard` dead.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Coverage chip** (green/amber/red/grey) reading **its own** result (`Appointment.coverage`, which points to its instance) | §2 | Chip | new "Coverage" column after Service; dot in month cell L196-218; chip in day-card header L319 | `Appointment.coverage` (N8) | written by `run_eligibility` | modify | stage colors | M |
| Chip click → coverage panel | §2 | opens detail drawer Coverage tab | list + calendar | – | – | modify | open handlers | S |
| "Verify upcoming" | A2 | Toolbar button → runs the batch rule | list toolbar | `rcmJobs` | A2 (JOB) | new | – | S |
| `clientId` always set | §7 | none | payload | required | – | modify | – | M |
| Mark complete | A14 | existing action (`Appointments.tsx:1651`) | row/drawer | – | `appointment.completed` ✔ | modify | existing | S |

### 3.3 Appointment detail drawer — `AppointmentDetailDrawer.tsx` (1294)

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Coverage summary, estimate, history | §2 | New "Coverage" tab: result summary (EG1/EG3 fields), link to **its instance** drawer (full history), Re-run | tabs array L782-787 + body | `Appointment.coverage` + instance fields | A13 | new | `DraggableOverviewSections`, `ChevronStageRibbon` | M |
| Re-run / View raw | F2 | buttons | same | `run_eligibility` (window configurable) | – | new | – | S |
| Accept/Edit pending-review benefits | F3.4 | opens instance drawer; accept = move instance to the stage the clinic chose | same | instance fields | stage move (manual) | new | one-door move | S |
| Check in | F4 | "Check in" button (none today; `checkInAppointment` L1138) | header | `appointmentService` | `appointment.checked_in` → A13 (fix double emit, N15) | new | – | S |
| Claim link + workflow/stage chip | – | chip | Overview section | `Claim.appointmentId` | – | new | – | S |

### 3.4 Check-in (desk + kiosk)

Facts: `mockMaClient` (~L1368-1385) emits check-in events and calls `checkInAppointment` (double-fire NC); kiosk `PHONE→OTP→PATIENT_PICK→DETAILS_SUMMARY` (L5025-5107) → `handleConfirmCheckin` L2373; payment on `BILLING` (L5316, QR L5114). **Each kiosk/desk check-in must find-or-create an instance by appointmentId** (V1, `mockMaClient.ts:795,1119,1489`).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Coverage chip + copay; auto re-run if stale | F4.1 | Chip + copay | desk: drawer header; kiosk: `DETAILS_SUMMARY` row (L5028-5069) | `Appointment.coverage` | A13 | new | – | S |
| Confirm insurance unchanged; capture card photos | F4.2 | kiosk `INSURANCE_CONFIRM`, `CARD_CAPTURE`; desk editor | kiosk + drawer | client Coverages | `coverage.updated` → A3 | new | `ScreenState` pattern | M |
| Collect copay/deposit | F4.3 | kiosk `COPAY` (reuse BILLING QR); desk `RecordPaymentModal` | kiosk + drawer | `invoiceService.recordPayment` (L758) | `invoice.*` ✔ | modify | existing | M |
| Override with reason | F4.4 | alert + reason field | desk + kiosk | audit | – | new | – | S |

### 3.5 Deals — `/deals` — `Deals.tsx` (a card **per instance**) and Process detail drawer

Facts: Deals shows client processes (L763 ✔); kanban/list; required-fields gate uses `getFieldsForOrg("process", org, log.processId||log.process)` with values `{...clientObj, ...log}` (L1716-1723, L1929, L2822 — client fields leak into validation); a `Deal` has no `clientId`; drop resolves by `getClientIdByName` (fallback "CL-001") and finds the log by client + process **name** (L2813).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Card per instance**; **card title shows the source** (appointment/service, e.g. "Eye exam — Nov 20 10:30 (Appt #123)"); several cards per client | D5 | Card title from `instance.source`; badge "Instance of {process}" | kanban card + list row (`dealKanbanStages` L984) | `deal.instanceId`, `deal.clientId`, `deal.title` | `stage.entered` with `recordId = instanceId` | modify | existing kanban | L |
| Drag/list stage change by `instanceId` (not name) | D5 | – | kanban drop L2802-2915; list handlers L1707-1804; rewrite sites L1754, L1791, L4035 | instance store | `logStageMove` incl. `fromStageId`, instance | modify | – | L |
| Required-at-stage uses the **instance** values only | G9 | – | L1716, L1929, L2822 | instance row | – | modify | `RequiredFieldsModal` | M |
| Instance drawer: EG1–EG5 fields (history + benefit tables) | §7 | process-module fields | `ProcessDetailDrawer` (`mode="process"`) finds its row by `instanceId` (replaces L514-554) | instance row | `run_eligibility` writes | new | field registry | M |
| Run eligibility / request auth on a card | F2 | buttons | drawer header | actions | `run_eligibility`, `request_prior_auth` | new | – | S |

### 3.6 Client profile — `/clients/:id` — `ClientProfile.tsx`

Facts: tab array L2349-2357 ✔ (overview, processes, forms, appointments, invoices, documents, products); `activeProfileTab` L933; Processes tab shows one row per process **name** and keeps only the last log per name (L1635-1730, L2478-2481); assign handler L1034-1127 updates an existing deal instead of creating one.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Processes tab = list of instances** (heading per instance with its source; same process may appear many times) | D5 | rows per instance with source + stage | L1635-1730, L2465-2520 | instance store | – | modify | existing tab | L |
| Assign/start process creates a **new instance** unless the dedupe key matches | D5 | manual path of `start_process` | `handleConfirmAssignProcess` L1034-1127 (emit via `logStageMove`, N1) | instance store | stage entry | modify | – | M |
| **Insurance tab**: Coverages (primary/secondary/tertiary, subscriber, card images) + the client's instances' latest result | §2 | new tab `insurance` | add to array L2349-2357, union L933, body after L3710 | client Coverages; instance results | `coverage.added/updated` → A3 | new | registry table field | L |
| **Billing tab**: claims (workflow + stage), invoices, payments, statements | §2, F9 | new tab; move Invoices content | after Insurance | `claimsStore`, `invoiceService` | – | modify | existing invoice list | M |
| Typed demographics, guarantor, consents | §7 | Overview section | `DEFAULT_CLIENT_SECTIONS` L424-457 | `clientsStore` | – | modify | registry | M |
| Highlight a field from a task | §8 | `?tab=insurance&field=` | Insurance tab | – | – | new | – | S |

### 3.7 AI Scribe — `/scribe` — `TranscriptDetailDrawer.tsx`, `scribeSessionStore.ts`

Facts: no sign/lock; `saveScribeSession` (L630-672) emits no event; **hard-coded `icd_code: "J06.9"`** ✔ (`TranscriptDetailDrawer.tsx:218`); no CPT; sessions in sessionStorage.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Codes panel** (ICD-10 + CPT/modifiers; accept/edit/decline) → claim Codes tables | F5 | card + `CPTCodeInput` | col. 1 after L521 | claim tables | `claim.coded` | new | `CPTCodeInput` | L |
| Fix hard-coded ICD | – | read `d.icd10Code` | L218 | – | – | modify | – | S |
| **Sign and send to billing** | F5 | primary button | header L391-405 | `ScribeSession.status='signed'` | `claim.note_signed` (new) | new | – | M |
| Ophthalmology codes | §9 | seed | `cptCodes.ts` + presets | – | – | modify | – | S |

### 3.8 Claims — `/claims` (Insurance & Claims) — `Claims.tsx`, `ClaimDetailDrawer.tsx`, `claimsStore.ts`

Facts: loads insurance processes (L64-68); dropdown doesn't filter (L164-195); presets keyed on `claim.status` (L269-320); two movers, no events (`handleStageChange` L135-161; `moveClaimToStage` L467); creation via drawer create mode; mock `submitClaimElectronically` (L434).

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| **Workflow selector** (all workflows the clinic defined + "All") | D1 | Segmented control; "All" = list with a Workflow column | `PageTopBar` leftElement (replaces L407-425) | `Claim.processId` → filter `filteredClaims` | – | modify | `WorkflowGearDropdown` | M |
| **One board per workflow** | §2 | Kanban toggle; columns = the selected workflow's stages | toolbar | claim processes | drag → `claimService` | new | shared `PipelineBoard` extracted from `Invoices.tsx` L700+/`Deals.tsx` | L |
| Ribbon/stage bar resolve against the claim's own workflow | D1 | – | L533-560; drawer L707-725 | `claim.processId` (not `insProcs[0]`) | – | modify | primitives | M |
| **`move_to_workflow`** (menu + action) | D1 | menu in drawer | drawer header | `claimService.moveClaimToWorkflow` | `stage.exited` (FROM) + `stage.entered` (TO) | new | appointment `moveToStage` precedent | L |
| **Per-workflow drawer field sections** | §7 | sections scoped to the claim's workflow | `DEFAULT_CLAIM_SECTIONS` L75-124; `SYSTEM_SEEDS.claim` | properties on Claim (G12); `workflowIds` (N13) | – | modify | `DraggableOverviewSections mode="claim"` | L |
| One-door `claimService` (move, submit, post, create) | R4 | – | `src/lib/claimService.ts` | `claimsStore` | all `claim.*` | new | `appointmentService.moveToStage` | L |
| Required fields at stage | G9 | `RequiredFieldsModal` | list + drawer | generalized `requiredStages` | – | new | existing modal | M |
| Post payments / ERA; unmatched | F7 | toolbar + modal | header | Payments table | A22/A23 | new | `RecordPaymentModal` | L |
| Appeal draft | F8 | button | drawer Appeal section | `appealLetter` | `draft_appeal` | new | – | M |
| Submit/Resubmit/Void/CMS-1500 | F6 | existing buttons rewired | row actions L609-633 | – | A18 | modify | existing modals | M |
| Retire dead `CreateClaimDrawer`; migrate claims | N12 | – | – | `entityMigration.ts` | – | modify | – | M |

### 3.9 Invoices — `/invoices`

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Sample patient-balance stages | P6 | stages; Kanban columns appear automatically | invoice process; Kanban L314-322 | process | A28, A30 | modify | dynamic columns | M |
| Stage presets | §2 | generated from stages (Appointments L1149-1164 pattern) | `PageTopBar` L383-415 | – | – | modify | generator | S |
| Claim link, Insurance paid, Patient owes | F9.1 | 3 columns + "View claim" | `invoiceColumns` L495-690; export L480-489 | `ClientInvoice` props | – | modify | – | S |
| Payments tab breakdown | F9.1 | replace 4 metric cards | `InvoiceDetailDrawer.tsx` L929-955 | claim + payments | `update_invoice_from_claim` | modify | – | M |
| Statement / payment-plan sections | F9.2/4 | draggable sections | L76-125 | payment-plan table | A27, A28 | new | `DEFAULT_INVOICE_SECTIONS` | M |
| Insurance/ERA payment with claim link | F7 | claim id + adjustments | `RecordPaymentModal` L111-138, L282-330 | `Payment.claimId` | – | modify | existing | M |

### 3.10 Tasks (queues) — `/tasks`

Facts: table only; workflow switcher in `PageTopBar` leftElement (~L592-670); filters `filteredTasks` L191-235; `TaskQuickCreateDrawer` (3063 lines) is mid-edit — **edit last**.

| Spec feature | Spec ref | UI element | Placement | Data / store | Automations / events | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|---|
| Extract mutators; collision-safe ids; emit `task.*` | N6 | – | `tasksStore.ts` L851-1027 | – | `create_task` | modify | existing functions | M |
| New fields incl. `entityRef` (+`instanceId`) | §7 | – | `types/task.ts`; `migrateTaskEntity` L675 | `TaskEntity` | – | modify | – | M |
| **Queue selector + saved views** | §8 | chips/dropdown + "Save view" | `Tasks.tsx` leftElement + `filteredTasks` predicate; `onSaveFilter` L98 | `taskViewsStore` | – | new | `PageTopBar` | M |
| Linked-record card (process instance shows source) | §8 | card | `TaskDetailPage.tsx` L327→L334 | `entityRef` → route map | – | new | – | M |
| **Auto-close on stage exit** | D3 | subscriber | engine init (`ruleEngine.ts:1043-1055`/`main.tsx:5`) | `stage.exited` FROM (N7) | – | new | `eventBus.subscribe` | M |
| `create_task` action | D3 | action + params | registration points (Q5) | `tasksStore` | queue rules | new | generate_invoice pattern | M |

### 3.11 Process (Workflows), Automation — `/process`, `/automation`

| Spec feature | Spec ref | UI element | Placement | Data / store | Status | Reuse | Effort |
|---|---|---|---|---|---|---|---|
| Claim tab with any number of workflows (Add/rename/delete allowed) | D1 | add `claim` tab (label "Insurance & Claims"); all processes of the entity | `ENTITY_TABS` L1113-1119; L1068/1091/1105; `clientVisibleProcesses` L1158-1187; `handleAddProcess` L2817-2830; delete guard L2928 | `useProcessStore` | modify | existing tab pattern | M |
| Persist claim workflows; per-process required categories; stop insurance overwrite | G2/G8 | – | `useProcessStore.ts` L1340-1364, L1483-1491, L1562-1580, L381-388, L869-937 | `Process.requiredCategories` | modify | – | M |
| **Load sample templates** (processes, stages, rules, task views, templates, field groups, sample roles) — idempotent; "Enable demo set" per group | D4 | button | Process page + Automation page | seed functions | new | `DEFAULT_ENTITY_PROCESSES`, default-rule seeding | L |
| Custom stages: optional "behaves like" category | G8 | select | `handleAddStage` L3317-3416 | `Stage.systemCategory` | modify | existing | S |
| 18 actions: catalog, params blocks, executors | G7 | action cards + params | `StepCatalogDrawer`, `AddAutomationDrawer`, `STEP_ALLOWED_TRIGGERS` ×3, `StepParametersFields`, `ruleEngine.ts` L422+ | – | new | `generate_invoice` pattern | L |
| Events in **both** catalogs (`EVENT_CATALOG` L189-234; `GLOBAL_TRIGGER_CATALOG` L93-150) | §6 | – | stores | – | modify | – | M |
| ruleEngine: instance-aware dispatch, record-type dispatch (L398-411), step-level validation, cross-workflow cycle check | G6/N11 | – | `ruleEngine.ts`, `useAutomationStore.ts` | – | modify | `validateRuleEntityTarget` | L |
| Health + Retry; generalized Undo | R5 | button/badge | Automation table | `AutomationRule.health` | new/modify | – | M |
| **"Run daily jobs now"** | §6 | button | Automation page header | `rcmJobs.runDaily()` | new | – | S |

### 3.12 Chats, voice, settings, notifications, reports, Overview, permissions

| Screen / feature | Change | Placement | Status | Effort |
|---|---|---|---|---|
| **Chats** — 4 sample templates + variables; shared variable list; `resolveTemplateVars`; mock-dispatch for `send_message` | `templateLibrary.ts` L19+; hard-coded `<select>` `Chats.tsx` L3350-3373 | modify/new | M |
| **Voice** — `callPurpose` on a stage call setting; UI-only mock call result written to an instance | `CallTriggerDrawer.tsx` (`useProcessStore.ts:27-66`); Call Logs/Details (`CallLog` L27-43) | modify | M |
| **Settings › Billing setup** (own file `BillingSetupTab.tsx`; **gated by `billingSetup` via `PermissionGuard`**, §3.0.8) — billing entity, locations + POS, payers + enrollment, **prior-auth rules (Payers section)**, fee schedules, claim defaults, scrub rules, clearinghouse link | `tabs` array L3850 ✔ + routing effect L735-837 + titles L4084-4140 + render near L8098; not the SaaS "Billing" tab (`isBilling` match L735-770) | new | L |
| **Settings › Team › Roles** — RCM permission keys; sample roles action; shared roles store | `RolesPermissionsDrawer.tsx` L39-51, L181-190, ~L289; `settings-constants.ts` L36-47; `types/permissions.ts` L9-24; `Settings.tsx` L1376-1395 | modify | M |
| Provider credentials (NPI, taxonomy, license) | `ManageTeamMember` tabs L84 + `TeamMemberDrawer` + `teamStore` | modify | M |
| **Integrations** — clearinghouse card (mock adapter + scenario picker) | `integrationsRegistry.ts` L7, L74-178 **and** Settings' local `Integration` union (L368, L3144, L3226, L7769-7830); `IntegrationConfigDrawer.tsx:261` maps `rcm`→`invoice` | modify | M |
| **Notifications** — per-event toggles | `NotificationsSettingsTab`, `notificationSettingsStore` (module-level only today) | modify | M |
| **Reports** — sources `claims` (by workflow/stage), `denials`, `payments`, `ar_aging`, `eligibility` (from instance history) | `ReportDataSource` (`invoiceTypes.ts`), `reportEngine.ts` L11, `InvoiceContext.getReportRows` L915 (real rows, not mock), builder L225-249/L532-534 | modify | M |
| **Overview — RCM row (D7)** — queue counts (from Task saved views), KPIs (clean-claim rate, denial rate, days in A/R) from claim stage/invoice; gated by `rcmReports`; links into Tasks views/Claims | `Overview.tsx` after L383 | new (row) | M |
| **Audit** — view/edit of coverage, claim, payment | `auditLogsStore.ts` add `Billing`/`PHI Access` modules | modify | S |
| **Patient portal** `/patient/bill`, `/pay`, `/profile` — balance + plan; payment-link target; coverage editor (A5 link, NC page); **chooses one instance** (latest active) where it shows stage | `PatientBillScreen`, `PatientPaymentScreen`, `PatientStatusScreen.tsx:268-310` | modify | M |
| **Sidebar** — no new items (D7); keep "Insurance & Claims"; if permission-aware nav is wanted later, wire `hasPermission` into `Sidebar.tsx` (~2 d; today it ignores roles) | `SidebarMenuContext.tsx` | – | S (optional) |

---

## 4. Cross-checks

### 4.1 Feature coverage

| Spec item | Where the user sees/triggers it |
|---|---|
| F1 Booking with insurance | Schedule drawer §3.1; patient portal booking (NC); voice (UI-only) |
| F2 Eligibility + resolver | Schedule drawer; Appointments chip; detail drawer; Deals instance card + drawer; Integrations (mock adapter) |
| F3 Voice payer call | stage call settings; Call Logs; instance drawer |
| F4 Check-in & collection | detail drawer; kiosk; `RecordPaymentModal` |
| F5 Visit → claim | AI Scribe Codes/Sign; Claims (Charge capture sample) |
| F6 Scrub & submit | Claims; Billing setup › Scrub rules |
| F7 Remittance & posting | Claims "Post payments"; Tasks (Posting) |
| F8 Denials | Claims (Denial & appeal sample workflow/board/drawer) |
| F9 Patient balance | Invoices; client Billing tab; portal; Chats |
| P1–P6 | samples: instance process (P1+P2 as actions), Charge capture (P3), Claim (P4), Denial & appeal (P5), Invoice stages (P6) |
| A1–A30 | §3.0.5 (sample rules, sets E/E2/C/M) |
| 8 queues | Tasks saved views (§3.0.7) |
| Role capabilities (spec §8) | permission keys (§3.0.8), assigned per clinic in Team › Roles; call points listed there |

**Spec items with no page/record:** ERA/remittance as a record (claim child table + modal); payer-enrollment record (Billing setup › Payers); the A5 patient insurance form page; P6 "Estimate shown" (invoice Draft); A10–A12 slice (assigned to Slice 3 and 6). **UI the spec doesn't ask for:** none required.

### 4.2 Data coverage — spec §7 entity → store

| Entity | Store / where |
|---|---|
| Client additions, Coverages | `clientsStore.ts` (typed) |
| Team member / Org / Location / Payer / Payer enrollment / Fee schedule / **prior-auth rules** | `teamStore.ts`; new reference stores (`billingEntityStore`, `locationStore`, `payerStore`, `payerEnrollmentStore`, `feeScheduleStore`, **`priorAuthRulesStore`**) |
| Appointment additions | `appointmentService.ts` (`coverage`, ids) |
| Service additions | `servicesStore.ts` (`cptCodes[]`, `requiresAuthDefault`) |
| Invoice additions, Payment plan | `invoiceService.ts` / `invoiceTypes.ts` |
| Task additions, queues | `types/task.ts`, `tasksStore.ts`, **`taskViewsStore`** |
| **Process instance** (+ eligibility result, resolver, authorization, history, benefit lines) | **new instance store over `callLogs` rows (`kind:"process_instance"`)** |
| Encounter / dx / procedure, Claim line/event, Remittance/adjustment, Denial | `Claim` properties + child tables; claim event = activity + stage log |
| Claim | `claimsStore.ts` (+ `processId`) |
| Roles / permissions | **`rolesStore`** (localStorage) + new permission keys |

### 4.3 Conflicts and recommended resolutions

| # | Conflict | Evidence | Recommendation |
|---|---|---|---|
| C-1 | No instance concept; 4 name-keyed stage stores; id collisions; overwrite on re-assign | V1 | Instance store + idempotent migration (§3.0.0); name-keyed APIs become shims |
| C-2 | Deals matches by `clientName`; `getClientIdByName` → "CL-001"; `syncDealRecord` by name | `Deals.tsx:132-136, 1754, 1791, 4035`; `mockMaClient.ts:1039` | `Deal.instanceId/clientId`; rewrite every name match |
| C-3 | Process rows appear in call lists and call counts | `CallLogs.tsx:503-513, 1050-1062`; `AppointmentDetailDrawer.tsx:660`; `Overview.tsx:174-176` | `kind` discriminator + `getCallsOnly()` first |
| C-4 | Stage events omit instance; `recordId` = client id/name/log id; `stage.exited` carries TO process only | V1/N7 | `recordId = instanceId`; FROM process on exit; `fromStageId` everywhere |
| C-5 | `moveClientToStage` overwrites `client.stage`; falls back to Patient Care Journey | `clientsStore.ts:313-381` | Instance moves never write `client.stage`; explicit processId |
| C-6 | Claim processes deleted at load; claims use insurance stage ids; seeds have no stage | Q4 | Persist workflows; `Claim.processId`; migrate |
| C-7 | Required categories per entity vs several workflows | `useProcessStore.ts:381-388` | Per-process `requiredCategories`, minimal |
| C-8 | Drawer-local values (appointment/claim/invoice); stale drawer can clobber rule writes | V2 | Properties or `recordWriter` (merge + touch) |
| C-9 | No non-React field-registry reader | V2 | `fieldRegistryCore.ts` (read-only, pure) |
| C-10 | Field groups: single-module seeds; appointment drawer base layout ≠ `SYSTEM_SECTIONS.appointment` | V2 | Reusable custom-field seeds at load |
| C-11 | Roles unenforced (zero callers), sessionStorage, user→role by name, dead rows dropped on save, missing keys = read+write | V3 | Permission keys + shared roles store + `roleId` + email resolver + drawer fixes |
| C-12 | `SettingsGuard` SystemAdmin-only per route group; `/claims`/`/payments`/`/reports` unguarded | V3 | `PermissionGuard` + `hasPermission`; guard RCM pages when touched |
| C-13 | Spec roles (Front desk/…) don't exist | spec §8 | Sample roles only; no names in code (D6) |
| C-14 | Required-at-stage only for process fields; blank-row table passes; instance gating mixes client fields in | Q3, N16 | Generalize; instance-only values |
| C-15 | Engine gives no record context; `fieldupdate` persists nothing; ignores unknown stepKeys silently | Q1/V2 | `resolveRecordContext`, `update_fields`, health for unknown stepKeys |
| C-16 | `validateRuleEntityTarget` entity-only/legacy-only; cycle check process-blind | Q4 | Validate step moves; cross-workflow cycle check |
| C-17 | Prior-auth rules/payers/coverages don't exist | V4 | New stores; explicit payer parameter until Coverages exist |
| C-18 | Spec invoice-after-adjudication vs invoice-at-booking | `invoiceService.ts` | Sample A27 updates an estimate invoice |
| C-19 | `insurance` entity process unused | G3 | Retire after claims migrate (Q) |
| C-20 | Progress report overstates | G13 | Update later |

### 4.4 Navigation — final sidebar (live model)

No new items (D7). Access is governed by **permission keys assigned in Team › Roles** (D6); the live sidebar does not filter by role today, so items stay visible and **pages/actions** are guarded when the keys exist.

```
Overview                         (+ RCM row — shown with `rcmReports`)
WORKSPACE
  Contact                        (Insurance + Billing tabs)
  Call Logs
  Chats
  Process (Deals)                (client processes incl. the sample "Coverage & authorization" — a card per instance)
  Tasks                          (queue saved views)
  Appointments                   (coverage chip/panel — `eligibility`)
  AI Scribe                      (Codes/Sign — `claims`)
REVENUE & INSIGHTS
  Product & Services
  Invoice                        (balance stages)
  Insurance & Claims             (workflow selector, one board per workflow — `claims`, `denials`, `rcmPayments`)
  Reports                        (RCM sources — `rcmReports`)
CUSTOMIZATIONS
  Workflows (client processes, claim workflows, invoice stages; "Load sample templates")
  Automation (rules, sample sets, "Run daily jobs now")
  Knowledge Base / Webforms
SETTINGS
  Billing setup [new tab]        (`billingSetup` via PermissionGuard route)
  Organization, Team (Roles: RCM keys + "Add sample roles"), Integrations, Audit Logs, AI*, Sections/Fields   (SystemAdmin as today)
  Billing (SaaS)                 (SystemAdmin)
  Notifications
```

---

## 5. Build plan by slice

Six slices (spec had five). Estimates are front-end engineer-weeks and **inference**. Each slice's total is the **sum of its items** (low–high), and the grand total is the sum of the slice totals — arithmetic below is exact. Demo scripts assume **"Load sample templates" then "Enable demo set"** for the sets named; **all sample rules are disabled until that step**.

### Reconciliation with Revision 3

Rev 3 quoted 20–25 weeks top-down. Re-estimating every item bottom-up gives **42.0–55.5**. Increase: **+22.0 to +30.5** = new scope from D2/D5/D6 ≈ **12.5–15.5** (instances 6.0–8.0 [S1 a–d 5.0–6.5 + S1 g 0.5 + S2.1 0.5–1.0], permission keys 3.5–4.0 [S1 e 2.5–3.0 incl. `roleId` + S6.5 1.0], `start_process` 1.0 [S1 f], prior-auth node + field-group/recordWriter/fieldRegistryCore ≈ 2.0–2.5 [S2.2 part + S3.3]) + bottom-up recount of Rev 3 scope ≈ **9.5–15.0** (foundation items that Rev 3 had inside a 6–7-week Slice 1: multi-workflow claims, tasks + queues, Billing setup, coverages, template seeding, event fixes). Check: 12.5 + 9.5 = 22.0 and 15.5 + 15.0 = 30.5. Slice 1 is **9.0–11.0**, i.e. the earlier 8.0–10.0 target plus 0.5 (call-list separation moved in) and 0.5 (`roleId` + email lookup).

### Slice 1 — Instances, permissions, events, call-list separation, `start_process` (start here) — **9.0–11.0 wks**

| # | Item | Weeks |
|---|---|---|
| a | Instance store: factory, dedupe, id-based updates, name shims, idempotent migration, `kind` discriminator | 1.0–1.5 |
| b | Deals: card per instance (title from source), drops/list/gating by `instanceId`, every `clientName` rewrite site | 1.5–2.0 |
| c | ProcessDetailDrawer + ClientProfile (Processes tab = instances, assign/stage clicks) | 1.5–1.5 |
| d | Stage events: instance-aware `logStageMove`/`StageMove` (+ FROM process, `fromStageId` everywhere), client-process moves emit, single emission, record dispatch in ruleEngine, activity `instanceId` | 1.0–1.5 |
| e | Permission keys + shared `rolesStore` (localStorage) + `useCurrentPermissions` with **`TeamMember.roleId` + email lookup** (member drawer role picker; was 2.0–2.5, **+0.5**) + drawer/type/default fixes + `PermissionGuard` for `billing-setup` | 2.5–3.0 |
| f | `start_process` executor + action-registration core (pattern, idempotency util, Retry/health scaffolding) | 1.0–1.0 |
| g | **Call-list separation** (moved from Slice 2): `kind` discriminator + `getCallsOnly()`; move `CallLogs.tsx`, `Overview.tsx`, `AppointmentDetailDrawer.tsx:660`, `CallDetailDrawer.tsx:347` off process rows; migration QA | 0.5–0.5 |
| | **Slice 1 total** (1.0+1.5+1.5+1.0+2.5+1.0+0.5 = 9.0; 1.5+2.0+1.5+1.5+3.0+1.0+0.5 = 11.0) | **9.0–11.0** |

- **Pages touched:** Deals, ProcessDetailDrawer, Client profile (Processes tab), Call Logs / Overview / call drawers (stop showing process rows), Settings › Team (Roles drawer, member drawer role picker), routes (guard).
- **Stores/types:** instance store over `callLogs` (`kind`, `getCallsOnly()`); `Deal`/`ActivityBase`/`StageMove` fields; `rolesStore`; `TeamMember.roleId`; `types/permissions.ts`.
- **Mock data:** 2 clients, each with several instances of the sample process from different appointment sources; sample roles (via "Add sample roles").
- **Ordered tasks:** (1) `kind` discriminator + `getCallsOnly()` and the call-list moves (item g — stops process rows leaking into the call lists before any instance is created); (2) instance store + migration + shims; (3) `logStageMove`/StageMove changes; (4) Deals; (5) drawer + profile; (6) `start_process`; (7) permission keys, roles store, `roleId` + email resolver, guard.
- **Demo script (no rule sets needed):** on one client, start the sample process twice from two different appointments → Deals shows **two cards** with different titles; start it again from the **same** appointment → no duplicate (dedupe); drag one card → the other does not move; **the call list shows no process rows (item g)**. In Team › Roles add a role with only `billingSetup` read, assign it to a team member by `roleId`, log in as that member's email → **Billing setup route opens**, other Settings tabs stay blocked.

### Slice 2 — Setup, tasks, templates, action plumbing — **7.5–10.5 wks**

| # | Item | Weeks |
|---|---|---|
| 2.1 | Instance leftovers: reception `mockMaClient`, patient portal, test drawers, `Clients.tsx` create flow | 0.5–1.0 |
| 2.2 | Action plumbing: `resolveRecordContext`, `recordWriter`, `fieldRegistryCore` (pure readers), per-action idempotency util, Retry/health UI | 1.0–1.5 |
| 2.3 | Billing setup tab + reference stores (billing entity, locations/POS, payers, enrollment, fee schedule, claim defaults, scrub rules) + provider credentials | 2.0–2.5 |
| 2.4 | Client typed fields + Coverages table + client Insurance tab | 1.5–2.0 |
| 2.5 | Tasks core: extract mutators, `entityRef`+`instanceId`, auto-close subscriber, queue selector + saved-view store, linked-record card, `create_task` | 2.0–2.5 |
| 2.6 | "Load sample templates" mechanism + "Enable demo set" + sample bundle plumbing (also adds `AutomationRule.order`, N24) | 0.5–1.0 |
| | **Slice 2 total** (0.5+1.0+2.0+1.5+2.0+0.5 = 7.5; 1.0+1.5+2.5+2.0+2.5+1.0 = 10.5) | **7.5–10.5** |

- **Pages touched:** Settings (Billing setup), Client profile, Tasks, Process/Automation (template buttons, `create_task`, rule order), Integrations card, kiosk/portal (instance leftovers).
- **Mock data (spec §9):** 15 payers; 3 providers with NPIs; 1 billing entity; 2 locations (POS 11); 40 patients with typed demographics + coverages (from `canonicalClients` where `contactType === "Client"`); default + one payer fee schedule; the 8 sample queue views.
- **Demo script:** Billing setup → enter EIN/NPI/POS once; client Insurance tab → add primary + secondary coverage; Automation → "Load sample templates" (rules appear **disabled**); create a one-off rule (manual trigger) with `create_task` on an instance stage → a task appears in the **Insurance fixes** view with a linked-record card → drag the instance out of the stage on Deals → the task **auto-closes**.
- **Effort:** 7.5–10.5.

### Slice 3 — Eligibility and prior-auth nodes — **7.0–9.5 wks**

**Prerequisites from Slice 2 (this slice cannot start or demo without them):** Tasks core and queue views (2.5), client Insurance tab and Coverages (2.4), Billing setup incl. payers (2.3, needed for the prior-auth rules table 3.3), `recordWriter` + `fieldRegistryCore` (2.2), and "Load sample templates" + `AutomationRule.order` (2.6); from Slice 1: instances, `start_process`, roles/permissions, call-list separation. **Slices 1–3 are therefore sequential and together form the first RCM demo.**

| # | Item | Weeks |
|---|---|---|
| 3.1 | Field groups EG1–EG5 registered as reusable custom-field seeds (+ appointment/claim summaries) | 1.0–1.0 |
| 3.2 | `run_eligibility` (targets, result→stage map, dedupe window + copy-fresh, history row) + mock adapter (AAA-style reason codes) + resolver + benefit normalizer | 2.0–2.5 |
| 3.3 | `check_auth_required` / `request_prior_auth` + `priorAuthRulesStore` + Billing setup › Payers rules table (8-row sample) | 1.0–1.0 |
| 3.4 | `Appointment.coverage`, chip (list/calendar), detail Coverage tab, Schedule drawer Coverage + Verify now | 1.5–2.0 |
| 3.5 | Sample process + Set E rules (A1–A10, A13) + jobs button + Deals instance-card polish | 0.5–1.0 |
| 3.6 | `send_message`/`notify` mock + 4 sample templates + variables | 0.5–1.0 |
| 3.7 | Front-desk Check-in button + kiosk insurance/copay steps | 0.5–1.0 |
| | **Slice 3 total** | **7.0–9.5** |

- **Demo script:** Load sample templates → **Enable demo set E** (A1 runs first, A10 second via `order` 10 / 20, so A10 writes to the instance A1 created; disable A1 and re-book to show A10 falling back to the appointment only) → book an appointment for a "member not found" payer → an instance is created (card titled with the appointment) and lands in *Needs fix*; appointment chip amber; task in **Insurance fixes** → fix coverage on the client Insurance tab → re-run → *Verified*, chip green, task auto-closed → book a **second** appointment for the same client within 30 days → a **new instance** is created and the fresh verified result is **copied** (no new payer call; history row says "copied") → set the window to 0 → re-run calls the payer → book a service the rule table marks as needing auth → `request_prior_auth` records Authorization fields + a task in **Prior auth** → switch the mock scenario to inactive → red chip + task + message in Chats.
- **Effort:** 7.0–9.5.

### Slice 4 — Visit to claim — **10.0–13.0 wks**

| # | Item | Weeks |
|---|---|---|
| 4.1 | Multi-workflow claims: persist processes, `Claim.processId`, per-process required categories, Process claim tab, migration | 1.5–2.0 |
| 4.2 | `claimService` (one door) + `move_to_workflow` + claim Undo + claim events | 1.5–2.0 |
| 4.3 | Claims page: workflow selector, board per workflow (`PipelineBoard` extraction), per-workflow drawer sections on record properties, required-at-stage for claim fields | 2.5–3.5 |
| 4.4 | Scribe Codes panel + Sign + ophthalmology CPTs + `J06.9` fix | 1.5–2.0 |
| 4.5 | `create_claim` + `scrub_claim` + `submit_claim` + mock submission; builder reads billing entity/NPI/POS | 2.0–2.5 |
| 4.6 | Set C rules (A14–A20) + queue views + Invoices claim link/columns | 1.0–1.0 |
| | **Slice 4 total** | **10.0–13.0** |

- **Demo script:** Load sample templates → **Enable demo set C** → complete an eye-exam appointment → a claim appears in **Charge capture › Awaiting note** → sign the note, accept codes (RT/LT) → `move_to_workflow` → **Claim / Draft** → scrubber flags a missing modifier (*Scrub failed*, task in **Claim fixes**) → fix → *Ready to submit* → "Run daily jobs now" → *Submitted* → a mock 277CA rejects one → *Rejected* → resubmit; then **change the A14 variant** to "create at scribe signing" and show the clinic's automation decides claim timing without code.
- **Effort:** 10.0–13.0.

### Slice 5 — Money back — **5.0–6.5 wks**

| # | Item | Weeks |
|---|---|---|
| 5.1 | ERA staging + `post_remittance` + unmatched handling | 1.5–1.5 |
| 5.2 | Denial & appeal sample workflow + CARC/RARC categorization + `draft_appeal` + `move_to_workflow` rules (A25) | 1.5–2.0 |
| 5.3 | Invoice sample stages + `update_invoice_from_claim` + statement/payment-plan drawer + portal | 1.5–2.0 |
| 5.4 | Set M jobs/rules (A21–A30) + `check_claim_status` + `start_call` mock | 0.5–1.0 |
| | **Slice 5 total** | **5.0–6.5** |

- **Demo script:** **Enable demo set M** → "Receive ERA" → payments post; one line denies (CO-97) → the claim `move_to_workflow`s to **Denial & appeal › New denial** (task in **Denials and A/R**) → draft appeal → *Appeal submitted*; another claim is paid → its invoice moves to *Sent* with a payment link (logged in Chats) → advance the clock → *Reminder 1/2* → payment plan.
- **Effort:** 5.0–6.5.

### Slice 6 — Overview row, reports, permission wiring, polish — **3.5–5.0 wks**

| # | Item | Weeks |
|---|---|---|
| 6.1 | Overview RCM row (queue counts from Task views + KPIs) | 0.5–1.0 |
| 6.2 | Report sources (`claims`, `denials`, `payments`, `ar_aging`, `eligibility`) | 1.0–1.0 |
| 6.3 | A11/A12 (set E2) + per-event notification toggles | 0.5–1.0 |
| 6.4 | Voice `callPurpose` + mock call result into an instance | 0.5–1.0 |
| 6.5 | `hasPermission` checks wired into RCM pages/actions + audit entries + "Mock data" banner | 1.0–1.0 |
| | **Slice 6 total** | **3.5–5.0** |

- **Demo script:** manager's morning view on **Overview** (queue counts + KPIs, visible only with `rcmReports`) → open the **Prior auth** view → renew (E2) → Reports: denial rate by payer → a mock voice call lands in an instance's *Pending review* → accept.
- **Effort:** 3.5–5.0.

### Total (sum of slices)

| Slice | Low | High |
|---|---|---|
| 1 | 9.0 | 11.0 |
| 2 | 7.5 | 10.5 |
| 3 | 7.0 | 9.5 |
| 4 | 10.0 | 13.0 |
| 5 | 5.0 | 6.5 |
| 6 | 3.5 | 5.0 |
| **Total** | **42.0** | **55.5** |

Check: lows 9.0 + 7.5 + 7.0 + 10.0 + 5.0 + 3.5 = 42.0; highs 11.0 + 10.5 + 9.5 + 13.0 + 6.5 + 5.0 = 55.5.

**First RCM demo = Slices 1–3: 23.5–31.0 weeks** (lows 9.0 + 7.5 + 7.0 = 23.5; highs 11.0 + 10.5 + 9.5 = 31.0). Slice 3's demo depends on Slice 2 items (tasks and queue views, client Insurance tab and Coverages, Billing setup, `recordWriter`, `fieldRegistryCore`, template loading), so the three slices are sequential; nothing runs in parallel with Slice 3.

---

## 6. Open questions (only the real remaining ones)

**Closed:** Q-R1 (RCM Home = Overview row), Q-R2 (instances, not one card per client), Q-R6 (Billing setup access via permission keys), Q-R9 (role names via Team Roles & Permissions), and **Q7 — user → role resolution: adopt `TeamMember.roleId` + email lookup** (in Slice 1 item e; name matching stays only as a fallback for a throwaway prototype).

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | The old `insurance` entity process/tab: retire or keep dormant? | retire after claims migrate / keep | Retire after migration; keep the "Insurance & Claims" **label** for the claim tab |
| Q2 | Which categories (if any) are mandatory per process? | none / `submitted`+`paid` for the sample Claim workflow / today's four | Minimal per-process list (sample: `submitted`, `paid`); engine tolerates a missing category |
| Q3 | May instance moves ever write the single `client.stage`? | never / only for a client's primary process | Never; keep it non-authoritative |
| Q4 | Task auto-close: mark **completed** with `closedBy:"auto"`, or a distinct status? | completed + flag / new status | Completed + `closedBy` |
| Q5 | Per-workflow sections for claim drawers: add `workflowIds` to registry sections/fields? (scoping for the `claim` module is NC) | `workflowIds` / reuse `requiredStages`-style names | `workflowIds` |
| Q6 | **Instance lifecycle:** when is an instance completed/cancelled/archived (appointment cancelled or rescheduled; instance in a final stage), and which instance does the patient portal show? | close on appointment cancel + archive after N days; portal shows the latest active / a clinic-configurable rule | Cancel closes the instance; reschedule updates the same instance (dedupe key unchanged); **when several instances exist, the kiosk and the patient portal show the latest active instance** (this display rule is proposed; the lifecycle question itself stays open) |
| Q8 | Sample roles: ship as an "Add sample roles" action (recommended) or seed into `DEFAULT_ROLES`? | action / seeds | Action (keeps D6: nothing hard-coded) |

*Not questions (decided here):* roles move to a shared localStorage `rolesStore`; the Roles drawer's dead rows are removed or implemented; the six-slice structure replaces the spec's five (sizing); `recordType` stays `client` for client-process instances with `data.instanceId` (a separate `process_instance` record type is **NC**).

---

## 7. Spec deltas (`docs/rcm-flow-spec.md.md` differs from these decisions — spec not edited)

| # | Spec location | Spec says | Revision 4 |
|---|---|---|---|
| 1 | Title/scope, §4 intro | Describes fixed pipelines, stage sets and 30 automations as the flow | Framing: **architecture and capabilities**; every stage set/rule/queue/role is a **sample** |
| 2 | §2 | New sidebar pillar "Revenue Cycle" | No pillar; RCM lives in Deals, Claims, Tasks, Invoices, Appointments, Client profile, Overview |
| 3 | §2 table | 11 new screens | Mapped onto existing pages (§3.11, §3.8, §3.10) |
| 4 | §2 table, RCM Home | Dedicated "RCM Home" screen | **Overview row**, no page/sidebar item (D7) |
| 5 | §2 touchpoints | "Appointment card / calendar" chip | List column + calendar (the card component is dead code) |
| 6 | §2 Settings | "Billing setup" section | Tab gated by **permission keys** via `PermissionGuard` (D6) |
| 7 | §4 intro | "Six pipelines… replace the default Insurance and Claims and Claim processes" | Samples only; old `insurance` process retired after migration |
| 8 | §4 P1 | Eligibility check is a pipeline **entity**, one per appointment | **Action** `run_eligibility` writing to configured targets; sample process with **one instance per appointment** |
| 9 | §4 P2 | Authorization pipeline/entity | **Actions** `check_auth_required` + `request_prior_auth`; stages are samples |
| 10 | §4 P3 | Charge capture entity: encounter | Sample Claim workflow "Charge capture" |
| 11 | §4 P5 | Denial entity (per claim or line) | Sample workflow "Denial & appeal"; line detail in the Lines table |
| 12 | §4 intro | "Stage names map to a fixed system status… mapping table" | `systemCategory` optional; per-process minimal required categories |
| 13 | §4 P1 | Stages "Not checked/Checking/Self-pay" next to status values | Stage = state; no separate status enum |
| 14 | §5 F1.4 | Authorization record created in *Required* at booking | `check_auth_required` → `request_prior_auth` on the clinic's trigger |
| 15 | §5 F2.7 | Auto second check for another plan | `run_eligibility` parameter |
| 16 | §5 F2.2 | "skip if a verified-active check is under 30 days (configurable)" | Dedupe window (0 = always call) + **copy-fresh** result into a new instance |
| 17 | §5 F5.3 | Claim created after codes accepted | Claim-creation timing = clinic automation (`create_claim`, any trigger; 3 sample variants) |
| 18 | §6 intro | "26 events, 4 rule actions" | **18 generic actions** (§3.0.5), events on main's prefixes |
| 19 | §6 events | `eligibility.*`, `auth.*`, `encounter.*` | Action results + instance stage events; `coverage.*`, `claim.*`, `era.*`, `balance.*`, `task.*` |
| 20 | §6 catalog | A1–A30 define the automations | Same 30 as **sample rules**, shipped **disabled**, with demo sets E/E2/C/M |
| 21 | §6 A10–A11 | `create authorization` + `create_task` | Prior-auth node (`check_auth_required`/`request_prior_auth`), not a stage move |
| 22 | §6 note | Daily jobs via a button in RCM Home | Button on the **Automation** page header |
| 23 | §7 Appointment | `latestEligibilityCheckId` | `Appointment.coverage {instanceId?, status, checkedAt, summary}` |
| 24 | §7 entities | 16 entities (Eligibility check, Benefit line, Authorization, Encounter + dx/procedure, Claim event, Remittance, Denial, Payment plan…) | Field groups EG1–EG5 on instances/appointments/claims; child tables; **no Insurance/Encounter/Denial/Authorization entities** |
| 25 | §7 Claim | `encounterId` required | Claim carries its own visit data (appointment link) |
| 26 | §7 / D5 | Eligibility check per appointment; a client has one stage per process | **Multi-instance processes** (`instanceId`, dedupe key); automations per instance |
| 27 | §8 queues | "saved filtered view of Tasks" | Consistent; adds `entityRef` + `instanceId`, auto-close on stage exit, saved-view store (not on main) |
| 28 | §8 roles | Fixed role columns; "add a Billing module to permissions.ts" | **Permission keys** (`billingSetup`, `eligibility`, `priorAuth`, `claims`, `rcmPayments`, `denials`, `rcmReports`) assigned in Team › Roles; sample roles only |
| 29 | §9 decisions + slices | Build on `rcm-2`, port from `rcm`; five slices 3–4/3–4/4–5/4–5/2–3 (16–21 wks); A10–A12 unassigned | `main` only; **six slices, 42.0–55.5 wks** (Slice 1 = 9.0–11.0; first demo = Slices 1–3 = 23.5–31.0); A10 in Slice 3, A11–A12 in Slice 6 |
| 30 | Spec file | named `rcm-flow-spec.md.md`, untracked | rename + commit |

---

*What I did not verify:* anything at runtime (nothing was built or run); whether a stage rule really fires twice per client move (NC); whether a separate `process_instance` record type is needed (NC); where non-React code gets the org scope for registry reads (NC); `Settings.tsx` left-nav render site and tab filtering (NC); claim-module section scoping per workflow (NC); whether table/group field types render in all four drawers (NC); `createAppointment` automation gating (NC); which invoice stages are stored (NC); real stored `callLogs` data shapes for the migration (NC); how `automationExecutionEngine.ts`/rule executors import stores (NC).

# RCM Integration Plan — mantra-assist (MantraEHR + MantraAssist)

> Planning document only. No application code was changed. Generated 2026-11-13 from a read-only review of the working tree on `main` (with uncommitted changes to `src/types/task.ts`, `src/lib/useProcessStore.ts`, `src/app/pages/Process.tsx`, `src/app/components/tasks/Task*Drawer.tsx`) plus the `origin/rcm` and `origin/rcm-2` branches.
> Items marked **needs confirmation** are inferences or could not be verified from code.

## 0. Read this first — three findings that shape everything

1. **`docs/rcm-research.md` does not exist** — not in the working tree, not on `main`, `rcm`, `rcm-2`, or any other branch, and not in stashes. This plan therefore uses the four decisions you restated (clearinghouse-only behind our own interface; canonical eligibility/benefits schema "F2"; AAA resolver + benefits normalizer; voice agent as fallback). **The F2 schema itself was not available**, so §4 proposes a schema from first principles; reconcile it against F2 when the file is located. Likely candidates: it lives in another repo or was never committed.
2. **This repo is a front-end prototype with no backend.** Every entity lives in browser `localStorage`/`sessionStorage`. There is no database, no real auth, no tenant isolation, no job queue, no encryption, and no server-side audit trail. The only server code is three small Vercel handlers (`api/`) that call Groq. RCM (PHI + payer credentials + EDI) cannot be built on this; **Phase 1 must stand up a real backend**, and the 8-week Phase 1 target is not credible unless that backend already exists elsewhere (**needs confirmation** — see §6, Q1).
3. **RCM prior art already exists on two divergent branches** (`origin/rcm`, `origin/rcm-2`): a V1 spec (`MantraAssist_RCM_Spec.md`) and a v1.1 correction spec, with a substantial mock UI (`src/app/pages/rcm/*`, `rcmStore.ts`) on `rcm-2` and a mock 270/271 eligibility UI on `rcm`. These are UI/mock only — no vendor client, no AAA handling — and conflict with parts of your decisions (§1.12). They should be reconciled, not duplicated.

---

## Step 1 — Inventory of what exists today

### 1.1 Tech stack and structure

| Area | Today | Source |
|---|---|---|
| Frontend | React 18.3.1 (peerDependency, not hard-installed), Vite 6.3.5, TypeScript ^6.0.3 (`strict: false`), Tailwind 4.1.12, Radix/shadcn-style UI, MUI 7, recharts | `package.json`, `tsconfig.json` (include: `src` only — `api/` and `server/` are not type-checked) |
| Router | react-router 7.13 `createBrowserRouter`, SPA | `src/app/routes.tsx:109` |
| State | React Context + hand-rolled localStorage stores (`useXStore` hooks); cross-tab via `BroadcastChannel`/CustomEvents. No Redux/React Query | `src/app/context/*`, `src/lib/*Store.ts` |
| Tests | vitest; only 2 files in `src/lib/__tests__/` and 6 in `src/reception/__tests__/`. No CI config | `package.json` |
| Deploy | Vercel; single SPA rewrite excluding `/api/` | `vercel.json` |
| Origin | Figma Make export (`@figma/my-make-file`) | `package.json` |
| Other top-level | `admin-reference/` (Next-style admin reference, not read), many root-level avatar/image scripts (`*.cjs`), `dist/` committed | repo root |

### 1.2 Backend (all of it)

| File | What it does |
|---|---|
| `api/stt/transcribe.ts` | Base64 WAV → **Groq** Whisper (`whisper-large-v3-turbo`). Returns `{unconfigured:true}` on failure so client falls back to browser Web Speech |
| `api/onboarding/extract.ts` | Voice-onboarding NLU via **Groq** `llama-3.3-70b-versatile` |
| `api/process/simulate-reply.ts` → `server/routes/simulateStageReply.ts` | Deterministic keyword chat simulator (no LLM). CORS `*` |
| `server/routes/whisperStt.ts` | Re-export shim |
| `scripts/phorest_test.py`, `scripts/verify_reception_sync.ts`, `utility/test-whatsapp-webhook.js` | Manual test scripts; none are wired into the app |
| `vite.config.ts` | Dev-only `apiServerPlugin` mounts the handlers (plus `/api/public/pricing`, which does **not** exist in production) |

- **Database / ORM / migrations: none.** (grep for supabase, firebase, prisma, drizzle, postgres, mongodb, sqlite, knex, sequelize → no hits.) `FIELD_DATABASE.md` is a design document only.
- **API style:** ad-hoc JSON-over-POST; no versioning, OpenAPI, zod/validation, rate limiting, or auth on any endpoint. Errors use an in-band `{unconfigured:true}` with HTTP 200.
- **Env vars:** only `GROQ_API_KEY` (`.env.example`).
- **Anthropic:** `@anthropic-ai/sdk` is in `package.json` but imported **nowhere** (confirmed by grep of `src/`, `api/`, `server/`). "Anthropic" is only a label in `src/lib/aiModelsStore.ts`.
- **Declared-but-missing endpoints the UI already calls:** `/api/integrations/whatsapp/meta-signup-callback` (`Settings.tsx:~2468`); `https://api.mantraassist.com/v1/webhooks/org-webhook/incoming` is shown as docs text only (`Clients.tsx:~3885`).
- **Intended future backend:** `BACKEND_HANDOFF_SPEC.md` — covers only the AI Receptionist kiosk (REST `/api/v1/reception/*`, KMS envelope encryption with tenant-isolated keys, "zero PHI in logs", BAA checklist unchecked). It does not cover EHR data stores, auth, or RCM.

### 1.3 Persistence

~774 `getItem/setItem` call sites; no IndexedDB. Key stores (file → key):

| Domain | Key(s) | File |
|---|---|---|
| Clients | `clients` (+ `clients_demo`, `clients_<orgId>`) | `src/lib/clientsStore.ts` |
| Appointments | `appointments_v1` | `src/lib/appointmentService.ts:192` |
| Claims | `mantra_claims_v1` | `src/lib/claimsStore.ts:108` |
| Invoices / payments | `mantra_invoices_v1`, `mantra_payments_v1` | `src/lib/invoiceService.ts:38-39` |
| Tasks | `mantra_tasks_store` | `src/lib/tasksStore.ts` |
| Processes | `process_store_processes` | `src/lib/useProcessStore.ts` |
| Team | `mantra_team_members` | `src/lib/teamStore.ts` |
| Orgs | `mantra_organizations_v1` | `src/app/context/OrganizationContext.tsx` |
| Scribe | `scribeSessionsData` (sessionStorage) | `src/lib/scribeSessionStore.ts` |
| Activity | `activityEngine_v1` | `src/lib/activityEngine.ts` |
| Audit | `mantra_admin_audit_logs` | `src/lib/auditLogsStore.ts` |
| Integration creds + sync logs | plain-text in localStorage | `src/lib/integrationsRegistry.ts` |
| Face templates | `ma_reception_face_templates` | `src/reception/lib/api/mockMaClient.ts` |

### 1.4 Auth and multi-tenancy

- **Auth is fake.** `AuthContext.login()` sets `localStorage.auth_token = "dummy_token"`; no credential check; role defaults to `SystemAdmin` and is freely switchable (`src/app/context/AuthContext.tsx`). `ProtectedRoute` only checks the token exists. Logout does **not** clear PHI from localStorage.
- **Roles:** free strings (`src/app/config/navigation.ts:32`); used only to filter the sidebar. A richer RBAC model exists in types — actions read/add/edit/delete/export/import × scopes inherit/deny/own/role/all × 10 modules (`src/types/permissions.ts`, `src/lib/permissions.ts`) — but `canDoAction` is effectively unenforced. Separate admin RBAC: `src/lib/adminRolesStore.ts`. **No Biller/RCM role or module exists.**
- **Tenancy:** an `Organization` type and client-side org switcher exist (`OrganizationContext.tsx`, key `mantra_active_org_id_v1`), but data stores are **not partitioned by org** (e.g. `clients`, `appointments_v1`; only demo/signup workspaces get suffixed keys). Users are not bound to orgs. `/admin` is reachable from the same SPA. **There is no tenant isolation.**

### 1.5 Background jobs, events, automation (all in-browser)

- `src/lib/eventBus.ts` — in-memory pub/sub, not persisted, no retry. `src/lib/ruleEngine.ts` (1055 lines) subscribes to all events.
- **Events actually emitted:** `appointment.{booked,rescheduled,cancelled,completed,no_show,checked_in}` (`appointmentService.ts:837-1151`), `client.checked_in`, `stage.entered`, `invoice.{created,sent,paid,partially_paid,overdue,voided}` (`invoiceService.ts:710-950`).
- **Cataloged but never emitted:** `claim.*` (created/submitted/accepted/denied/paid), `insurance.*` (eligibility_checked/verified/failed), `task.*` (`useAutomationStore.ts:~198-235`). Confirmed: no `emit("claim.` / `emit("insurance.` call exists.
- **Rule actions that actually execute:** condition, field update, move-to-stage, `generate_invoice`, `generate_document`, `scheduleappointment`, `send_invoice`/`send_payment`. **WhatsApp/SMS/email/call/webhook steps exist only as UI config** — nothing is sent.
- **No cron / scheduler / queue / worker.** "Wait" steps use `setTimeout` (dies with the tab). `automationExecutionEngine.ts` has no production caller. Only periodic checks: `invoiceService.checkOverdueInvoices()` on mount and a 60s task-overdue interval in the browser.
- **No "create task" automation step and no "create claim" action.**

### 1.6 Integrations (real vs mock)

| Integration | Status |
|---|---|
| Groq Whisper STT / Llama NLU | **Real** HTTP (not HIPAA-eligible by default; no BAA) |
| Browser Web Speech (Chrome → Google) | Real, fallback |
| Phorest | Spec (`PHOREST_INTEGRATION_PRD.md`) + manual Python script only |
| WhatsApp / SMS / Email | Simulated (`whatsappMockConversations`, `mailboxStore.ts`, `emailAgentStore.ts`); no webhook receiver, no delivery |
| Telephony (Twilio/Exotel/Plivo/Telnyx; VAPI default label) | **Mock data store** (`src/lib/telephonyAdminStore.ts`); no call is placed |
| Payments | **Mock** (`pay.mantraassist.mock` links, `invoiceService.ts:~693`); no Stripe/Razorpay SDK |
| Epic / Athena / Cliniko / Healthie etc. | Manifest + credential form only (`src/lib/integrationsRegistry.ts`); no sync runner |
| **Clearinghouse / eligibility / EDI** | **Not registered.** `submitClaimElectronically` (`claimsStore.ts:434`) is a 1.2s `setTimeout` fabricating a tracking ID and "999 ack" text |
| AI Scribe | UI timer + canned sample data; no real recording/transcription found in `AIScribePopup.tsx` |

Reusable pattern: `integrationsRegistry.ts` already has `SyncModuleGroup` including `rcm`, capabilities `rcm.invoices` / `rcm.payments`, a config drawer, and a sync-log UI. A clearinghouse manifest (`rcm.eligibility`, `rcm.claims`, `rcm.era`) fits this pattern.

### 1.7 Domain entities (fields + gaps)

**Patient/Client** — `src/data/canonicalClients.ts:4-30`, store `src/lib/clientsStore.ts`. A generic CRM `Client` (`id,name,email,phone,country,processes[],stage,responsible,status,source,contactType,age?,gender?, …, [key:string]:any`). **No patient entity. No DOB, sex (only free-text `gender`), address, SSN, or member ID as defined fields** (`CreateClaimDrawer.tsx:202-206` reads `(cl as any).dob`). Custom-field layer (`FieldRegistryContext.tsx`, `FIELD_DATABASE.md`) stores per-record `fieldValues` dictionaries, so DOB/insurance *could* be added as registry fields, but they are untyped. `PRODUCT_STRUCTURE.md:160` claims ClientProfile has "Vitals, Insurance, Emergency Contacts" — **no such data model exists**. (An editable insurance section exists on `rcm-2`.)

**Provider** — `TeamMember` in `src/lib/teamStore.ts:3-21` (`id,name,email,phone,role,department,organizationId,assignedServices,availability,…`). **No NPI, taxonomy, license, DEA, specialty** (grep NPI in `teamStore.ts` = 0). Only licence-like field: `ScribeDoctor.regNumber` (`scribeSessionStore.ts:317`), a hard-coded demo list not linked to TeamMember. NPIs exist only as free text on `Claim`.

**Clinic/Organization** — `Organization` in `OrganizationContext.tsx:3-31`. **No NPI, taxonomy, tax ID/EIN, structured address, or place of service.** A `registrationIdType`/`registrationNumber` pair ("EIN") exists only as Settings UI state (`Settings.tsx:889-897`) and registry fields — not on the typed model. Locations are plain strings; no Location entity. Billing-provider NPI/Tax ID/address/POS are typed free-text **per claim** with hard-coded defaults (`CreateClaimDrawer.tsx:84-89`; seeds in `claimsStore.ts:127-130`).

**Appointment** — `appointmentService.ts:122-157` (`id,clientName,clientEmail,clientPhone,employeeId,serviceId,date,time,duration,status,clientId?,invoiceId?,location?,roomName?,source?,…`). Client link is denormalized by name/email/phone (`clientId` optional). **No claim link, no scribe link, no insurance field** (`primaryInsurance`/`secondaryInsurance` are type-only in `ScheduleAppointmentDrawer.tsx:79-80`, never persisted).

**Encounter** — **does not exist.** Closest: `ScribeSession` (`scribeSessionStore.ts:63-93`) with `ExtractedClinicalData` (chief complaint, vitals, free-text diagnosis, **one** `icd10Code` string, meds, advice). Prescription-style, not SOAP/E&M; **no CPT output, no modifiers, no level-of-service**. Stored in `sessionStorage`. Claim↔scribe link is display-only (`CreateClaimDrawer.tsx:247-257, 712-721`).

**Codes** — `src/lib/icdCodes.ts` (~32 codes, 6 ophthalmology), `src/lib/cptCodes.ts` (~36 codes; **no ophthalmology category** — seed claims use 92004/92014/76519/92083 not in the list). No modifiers list, fees, RVUs, NCCI, HCPCS (beyond dental D-codes). `Service.cptCode?` is a single free-text code per service (`servicesStore.ts:11-42`); **no fee schedule, no multi-CPT per service, no payer-specific pricing.**

**Insurance/Coverage** — **no standalone entity.** Only: embedded `Claim.payer/insuredId/groupNumber`; `ClaimPayer` + 7 hard-coded `POPULAR_PAYERS` (`claimsStore.ts:98-106`); registry text fields (`payer_name`, `policy_number`, `prior_auth_number`, `FieldRegistryContext.tsx:2061-2095`); `Payment.insurancePayer/claimRefNumber` (`invoiceTypes.ts`); process/stage labels. **No subscriber/guarantor, secondary payer, copay/deductible, eligibility, prior-auth record, insurance card capture.**

**Claim** — `src/lib/claimsStore.ts:40+` (498 lines), UI `src/app/pages/Claims.tsx` + `src/app/components/claims/{CreateClaimDrawer,ClaimDetailDrawer,ClaimStatusModal,ClaimSubmissionModal,CMS1500Modal}`. Fields: patient demographics (duplicated onto claim), `insuredId`, `groupNumber`, `payer`, `appointmentId/invoiceId/scribeSessionId/serviceId?`, rendering/billing provider name+NPI (free text), `billingProviderTaxId?`, `placeOfService`, `serviceDate`, `diagnosisCodes[A–D]`, `lines[{cptCode, modifier?(single), diagnosisPointer, units, chargeAmount}]`, `totalCharge`, `amountPaid`, `patientResponsibility?`, `contractualAdjustment?`, `status` (Draft…Rejected), `submissionMethod`, `clearinghouse*`, free-text `rejectionReason`, `ediControlNumber`. **Missing:** CARC/RARC, denial/appeal dates, timely-filing, aging, ERA/835, per-line adjustments, payment history, scrubbing, assignee, audit trail, eligibility/prior-auth link. Seed claims reference IDs `CL-001..005` whose names don't match `canonicalClients` (no FK integrity). Claims are **never auto-created** from appointment/invoice events (manual only). `IMPLEMENTATION_PROGRESS_REPORT.md:171-185` lists "Phase 5: Insurance & Claims" as planned, not done.

**Invoices/Payments (clinic→patient)** — `src/app/types/invoiceTypes.ts`, `src/lib/invoiceService.ts` (1021 lines): `ClientInvoice` (line items, totals, `paymentType: self_pay|insurance|write_off`, `appointmentId`, `paymentLinkUrl` mock), `Payment` (methods incl. `card_on_file`, `check`, `payment_link`; `insurancePayer`, `claimRefNumber`, `writeOffReason`). Write-off reasons include `timely_filing`. **No refunds, no patient statements, no superbill model, no payment gateway.** Distinct from **SaaS subscription billing** (`plansBillingStore.ts`, `ordersBillingStore.ts`, `Payments.tsx`, `Transactions.tsx`) — that is MantraAssist's own revenue, not clinic revenue (`PRODUCT_STRUCTURE.md:166` conflates them). "AI RCM" exists as a plan SKU (`plansBillingStore.ts:~2749`).

**Services** — `servicesStore.ts` (flat `price`, `cptCode?`, location/room/employee maps). Seed services are generic (99204 $150, 99213 $75, dental, imaging) — **no ophthalmology services.**

### 1.8 Tasks / work queues

`src/types/task.ts`, `src/lib/tasksStore.ts` (1328 lines), `src/app/pages/Tasks.tsx`, `TaskDetailPage.tsx`, `src/app/components/tasks/*`. `TaskEntity`: `id,code,title,description,status(pending|in_progress|review|completed|deferred),isImportant(boolean only),assignee/assignees/responsiblePeople,deadline*,timePlanning,recurrence,checklists,subtasks,observers,attachments,stageId/workflowId`. **Does not exist:** link from task to client/appointment/claim/invoice (`assignee.clientId` = who does it, not what it is about); queue entity; routing/auto-assign; SLA/aging; priority levels; amount-at-stake; a recurrence materializer (config only); an automation "create task" step; emitted `task.*` events. `tasksStore.createTask` is programmatically callable. Task processes exist (`DEFAULT_ENTITY_PROCESSES.task`, `useProcessStore.ts:798`).

### 1.9 CRM pipelines / campaigns / "leads"

`src/lib/useProcessStore.ts` (1667 lines): `Process` has `entityType: client|appointment|invoice|insurance|claim|task` (`:92`), stages with `stageCategory`, `systemCategory`, `workflowSteps`, `nextProcessTransitions`, call/chatbot settings. **Default `insurance` ("Insurance and Claims": Draft & Intake → Coverage Verified → Submitted (837P) → Under Review → Paid & Settled → Denied) and `claim` ("Draft → Submitted → In Review → Paid → Denied") processes already exist** (`:756-800`). `Deals.tsx` is a kanban of client-process stages with `amount` and `responsible`. Caveats: `moveClaimToStage` (`claimsStore.ts:467`) maps stage names to a fixed `ClaimStatus` via substring match; claim processes are filtered out of the Workflows list; `EntityType` is duplicated in `workflow.ts`; no stage-age/SLA; no "queue-item" entity (a denial *case* would be a new entity). **Campaigns** exist only as WhatsApp template-send enrollment (`Chats.tsx`, `whatsappCampaigns`); **no lead entity** (a lead is a client in an intake process).

### 1.10 Communications

Channels: whatsapp/sms/website/email/companion (`src/constants/channels.ts`). `useConversations.ts`, `Chats.tsx` — simulated. WhatsApp templates with `{{variable}}` mappings and an approval flow (`useWhatsappTemplates.ts`, `Chats.tsx:129`); **payment link is not a first-class template variable.** `invoiceService.sendInvoice(id, channel)` only marks `sentVia` and emits `invoice.sent`. `emailAgentStore.ts` (AI email triage config, entity types incl. Patient/Deal) is relevant to payer-email triage. Notifications: in-app + browser push (`notificationsStore.ts`); `notificationSettingsStore.ts` already has "clearinghouse alerts" toggles.

### 1.11 Voice agent

- `src/reception/**` is an **in-clinic kiosk avatar** (walk-in/QR/face check-in, Whisper STT), *not* a phone agent. Prod contract is `BACKEND_HANDOFF_SPEC.md`.
- **Phone AI is configuration UI only:** `src/app/pages/MyAIReceptionist.tsx` (4157 lines: greeting, custom commands, KB, transfer/booking scenarios), per-stage `CallTriggerSettings` (`useProcessStore.ts:27`: calling hours, retries, voicemail detection, transfer, aiModel/voice), in-call step catalog (`callaction, callhangup, fetchavailability, scheduleappointment, collectinformation, webhook_trigger`), `CallLogs.tsx` (hard-coded 100 calls), `telephonyAdminStore.ts`. Provider labels: VAPI (default), Twilio, Telnyx, etc.; TTS: OpenAI/ElevenLabs/Cartesia; LiveKit/Dograh credentials as labels. **No telephony/voice runtime exists.**
- **Absent for payer calls:** IVR/DTMF navigation, hold detection, business-caller mode, structured output extraction (reference number, benefit values), write-back to a claim/coverage record. The prompt/flow config is patient-centric.

### 1.12 Audit, activity, reports

- `auditLogsStore.ts`: admin-console actions only (modules Organizations/Users/Plans/Roles/…), in localStorage → **writable/deletable by anyone**, no PHI-access events, no Claims/Billing/Patients module.
- `activityEngine.ts`: per-client timeline incl. message text, scribe diagnosis, transcript previews — **PHI in plain localStorage**.
- Reports: `reportEngine.ts` custom report builder; data sources `calls, appointments, revenue, clients, team, messaging, processes` — **no claims source, no payer/denial/A-R metrics**. `Overview.tsx` has no financial KPIs.

### 1.13 PHI handling today

| Question | Answer |
|---|---|
| Stored | Plain-text JSON in localStorage/sessionStorage (clients, appointments, claims CPT/ICD, scribe transcripts, forms, chats, call logs, face embeddings, **integration credentials**) |
| Encrypted | **No.** No encryption, hashing, redaction, de-identification, retention/purge code anywhere. Scribe `retentionDays: 90` is a setting nothing enforces |
| Logged | 277 `console.*` calls; `Appointments.tsx:442` logs `clientName`; `ruleEngine.ts` logs record IDs |
| Third parties | Kiosk audio → **Groq** (no BAA/ZDR); Chrome Web Speech → Google; `ui-avatars.com` seed URLs embed names |
| Audit | See 1.12 — not a compliance-grade trail |
| Compliance claims | "HIPAA compliant / AES-256 / BAA" appear only as marketing copy (`AIScribePopup.tsx:604`, `plansBillingStore.ts:480,591,665`, `AdminKnowledgeBase.tsx:431`); **none backed by code** — a legal/claims risk once RCM ships |

### 1.14 Prior RCM work on other branches (not on `main`)

| Item | `origin/rcm` | `origin/rcm-2` |
|---|---|---|
| Docs | `MantraAssist_RCM_Spec.md` (V1: Track A engagement vs Track B revenue-cycle state machine; Encounter is the seam; "Revenue Cycle" sidebar pillar; AI proposes/human confirms) | + `MantraAssist_RCM_Correction_Spec_v1.1.md` (clientId integrity, insurance section, Insurance Intake worklist, claim detail drawer, Defer action, assignee, Patient Balances) |
| Code | `src/lib/insuranceStore.ts`, `EligibilityDetailDrawer.tsx`, eligibility panel in `AppointmentDetailDrawer.tsx`, "EDI 270/271 Engine" in `ScheduleAppointmentDrawer.tsx` (hard-coded "Athelas clearinghouse"; mock) | ~60 files / ~40k lines: `src/lib/rcmStore.ts`, `RcmContext.tsx`, `rcmTypes.ts`, 16 pages under `src/app/pages/rcm/*` (EligibilityWorklist, ClaimsList, DenialBoard, PaymentPostingWorklist, PriorAuthList, RejectionsWorklist, …), `ClientInsurance`/`GuarantorDetails`/`InsuranceCase` types, `deferClaim()` |
| Overlap | The two branches diverge (rcm-2 lacks rcm's eligibility commits `9f1fc94, 0b39b09, 4ffbcdc`); **two competing insurance models** (`insuranceStore.ts` `ClientInsuranceRecord` vs `ClientInsurance`) | |

**Conflicts with the decisions in this brief:**
1. *Connectivity:* specs treat the clearinghouse as a "stubbed integration point"; **no interface exists**. `rcm` UI hard-codes vendor branding ("Athelas").
2. *Canonical schema:* spec `EligibilityCheck` (§5.1) is thin (status, copay, deductibleRemaining, memberId) — **no coinsurance, per-service-type (STC) benefits, in/out-of-network, OOP max, plan dates, trace IDs.** Must be replaced by the canonical schema.
3. *Resolver:* **no AAA taxonomy**; everything collapses to `inconclusive` + free-text hints.
4. *Voice fallback:* absent. The spec's AI-governance rule ("no AI output that moves money applied without Accept/Edit/Decline") means voice-derived benefits must land in a **pending-review** state.
5. *Risk:* the `rcm` branch's mock "270/271" can be mistaken for live data.

---

## Step 2 — Each RCM stage in our terms

| # | Stage | What it is and how it works in our product |
|---|---|---|
| 1 | **Registration & insurance capture** | Collect payer, member ID, group, subscriber/guarantor and card images at booking/check-in/portal. Today there is no coverage entity; we add a first-class `coverage` record on the Client (ClientProfile, `patient/PatientRegisterScreen`, kiosk `ScheduledCheckinPanel`, `ScheduleAppointmentDrawer`'s unused `primaryInsurance` fields). The `rcm-2` `ClientInsuranceEditor`/Insurance Intake worklist is the UI starting point. DOB/sex/address must become typed patient fields. |
| 2 | **Eligibility & benefits (270/271)** | Real-time or batch inquiry via the connectivity interface; 271 normalized into the canonical `eligibility_check`/`benefit_line` and summarized as active/inactive/inconclusive + copay/deductible/coinsurance/OOP. Triggers: appointment booked/rescheduled (`appointment.booked` already emitted), nightly batch for next-day appointments (**needs a scheduler**), manual "Re-run" on AppointmentDetailDrawer. The resolver handles AAA rejections; voice agent is last-resort fallback. |
| 3 | **Prior authorization** | Flag services/payers that need auth (rule table keyed by payer × CPT), track an `authorization` record (number, approved units, dates, visit count) and block/warn at scheduling when missing. Phase 1–2 = tracking only (the `rcm-2` PriorAuthList is a UI base); Phase 3 = readiness checks and 278 via vendor. Tasks surface missing auths. |
| 4 | **Charge capture** | Convert a completed visit into charge lines. Trigger = `appointment.completed` + documentation signed. Needs a new **Encounter** entity (no equivalent today) that ties appointment + provider + scribe note + service lines. Services get multiple CPT/modifier mappings and a fee schedule; scribe extraction must output procedures, not only one ICD. |
| 5 | **Coding** | Assign ICD-10 (with pointers) and CPT/HCPCS + modifiers to the encounter. AI Scribe proposes; coder/provider accepts. Extend `icdCodes.ts`/`cptCodes.ts` (currently ~32/36 codes) to a full licensed code-set lookup incl. ophthalmology (92xxx, 66984 + modifiers RT/LT/50, 76519). AI suggestions are always Accept/Edit/Decline. |
| 6 | **Claim scrubbing** | Pre-submission validation: required NPI/tax ID/POS, dx-pointer validity, code/modifier edits (NCCI), eligibility active, auth present, timely-filing window, payer rules. Runs as a queued job producing `scrub_result` items; failures create work items. Replaces today's no-validation `CreateClaimDrawer`. |
| 7 | **Claim submission & acknowledgments** | Build 837P from `claim`/`claim_line`, submit via adapter, ingest 999 (syntactic) and 277CA (payer acceptance/rejection) as `claim_event`s. Replaces `submitClaimElectronically`'s fake setTimeout. Rejections (pre-adjudication) go to a rejections queue; denials are separate. |
| 8 | **Claim status (276/277)** | Scheduled polling of in-flight claims past an expected-adjudication window; normalizes status/category codes to `claim_event`; auto-escalates stale claims to the A/R queue. Needs a scheduler. Phase 3. |
| 9 | **Remittance & payment posting** | Fetch 835 ERAs, match to claims (by payer claim control #/patient control #), post payment + CARC/RARC adjustments per line into `remittance`/`adjustment`, compute patient responsibility and push to patient billing. Replaces scalar `amountPaid`/`contractualAdjustment`. Manual EOB entry remains as a fallback (RecordPaymentModal extension). |
| 10 | **Denial management** | Each denial → `denial` record with CARC/RARC category, root-cause, appeal deadline, owner. Worked in a Kanban/queue (reuse Process stages + `Deals`-style board), with fix-and-resubmit, appeal letter drafting (AI proposes, human sends), and cluster views by payer/code (`rcm-2` DenialBoard). |
| 11 | **Patient billing & collections** | After insurance settles, move patient responsibility to `ClientInvoice` (extend with `claimId`, `insurancePaidAmount`), statements, payment links (needs real PSP), payment plans, cards on file. Pre-visit cost estimates (Phase 3) use benefit_lines + fee schedule. Messaging via WhatsApp/SMS templates with a payment-link variable. |
| 12 | **A/R follow-up work queues** | Aging buckets (0–30/31–60/61–90/90+) per payer and patient; queue items for unpaid/underpaid/stale claims, assigned with SLA and priority. Needs the task/work-queue extension (§3) and daily aging job. |
| 13 | **Reporting** | Add `claims`, `denials`, `remittance`, `ar_aging`, `eligibility` data sources to `reportEngine.ts`: clean-claim rate, first-pass acceptance, denial rate by CARC/payer, days in A/R, net collection rate, eligibility failure rate, time-to-post. Surfaces in `Reports.tsx`/`Overview.tsx`. Computation should move server-side. |

---

## Step 3 — Feature-to-codebase map

Effort key (engineer-weeks, **rough, needs confirmation**): S ≤ 1, M 2–4, L 5+. Assumes a backend platform already exists (see "Foundation" row, which is the largest item).

| RCM feature | Existing module/files to extend | New module needed | Reuses existing capability | Data-model changes | Effort |
|---|---|---|---|---|---|
| **Foundation: backend platform** (DB, authn/z, tenancy, queue, encryption, audit) | `BACKEND_HANDOFF_SPEC.md` (pattern), `src/app/context/AuthContext.tsx`, `OrganizationContext.tsx`, `permissions.ts` | `server/` service: Postgres + ORM + migrations, session/JWT auth, org-scoped row-level isolation, job queue/scheduler, KMS, PHI audit log | Org model; RBAC type shapes | All entities below move from localStorage to DB | **L (8–14+)** |
| Registration & insurance capture | `ClientProfile.tsx`, `patient/*Register*`, `ScheduleAppointmentDrawer.tsx:79-80`, `clientsStore.ts`, `FieldRegistryContext.tsx`; reuse `rcm-2` `ClientInsuranceEditor` | `coverage` module + card upload | Client custom-fields, documents store, kiosk check-in | `patient` typed fields (DOB, sex, address); `coverage`, `subscriber/guarantor`; `appointment.coverage_id` | M |
| Eligibility & benefits | `AppointmentDetailDrawer`, `AppointmentCard` (chip), `integrationsRegistry.ts` (`rcm.eligibility`), `rcm`-branch `EligibilityDetailDrawer` | `connectivity` interface + 1 adapter; `eligibility` service; **resolver**; **benefits normalizer** | Scheduling (`appointment.booked`), activity timeline, notification settings | `payer`, `payer_profile`, `eligibility_check`, `benefit_line`, `eligibility_raw` | L |
| Nightly batch eligibility | `appointmentService.ts` (date-range query) | Scheduler job: "T+1 appointments" | Scheduling | `eligibility_check.trigger`, idempotency key | S–M (after queue) |
| Prior authorization | `useProcessStore` insurance stages, `rcm-2` PriorAuthList | `authorization` module; payer×CPT requirement rules | CRM tasks, appointments | `authorization`, `auth_requirement_rule` | M |
| Charge capture | `appointmentService.ts` (`appointment.completed`), `invoiceService.createInvoiceFromAppointment`, `servicesStore.ts` | `encounter` + `charge` module | Event bus, Services catalog, scribe session link | `encounter`, `encounter_charge`, `service_cpt_map`, `fee_schedule`, `fee_schedule_item` | L |
| Coding | `scribeSessionStore.ts` (`ExtractedClinicalData`), `icdCodes.ts`, `cptCodes.ts`, `CreateClaimDrawer.tsx` | Code-set service (ICD-10-CM/CPT/HCPCS/modifiers licensed data), coding review UI | AI Scribe, Anthropic SDK (already a dependency; unused) | `encounter_diagnosis`, `encounter_procedure`; scribe output gains procedures | M–L |
| Claim scrubbing | `CreateClaimDrawer.tsx`, `claimsStore.ts` | `scrub` engine + rule table | Task/queue (failures) | `scrub_rule`, `scrub_result` | M |
| Claim submission & acks | `claimsStore.ts:434` (replace mock), `Claims.tsx`, `ClaimSubmissionModal/StatusModal`, `CMS1500Modal` | 837P builder; 999/277CA parser; `submitClaim` adapter method | Event bus (`claim.*` events), notifications | `claim`, `claim_line`, `claim_event`, `claim_batch` (+ migrate existing Claim) | L |
| Claim status | `ClaimStatusModal.tsx` | 276/277 poller | Scheduler; tasks | `claim_event` (status), `claim.next_status_check_at` | M |
| ERA & payment posting | `RecordPaymentModal.tsx`, `invoiceService.recordPayment`, `rcm-2` PaymentPostingWorklist | 835 parser, auto-matcher, posting engine, `fetchRemittances` | Invoices/Payments | `remittance`, `remittance_claim`, `adjustment` (CARC/RARC), `payment.remittance_id` | L |
| Denial management | `useProcessStore` claim process, `Deals.tsx`, `rcm-2` DenialBoard | `denial` module; appeal drafting | **CRM process/stages**, tasks, Anthropic SDK (drafts) | `denial`, `appeal`; stage↔status mapping fix | M–L |
| Patient billing & collections | `invoiceTypes.ts`, `invoiceService.ts`, `PatientBillScreen/PaymentScreen`, `RecordPaymentModal` | Real PSP integration (Stripe etc.), statements, payment plans | WhatsApp/SMS templates, `send_invoice` rule action, kiosk QR payment | `ClientInvoice.claim_id/insurance_paid`, `statement`, `payment_plan`, `refund`, `payment_method_token` | L |
| Pre-visit cost estimate | `ScheduleAppointmentDrawer`, WhatsApp templates | `estimator` | Scheduling, patient messaging, `variableMappings` | `estimate`, uses `benefit_line` + fee schedule | M |
| A/R & denial work queues | `tasksStore.ts`, `Tasks.tsx`, `TaskEntity`, process stages | `work_queue` (queue, routing, SLA) | **CRM tasks/pipelines**, notifications | Task gains `entityRef{type,id}`, `priority`, `queueId`, `slaDueAt`, `payerId`, `amountAtStake` | M |
| Resolver-created enrollment tasks | same as above | Resolver→task action | Tasks | `task.source='resolver'`, `payer_enrollment` | S |
| Voice: payer benefit call (fallback) | `MyAIReceptionist.tsx`, `CallTriggerSettings`, `telephonyAdminStore`, `CallLogs` | **Server-side voice runtime** + payer-call agent + IVR/DTMF + structured extraction | Voice config UI, call logs, `fetchavailability`-style tools | `eligibility_check.source='voice'`, `call_session`, `pending_review` status | L |
| Voice: patient balance reminder | stage `CallTriggerSettings` (retries, hours, voicemail) | Balance-reminder script | Voice agent, invoices | `collection_contact_log` | M |
| Patient messaging (estimates/payment links) | `useWhatsappTemplates.ts`, `Chats.tsx`, `invoiceService.sendInvoice` | Real WhatsApp/SMS delivery + webhooks; payment-link variable | Templates, campaigns | `message_template` variable `payment_link`, `estimate_url` | M |
| Reporting | `reportEngine.ts`, `Reports.tsx`, `invoiceTypes.ts` report types | Server-side aggregates | Report builder | New sources; materialized views | M |
| RBAC: Biller role | `permissions.ts`, `src/types/permissions.ts` | `billing`/`rcm` module + role | Existing RBAC shape | `role`, `permission` (server-enforced) | S–M |
| Audit (PHI access) | `auditLogsStore.ts` | Server-side append-only audit | Audit entry shape | `audit_log` (immutable) | M |

---

## Step 4 — Architecture proposal

### 4.1 Where things live

`src/` is a browser bundle; **connectors and credentials must not run in the browser.** Proposal (**needs confirmation** against whatever backend you intend — see Q1):

```
server/                         (new; or a separate repo/service)
  api/                          REST /api/v1/* (zod-validated, authn + org-scoped authz)
  rcm/
    connectivity/
      types.ts                  vendor-agnostic interface + canonical request/response types
      registry.ts               routes (org, payer, transaction) -> adapter
      adapters/
        stedi/                  adapter #1 (Phase 1)   <- vendor: needs confirmation
        claimmd/ availity/      later (Phase 3)
        mock/                   deterministic fixtures for dev/tests (replaces fake setTimeouts)
    eligibility/
      service.ts                orchestration, de-dup, caching
      resolver/                 AAA code -> category -> action
      normalizer/               271 -> canonical benefit_line
    claims/ (builder, scrubber, submission, status)
    remittance/ (835 parser, matcher, posting)
    denials/ , billing/ , estimates/
  jobs/                         queue workers + scheduler (nightly batch, status polling, aging)
  security/                     KMS envelope crypto, PHI audit, tenant context
  voice/                        payer-call runtime (Phase 1b)
src/ (existing)                 UI calls /api/v1; stores become thin API clients
```

### 4.2 Connectivity interface (vendor-agnostic)

```ts
interface Connectivity {
  readonly vendor: string;
  capabilities(): { eligibility: boolean; claims: boolean; status: boolean; era: boolean; realtime: boolean };

  checkEligibility(req: EligibilityRequest): Promise<EligibilityOutcome>;
  submitClaim(req: ClaimSubmission): Promise<SubmissionReceipt>;       // 837P in; ack handle out
  getClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusOutcome>; // 276/277
  fetchRemittances(req: { since: Date; cursor?: string }): Promise<RemittancePage>; // 835 pull
  // optional: getAcknowledgments(since), enrollPayer(req), listPayers()
}

type EligibilityRequest = { tenantId; requestId /*idempotency*/; payerId /*vendor-neutral payer key*/;
  provider: { npi; taxId? }; subscriber: { memberId; firstName; lastName; dob; groupNumber? };
  dependent?: {...}; serviceTypeCodes: string[]; serviceDate: string };

// Never throws for payer-level failures; returns a typed outcome the resolver consumes:
type EligibilityOutcome =
 | { kind: 'response'; raw: RawArtifactRef; benefits: ParsedBenefits; traceIds: {...} }
 | { kind: 'aaa_reject'; codes: { code: string; followUp?: string }[]; raw: RawArtifactRef }
 | { kind: 'transport_error'; retryable: boolean; detail: string }; // timeout, vendor 5xx
```

Rules: adapters translate vendor JSON/EDI ↔ canonical types **only**; no vendor type escapes the adapter; every call stores the raw payload (4.5); the registry picks the adapter per (tenant, payer, transaction), enabling vendor routing in Phase 3.

### 4.3 Canonical tables

All tables carry `tenant_id` (org) and standard timestamps; PK/FK detail **needs confirmation**. Reconcile with research §F2 once located.

| Table | Purpose / key columns |
|---|---|
| `patient` | typed demographics: `dob, sex, address, phone, email`; replaces untyped `Client` fields for clinical use (Client remains CRM contact; link `client_id`) |
| `provider` | `team_member_id, npi (type 1), taxonomy, license, specialty` |
| `organization_billing` / `billing_entity` | `legal_name, tax_id, group_npi (type 2), taxonomy, address, default_pos`; per-location `location` table (NPI optional, POS) |
| `payer` | canonical payer: `id, name, type, clearinghouse_payer_ids (jsonb per vendor), supports_{270,837,276,835}, requires_enrollment` |
| `payer_profile` | per (tenant, payer) overrides: routing vendor, enrollment status, claim filing rules, timely-filing days, eligibility quirks (needs name/DOB variants, STCs) |
| `coverage` | `patient_id, payer_id, member_id, group, plan, subscriber_id, relationship, priority (primary/secondary), effective/term, card_front/back doc refs, status, last_verified_at` |
| `eligibility_check` | `coverage_id, appointment_id?, trigger (booking/nightly/manual/voice), status (active/inactive/inconclusive/pending/…), resolver_category, attempt_no, parent_check_id, source (clearinghouse/voice/manual), pending_review bool, request_hash, requested_at, responded_at, vendor, trace_ids` |
| `benefit_line` | `eligibility_check_id, service_type_code, coverage_level (IND/FAM), network (in/out/na), benefit_kind (copay/coinsurance/deductible/oop_max/limit/auth_required), amount/percent, remaining, period (calendar/plan-year/visit), message` |
| `eligibility_raw` | encrypted raw 270/271 (or vendor JSON) per check; 4.5 |
| `authorization` | `coverage_id, cpt/service scope, auth_number, units_approved/used, dates, status` |
| `encounter` | `appointment_id, patient_id, provider_id, location_id, scribe_session_id, status, signed_at` + `encounter_diagnosis`, `encounter_procedure` |
| `claim` | `encounter_id, coverage_id, payer_id, status (draft/scrubbed/ready/submitted/accepted/rejected/denied/paid/…), billed, allowed, paid, patient_resp, payer_claim_control_no, submitted_at, timely_filing_due, assignee_id, queue_id` (migrates `Claim` in `claimsStore.ts`) |
| `claim_line` | `cpt, modifiers[4], dx_pointers[], units, charge, pos, service_date` |
| `claim_event` | append-only: `type (999, 277CA, status, remit, resubmit, manual), code, message, source, raw_ref, created_at` |
| `remittance` / `remittance_claim` | 835 header + per-claim; `trace_no, payer, check/EFT, paid, received_at, matched_claim_id, match_confidence` |
| `adjustment` | `remittance_claim_id, claim_line_id?, group_code (CO/PR/OA/PI), carc, rarc, amount` |
| `denial` | `claim_id, carc/rarc, category, root_cause, appeal_deadline, appeal_level, status, owner, outcome` |
| `work_item` / `work_queue` | extend Task: queue, entity ref, priority, SLA, amount at stake |
| `fee_schedule`, `fee_schedule_item`, `service_cpt_map` | pricing + service→CPT/modifier mapping |
| `audit_log` | immutable: actor, tenant, action, entity, PHI-access flag, request id, no PHI payloads |

**Changes to existing entities:** `Appointment` + `coverage_id`, `encounter_id`, hard FK `client_id`; `ClientInvoice` + `claim_id`, `insurance_paid`, `patient_responsibility_source`; `Payment` + `remittance_id`; `TaskEntity` + entity ref/priority/queue/SLA; `Service` + multi-CPT; `Organization` + billing entity fields; `ScribeSession.extractedData` + procedures/CPT proposals.

### 4.4 Resolver and normalizer — where they run

```
checkEligibility(appointment)
  -> de-dup/cache gate  -> adapter.checkEligibility
  -> outcome
       response      -> NORMALIZER -> benefit_lines -> status active/inactive -> done
       aaa_reject    -> RESOLVER (code -> category -> action)
                          e.g. invalid/missing member ID, name/DOB mismatch -> retry with variants (strip prefix, swap name order, alt DOB)
                               payer not enrolled / provider not enrolled -> enrollment task (work_item)
                               payer unavailable / timeout -> delayed retry (backoff)
                               patient not found after variants -> ask front desk (work_item with what to fix)
                               no electronic path -> VOICE FALLBACK job (pending_review)
       transport_error -> retry w/ backoff -> after N -> inconclusive + task
```

- **Sync vs queue:** user-initiated checks (front desk, scheduling drawer) run **sync with a short timeout (~10–15 s)** and degrade to queued+async if exceeded; batch/nightly, retries-with-variants, status polling, ERA fetch, aging, and voice fallback run on the **queue**. The resolver is a pure function (`outcome → decision`) so it's unit-testable; the **orchestrator** performs the decision (enqueue retry, create work item). AAA code→category table lives in config/DB (editable without deploy); exact code list and taxonomy **needs confirmation** against the research doc/X12 code lists.
- **Normalizer:** deterministic mapping of EB/STC loops to `benefit_line`, with a "confidence/needs-review" flag for ambiguous payer-specific returns; **no LLM in the money-affecting path** without human confirm (matches the V1 spec's AI-governance rule). LLMs may *summarize* but the schema fields come from parsing.
- **Caching & de-dup:** key = `(tenant, coverage_id, service_type_set, service_date)`; reuse a successful result for a configurable TTL (e.g. same day; **needs confirmation** with payer/clearinghouse terms), and collapse concurrent identical requests via the idempotency `request_hash` + a lock. Nightly batch skips patients with a fresh active check. Retries share a `parent_check_id` with attempt caps to avoid clearinghouse spam and cost.

### 4.5 Raw storage, encryption, audit, tenant isolation

- **Raw artifacts:** store every 270/271/837/999/277/835 (and vendor JSON) in object storage (or encrypted DB blob) referenced by `raw_ref`; immutable; retention per policy (**needs confirmation**: legal retention, commonly ≥ 6–7 yrs for claims). Parsed canonical tables never contain the only copy of an answer.
- **Encryption:** TLS 1.2+ in transit; envelope encryption at rest with **per-tenant data keys** under a KMS (mirrors `BACKEND_HANDOFF_SPEC.md` §2); field-level encryption for member ID, DOB, SSN-like fields; clearinghouse credentials in a secrets manager (never in `localStorage` as `integrationsRegistry.ts` does today).
- **Audit:** server-side append-only `audit_log` for every PHI read/write/export and every outbound payer transaction (who/what/when/tenant/request id; **no PHI in log bodies**). Replace the localStorage `auditLogsStore.ts` for compliance purposes.
- **Logging hygiene:** structured logs with IDs only; remove `console.*` of patient data; redact EDI in logs.
- **Tenant isolation:** `tenant_id` on every row + Postgres RLS (or equivalent) + tenant context from the authenticated session (never client-supplied); per-tenant clearinghouse credentials/submitter IDs; per-tenant keys; queue jobs carry tenant context.
- **Vendors/BAAs:** clearinghouse, cloud, voice provider and any LLM must have BAAs; Groq STT currently used for kiosk audio has none (**needs confirmation/remediation**).

### 4.6 Component and data-flow diagram

```
 [React SPA: Schedule, ClientProfile, Claims, Denial board, Tasks, Reports, Voice cfg]
        |  REST /api/v1 (session auth, tenant ctx)
        v
 [API layer] -- authz/RBAC --> [RCM services] ---------------------------+
   | writes/reads                 eligibility | claims | remittance | denials | billing
   v                                  |  ^           |         ^
 [Postgres + RLS]  <-- canonical -----+  |           |         |
 [Object store: raw EDI/JSON, encrypted] |           v         |
 [Audit log (append-only)]               |      [Job queue + Scheduler]
                                         |   nightly eligibility | retries | status poll | ERA fetch | aging
                                         v           |
                                 [Resolver] <- AAA outcomes
                                 [Normalizer] <- 271
                                         |           |
                                         v           v
                         [Connectivity interface (vendor-agnostic)]
                           | adapter: Stedi (P1)   | adapter: 2nd vendor (P3) | mock
                           v                       v
                      [Clearinghouse(s)] ----> [Payers]

   Resolver "no electronic path" ---> [Voice payer-call runtime] --structured result--> eligibility_check
                                           (source='voice', pending_review -> human Accept)
   Resolver/enrollment/denials/A-R ---> [work_item / Tasks + CRM stage boards] ---> staff
   Event bus (made durable: outbox) : appointment.* / claim.* / eligibility.* -> automations, notifications, messaging
```

---

## Step 5 — Phased plan

Estimates are rough engineer-weeks and **need confirmation** with the team and vendor onboarding lead times (payer enrollment, clearinghouse contracting and test-environment access are calendar-time dependencies not captured in engineer-weeks).

### Phase 1 (weeks 0–8 *as requested*) — eligibility end-to-end

> **Schedule risk:** the platform foundation (DB, auth, tenancy, queue, encryption, audit) does not exist. If it must be built here, Phase 1 realistically takes **~14–18 weeks**. The 8-week target holds only if (a) a backend platform exists or is staffed separately, or (b) Phase 1 is deliberately scoped as a single-tenant pilot with the foundation hardened in parallel. **Decision needed (Q1/Q2).**

**User stories**
- Front desk sees a verified/failed/inconclusive coverage chip on each appointment with plain-language copay/deductible/coinsurance/OOP (never raw 271).
- When a payer returns an AAA rejection, the system retries with name/ID variants automatically, or creates a specific task ("Member ID invalid — confirm card") or an enrollment task.
- Nightly job verifies tomorrow's appointments; staff see a worklist of failures.
- When no electronic answer is possible, the voice agent calls the payer and writes benefits into the same schema as *pending review*.
- Admin configures the clearinghouse connection and per-payer settings.

**Files/modules touched:** new `server/rcm/{connectivity,eligibility,resolver,normalizer,jobs}`; UI: `ScheduleAppointmentDrawer.tsx`, `AppointmentDetailDrawer.tsx`, `AppointmentCard`, `ClientProfile.tsx` (coverage editor), `integrationsRegistry.ts` + `IntegrationConfigDrawer.tsx` (clearinghouse manifest), `tasksStore.ts`/`Tasks.tsx` (entity ref, queue), `appointmentService.ts` (coverage link, `eligibility.*` events), `teamStore.ts` + `OrganizationContext.tsx` + Settings (NPI, tax ID, taxonomy), `MyAIReceptionist.tsx`/voice runtime, `auditLogsStore.ts` → server. Reuse/port from `rcm` branch: `EligibilityDetailDrawer`, `insuranceStore` shape (choose one model), and from `rcm-2`: `ClientInsuranceEditor`, Insurance Intake worklist.

**New tables:** `patient` (typed), `provider`, `billing_entity`/`location`, `payer`, `payer_profile`, `coverage`, `eligibility_check`, `benefit_line`, `eligibility_raw`, `work_queue`/task extensions, `call_session`, `audit_log`, `tenant`/`user`/`role`.

**Dependencies:** clearinghouse account + sandbox + production enrollment (vendor selection **needs confirmation**); provider/org NPI + tax ID data collected; backend platform; payer list/ID mapping; BAA with clearinghouse, cloud, voice/telephony provider; code-set licensing (CPT) decision (needed by Phase 2); telephony runtime vendor decision (VAPI/Twilio/LiveKit are labels today).

**Risks:** foundation scope creep; payer variability in 271 (normalizer edge cases); AAA taxonomy accuracy; per-payer enrollment lead times; voice agent reliability on payer IVRs (hold, DTMF, human verification) and call cost; PHI to third parties without BAAs; localStorage-to-DB migration of seeded/demo data; two divergent RCM branches needing merge/triage.

**Effort:** foundation 8–14 (if in scope) + connectivity/adapter 3 + schema/coverage UI 3 + normalizer 2 + resolver 2 + scheduler/nightly 1 + eligibility UI 2 + voice fallback 4–6 + security/audit 2 → **~19–35 eng-weeks total (≈ 3–5 engineers × 8 wks only if foundation is excluded)**.

**Acceptance criteria**
1. A real eligibility check runs end-to-end against the vendor sandbox *and* ≥1 live payer for a test tenant, with raw 271 stored encrypted and parsed into `benefit_line`; UI never displays raw EDI.
2. Resolver unit tests cover each mapped AAA code with expected action; invalid-ID cases auto-retry variants ≤ N times; enrollment/front-desk tasks are created with specific instructions.
3. Nightly job processes all T+1 appointments idempotently (no duplicate checks within TTL) and failures appear in a worklist.
4. Voice fallback writes a `pending_review` check with `source='voice'`; it cannot affect estimates/claims until a user accepts.
5. Tenant A cannot read tenant B's coverage/eligibility (automated isolation test); every PHI read/write appears in `audit_log`; no PHI in application logs.
6. Swapping the adapter to `mock` requires no change outside `connectivity/adapters`.

### Phase 2 (months 2–6) — claims and remittance

**User stories:** biller creates/auto-drafts claims from signed encounters; scrubber blocks bad claims with fix-it hints; claims submit electronically with 999/277CA tracked; rejections appear in a worklist; ERAs auto-post payments/adjustments; denials land in a queue with CARC/RARC category, deadline and owner; patient responsibility flows to patient invoices.

**Files/modules:** new `server/rcm/{claims,remittance,denials}`; migrate `claimsStore.ts` (`Claim` → `claim`/`claim_line`), replace `submitClaimElectronically`; `Claims.tsx` + `components/claims/*` (reuse `CMS1500Modal` for print); `CreateClaimDrawer.tsx` (source provider/org data from settings, no hard-coded NPIs); `scribeSessionStore.ts` (procedure/CPT proposals); `icdCodes.ts`/`cptCodes.ts` → code-set service; `invoiceService.ts` + `RecordPaymentModal.tsx` (posting, claim link); `useProcessStore.ts` (claim/denial stages; fix substring mapping `claimsStore.ts:467`); `useAutomationStore.ts`/`ruleEngine.ts` (emit & handle `claim.*`; add create-claim and create-task actions); `reportEngine.ts`. Triage `rcm-2` pages (EncountersList, RejectionsWorklist, DenialBoard, PaymentPostingWorklist, ClaimDetailDrawer, DenialClusterDrawer) for reuse against the real API.

**New tables:** `encounter(+dx/procedure)`, `claim`, `claim_line`, `claim_event`, `claim_batch`, `remittance`, `remittance_claim`, `adjustment`, `denial`, `appeal`, `scrub_rule`, `scrub_result`, `fee_schedule(+item)`, `service_cpt_map`, `statement`.

**Dependencies:** Phase 1 foundation; clearinghouse claim/ERA enablement and per-payer enrollment (837P, ERA/EFT); CPT licensing; fee schedules; ophthalmology coding rules/NCCI source; payer-specific edit lists; durable event outbox.

**Risks:** coding accuracy/liability (AI must stay propose-only); ERA matching edge cases (splits, reversals, takebacks); payer-specific 837 quirks; ophthalmology complexity (laterality modifiers, global periods, cataract 66984 variants); clearinghouse rejection noise; timely-filing exposure during migration; training users on rejection vs denial distinction.

**Effort:** encounter/charge 4 + coding 4 + claim model/migration 3 + 837 builder/ack parsers 5 + scrubber 4 + ERA parse/match/post 6 + denial queue/appeals 4 + patient-billing linkage 3 + PSP integration 3 + reporting 3 + QA/pilot hardening 4 → **~40–50 eng-weeks** (**needs confirmation**).

**Acceptance criteria:** ≥95% of sandbox/test claims pass 999 and 277CA without manual EDI edits; clean-claim rate tracked; ≥90% of ERA lines auto-match in pilot with all unmatched routed to a worklist; every denial has CARC/RARC, category, deadline and owner; posting reconciles to payer total to the cent (test fixtures); claim and invoice linked both ways; all claim state changes emit `claim.*` events and audit entries; no hard-coded NPI/tax ID remains in UI code.

### Phase 3 (months 6–12) — scale, automation, estimates, auth readiness

**User stories:** claims auto-route via a second clearinghouse by payer/cost/availability; stale claims are auto-polled (276/277) and escalate; patients receive pre-visit cost estimates with a payment link; staff see prior-auth readiness before scheduling; A/R managers work aged claims by priority.

**Files/modules:** `connectivity/registry.ts` routing + 2nd adapter; status poller; `estimator`; `authorization` module + `rcm-2` PriorAuthList port; templates (`useWhatsappTemplates.ts`) with estimate/payment-link variables + real WhatsApp/SMS delivery; `tasksStore`/work queues (SLA, aging); `reportEngine.ts`/`Overview.tsx` financial KPIs; voice balance reminders (`CallTriggerSettings`).

**New tables:** `payer_routing_rule`, `claim_status_poll`, `estimate`, `payment_plan`, `refund`, `auth_requirement_rule`, `collection_contact_log`; materialized A/R aging.

**Dependencies:** Phase 2 live volume; second vendor contract; WhatsApp Business/SMS delivery + opt-in/consent (TCPA) and template approvals; real PSP; payer auth rules source.

**Risks:** estimate accuracy/liability (No Surprises Act context — **needs legal confirmation**); vendor-parity differences in raw payloads; auth rule maintenance; TCPA/consent for collection calls and texts; routing changes mid-flight for in-process claims.

**Effort:** 2nd adapter + routing 5 + status automation 4 + estimator 5 + prior-auth readiness 5 + work-queue SLA/aging 4 + messaging delivery 4 + collections voice 3 + analytics 4 → **~34–40 eng-weeks** (**needs confirmation**).

**Acceptance criteria:** adapter parity test suite passes for both vendors; routing change needs config only; ≥90% of in-flight claims status-polled on schedule; estimate vs final patient responsibility variance reported and within an agreed threshold; aging dashboard matches ledger; SLA breach alerts fire; consent/opt-out honored in all outbound patient contact.

---

## Step 6 — Gaps blocking RCM and questions for you

### 6.1 Blockers found in the current code

| # | Gap | Evidence |
|---|---|---|
| B1 | **No backend/database/auth/tenancy** — all state in browser | §1.2–1.4; `AuthContext.tsx` dummy token; globally keyed stores |
| B2 | **No job queue/scheduler** (nightly eligibility, status polling, aging impossible); events non-durable | `eventBus.ts`; `setTimeout` delays |
| B3 | **PHI in plaintext localStorage**, not cleared on logout; integration credentials in localStorage; no encryption/redaction/retention | §1.13 |
| B4 | **Audit log is client-side, mutable, admin-only**, no PHI-access events | `auditLogsStore.ts` |
| B5 | **No NPI/taxonomy/license on providers** | `teamStore.ts` (0 hits) |
| B6 | **No NPI/tax ID/address/POS on typed Organization**; billing identity typed per-claim with hard-coded defaults | `OrganizationContext.tsx`, `CreateClaimDrawer.tsx:84-89` |
| B7 | **No patient entity / DOB / sex / address / member ID as typed fields**; `Client` is a CRM contact with `[key:string]:any` | `canonicalClients.ts:4-30` |
| B8 | **No coverage/insurance, subscriber/guarantor, secondary payer, eligibility, authorization models** | §1.7 |
| B9 | **No Encounter entity**; scribe outputs one ICD string, no CPT | `scribeSessionStore.ts` |
| B10 | **Code sets are tiny samples** (~32 ICD, ~36 CPT, no ophthalmology CPT, no modifiers/fees/NCCI/HCPCS); no fee schedule; one CPT per service | `icdCodes.ts`, `cptCodes.ts`, `servicesStore.ts` |
| B11 | **Appointment↔client link is name-based** (`clientId` optional); claim seeds reference mismatched IDs | `appointmentService.ts`, `claimsStore.ts` |
| B12 | **Claim model lacks CARC/RARC, adjustments, denial/appeal, timely filing, assignee, ERA**; submission is a fake | `claimsStore.ts` |
| B13 | **Events `claim.*`/`insurance.*`/`task.*` declared but never emitted**; no "create task"/"create claim" action | `useAutomationStore.ts`, `ruleEngine.ts` |
| B14 | **Tasks have no entity link, queue, SLA, or priority levels** | `types/task.ts` |
| B15 | **No real messaging/telephony/payment gateway**; payment link is a mock URL; WhatsApp/SMS not delivered | §1.6 |
| B16 | **No voice runtime**; no IVR/DTMF/hold handling, no structured extraction/write-back; agent config is patient-centric | §1.11 |
| B17 | **PHI to Groq without BAA**; `@anthropic-ai/sdk` unused (no approved LLM path) | `api/stt/transcribe.ts`, `package.json` |
| B18 | **Unbacked HIPAA/BAA/AES-256 marketing claims** | `plansBillingStore.ts`, `AIScribePopup.tsx:604` |
| B19 | **Two divergent RCM branches + two competing insurance models + vendor-branded mock 270/271** | §1.14 |
| B20 | **Reports lack claims/denial/A-R sources**; `tsconfig` doesn't type-check `api/`/`server/`; ~no tests/CI | `reportEngine.ts`, `tsconfig.json` |
| B21 | **Documentation discrepancies:** `docs/rcm-research.md`, `docs/ai_scribe_prd.md` absent; `PRODUCT_STRUCTURE.md` describes non-existent `EligibilityDetailDrawer` on main and conflates SaaS billing with clinic billing | §0, §1.7 |

### 6.2 Questions for you

**Platform & scope**
1. **Where does the production backend live?** (This repo has none; `BACKEND_HANDOFF_SPEC.md` covers only the receptionist.) Existing service/language/DB? Who builds the foundation, and is Phase 1's 8 weeks *excluding* it?
2. Single-tenant pilot first, or multi-tenant from day one?
3. **Where is `docs/rcm-research.md` (incl. §F2)?** Please share it so §4's schema can be reconciled.
4. What is the disposition of `origin/rcm` and `origin/rcm-2` (merge, mine for parts, discard)? Which insurance model wins (`ClientInsurance` vs `ClientInsuranceRecord`)?

**Vendors & compliance**
5. Which clearinghouse first (Stedi/Claim.MD/Availity), and who owns contracting, sandbox access and payer enrollment? Do we bill as the clinic's own submitter or under a Mantra billing entity?
6. Are BAAs in place (cloud, clearinghouse, telephony/voice, LLM)? What is the plan for the Groq kiosk audio and the marketing HIPAA claims?
7. Data retention/legal hold requirements for claims/EDI and audit logs; data residency (the product also targets India — any non-US tenants?).
8. CPT licensing (AMA) and which code-set/NCCI/fee-schedule data sources are approved.

**Product & workflow**
9. Who are the RCM users (in-house billers, front desk, outsourced billing company)? Is a Biller role needed and what are its permissions?
10. Do we *replace* billing for clinics or *augment* (clinics keep a PM system/Athena/Epic)? Affects whether `integrationsRegistry` Epic/Athena sync matters.
11. Which payers and specialties are in the first cohort (ophthalmology + medical vision plans like VSP/EyeMed? Medicare Part B?) — this drives payer enrollment, modifiers and ERA volume.
12. Coding model: provider self-codes, AI-assisted with human accept, or outsourced coders? Any appetite for auto-submit without review?
13. Patient payments: which PSP, card-on-file tokenization, and PCI scope (hosted fields/payment links only?).

**Voice agent**
14. Which voice runtime/telephony provider (VAPI/LiveKit/Twilio/…)? Is outbound calling to payers acceptable to the target payers' policies, and who handles IVR edge cases?
15. Acceptable accuracy bar and review process for voice-derived benefits; which fields may it write, always as pending-review?
16. Patient balance-reminder calls/texts: consent capture and TCPA/state-law requirements?

**Data & migration**
17. Is any real PHI currently in these localStorage stores, or demo data only? Is there a migration expectation for existing demo/pilot orgs?
18. Provider/org identifiers: how will NPI, taxonomy, tax ID be collected (onboarding flow in `VoiceOnboardingScreen`/Settings)?
19. Is `Appointment.clientId` guaranteed to be populated going forward (v1.1 spec calls for it)?

**Success measures**
20. Target KPIs (clean-claim rate, days in A/R, eligibility auto-resolution rate) so acceptance criteria can be made numeric.

---

*Evidence note:* inventory derived from four parallel read-only code explorations plus direct spot-checks (no `claim.`/`insurance.` emits; no NPI in `teamStore.ts`; `EntityType` at `useProcessStore.ts:92`; `Claim` interface at `claimsStore.ts:40`; `@anthropic-ai/sdk` unused). Line numbers are from the working tree at time of review and may drift; items not independently re-verified by direct file read are flagged "needs confirmation" where they affect decisions.

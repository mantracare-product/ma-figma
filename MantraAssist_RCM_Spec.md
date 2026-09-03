# MantraAssist Revenue Cycle Management (RCM) — Product & Engineering Specification

**Status:** Ready for build
**Audience:** Antigravity build agent, engineering, design QA
**Companion files to load alongside this doc:** `ATHELAS_FULL_DOCS.md` (reference/bar, not a template), `docs/DESIGN_NAVODYA.md` (mandatory design system), `docs/PROJECT_OVERVIEW.md` (existing architecture), existing `src/app/**` codebase

---

## 0. How to use this document

This spec describes **RCM as an addon layer fused into the existing MantraAssist product**, not a new application. Every section below explicitly states:
1. **What the feature does** (product behavior, user-first)
2. **What already exists in MantraAssist that must be reused** (file paths, contexts, stores, components)
3. **What is genuinely new** and must be built
4. **What we deliberately do differently from Athelas**, and why

**The single most important rule in this document:** before building any screen, component, or piece of logic described below, check the "Reuse" line for that item. If MantraAssist already has a component/store/pattern that does the job, extend it — do not create a parallel one. A duplicated Modal, duplicated status-badge component, or duplicated timeline system is a bug, not a feature. The single biggest failure mode for this build is RCM ending up feeling like a second product stapled onto MantraAssist. Every screen must use the same sidebar chrome, the same `Drawer`/`Modal`/`Table`/`Badge`/`PillTabs` components, the same typography and color tokens as the rest of the app.

Athelas's documented claim lifecycle (in `ATHELAS_FULL_DOCS.md`, and summarized faithfully in the companion "Claim Lifecycle Reference" artifact) is used only as a **completeness bar** — a way to make sure we haven't forgotten a real-world RCM scenario. We are not cloning Athelas's IA, terminology, or screens. Where MantraAssist already has an equivalent flow (Kanban boards, drawers, activity timelines, automation triggers, messaging), we reuse it even if Athelas's version looks different.

---

## 1. Product Vision

> **RCM in MantraAssist is not a biller's separate tool bolted onto a CRM. It is the financial nervous system of the same patient record everyone else already works in.**

A front-desk user should never have to ask "is this the CRM or the billing system" — there is one product. A biller gets a focused, powerful workspace for claims/denials/payments. A front-desk or clinical user sees the *consequences* of that work (balance owed, claim status, statement sent) surfaced naturally inside screens they already use daily (Client Profile, Appointments, Activity Tab).

**Design principles for this build (in priority order):**
1. **One patient record.** Client = Patient. No parallel identity system.
2. **Reuse over rebuild.** Every piece of existing infrastructure (state stores, contexts, UI components, the automation engine, the activity timeline) is a resource to extend, not a constraint to work around.
3. **User-first, not spec-first.** Every worklist must answer "what do I need to do right now and why" in under 3 seconds of looking at it — status badges, plain-English reasons, and next actions, not raw payer codes as the primary UI.
4. **AI proposes, humans confirm — always, for anything financial.** No exceptions. This is a hard governance rule, detailed in §7.
5. **Nothing silently fails.** Every blocked, denied, or stuck state has a visible owner, a visible reason, and a visible next step. No claim disappears into a queue with no accountability.

---

## 2. Architecture Overview

### 2.1 The Two-Track Model

MantraAssist already runs a **Process/Engagement engine** (`Process.tsx`, `FlowBuilderTab.tsx`, `useProcessStore.ts`, `clientProcessState.ts`) built for conversational, patient-facing automation: lead nurturing, intake, booking, stage-based messaging triggers (On Stage Entry / In Call / In Chat / Post Call).

RCM needs a fundamentally different kind of state machine: hard blocks, dollar-amount branching, rule-priority evaluation, payer-response forking, and audit trails. Forcing claims logic into the existing generic FlowBuilder would be fighting the tool. Instead:

- **Track A — Engagement Process** (existing, unchanged): Lead → Booked → Confirmed → Seen. Owned by `Deals.tsx` / `Process.tsx` / `clientProcessState.ts`. **No changes required to this track.**
- **Track B — Revenue Cycle Process** (new): Encounter → Claim → Submission → [Rejection | Denial | Paid] → Posting → Patient Responsibility → Statement → Closed. Purpose-built engine, described fully in §8.

**The seam between the two tracks is the Encounter.** Track A does not know about claims. Track B does not know about scheduling or lead engagement. The only wire between them is a single trigger condition, described next.

### 2.2 Encounter Creation Trigger (locked decision)

An Encounter — and therefore a billable Claim — is created only when **both** of the following are true:

| Condition | Source |
|---|---|
| Appointment status = `Completed` | Existing `Appointments.tsx` / appointment status lifecycle |
| Documentation is locked | AI Scribe note signed (`scribeSessionStore.ts` / `AIScribeConsole.tsx`) **OR** manual "Mark Documentation Complete" checkbox for encounters without Scribe |

This produces three real states instead of a single silent trigger:

| Appointment | Docs | Resulting state |
|---|---|---|
| Completed | Locked | **Ready to Bill** → auto-generates Encounter + Claim |
| Completed | Not locked | **Pending Documentation** — visible in a new worklist, not silently skipped |
| Not completed | — | No encounter exists yet |

**Reuse:** Appointment status lifecycle already exists in `Appointments.tsx` and `AppointmentCard.tsx` — do not add new appointment statuses, just subscribe to the existing `Completed` transition. **New:** the "documentation locked" flag needs to be added to whatever encounter record is created (see §5.2), and a manual override checkbox needs to be added to the appointment/encounter UI for non-Scribe clinics (see §8.3).

### 2.3 Unified Patient/Client Entity (locked decision)

**There is no separate "Patient" table.** The existing `Clients.tsx` / `ClientProfile.tsx` / client record is the single source of truth for a person. Every RCM entity (Claim, Encounter, PatientArBalance, Clawback, CredentialingVaultEntry where relevant) stores a real `clientId` foreign key pointing at the existing client record — never a denormalized `patientName` string as the primary reference (denormalized display names are fine as a *cached label*, but `clientId` is the source of truth).

**Reuse:** `Clients.tsx`, `ClientProfile.tsx`, `FieldRegistryContext.tsx` (client field schema), `getClientList.ts`.
**New:** a `ClientProfile.tsx` "Billing" tab (see §4.3), and RCM-specific fields registered into `FieldRegistryContext` (see §5.7) so they're filterable/reportable everywhere else in the app for free.

### 2.4 System Diagram

```
Client record (existing, unified with Patient)
 │
 ├─ Track A: Engagement Process (EXISTING — no change)
 │    Lead → Booked → Confirmed → Completed ──────────┐
 │                                                      │ (Completed AND docs locked)
 │                                                      ▼
 └─ Track B: Revenue Cycle Process (NEW)
      Encounter → Claim → Scrub → Submit
        → [Rejected | Denied | Paid] → Posting
        → Patient Responsibility → Statement → Closed
      │
      ├─ writes every state change to activityEngine.ts  (EXISTING — shared client timeline)
      ├─ registers fields via FieldRegistryContext        (EXISTING — shared filters/reports)
      ├─ fires existing automation triggers on state change (EXISTING — WhatsApp/SMS/email via
      │    chatbotFlowEngine / InvoiceContext payment links)
      └─ owns new dedicated worklist UI (Revenue Cycle pillar), reusing Deals' Kanban
           visual pattern for a Denial Board (NEW component, existing visual language)
```

---

## 3. Information Architecture & Navigation

### 3.1 Decision: Hybrid IA

RCM gets **one new top-level primary nav pillar** for the specialist (biller) workspace, **plus** contextual surfacing of RCM data everywhere non-billers already work. Neither a fully standalone RCM app nor cramming it into "More Modules" is acceptable — see architecture discussion rationale already agreed. This section is the concrete spec.

### 3.2 Sidebar Changes (`src/app/components/layout/Sidebar.tsx`)

**Reuse:** the entire `Sidebar.tsx` component structure — its `primaryLinks` / `secondaryLinks` pattern, `isActive()` logic, collapse behavior, Tooltip wrapper, and the navy-gradient active-pill styling already defined for primary nav items. Do not build a new sidebar shell.

**Change required:** add one new entry to `primaryLinks`:

```ts
{ path: "/revenue-cycle", label: "Revenue Cycle", icon: Landmark }
```
*(Use a Lucide icon distinct from `Receipt` (already used for the "Invoices" secondary link) — suggest `Landmark` or `HeartHandshake`-adjacent financial icon; do not reuse an icon already assigned elsewhere in the sidebar.)*

**Existing `Invoices` secondary link is not deleted.** It remains as the fast, everyday self-pay invoicing entry point (front-desk use case), but its page (`Invoices.tsx`) gains a link/banner into the Revenue Cycle pillar's "Invoicing & Billing" sub-page for anything insurance-related (see §3.3, §8.9). Do not merge these two pages' code — they serve different depth needs, but they must feel like siblings, not strangers (shared header component, shared `InvoiceDetailDrawer` where an invoice has a linked claim).

### 3.3 Revenue Cycle Pillar — Sub-Navigation

Reached at `/revenue-cycle`. Uses the same `MainLayout.tsx` shell (sidebar + top header) as every other page — **do not build a second app shell**. Inside the content area, use a secondary sub-nav pattern consistent with how `Settings.tsx` uses `SettingsSubnav.tsx` — reuse that pattern (grouped, collapsible sections) rather than inventing a new sidebar-within-sidebar.

**Reuse:** `SettingsSubnav.tsx` pattern, `PillTabs.tsx` for any in-page tab switching, `DrawerShell.tsx` / `BottomDrawer.tsx` for all detail views (never a full-page navigate-away for a claim or denial detail — MantraAssist's pattern throughout is drawers, e.g. `ProcessDetailDrawer.tsx`, `CallDetailDrawer.tsx`, `InvoiceDetailDrawer.tsx`; a "Claim Detail Drawer" continues that pattern rather than introducing page-based navigation like the Next.js prototype used).

Sub-navigation groups (grouped sections, collapsible, mirroring `SettingsSubnav` behavior):

| Group | Pages | Route |
|---|---|---|
| **Overview & Insights** | Revenue Overview, Payer Performance, Revenue Analysis | `/revenue-cycle/overview`, `/revenue-cycle/payer-performance`, `/revenue-cycle/revenue-analysis` |
| **Daily Work** | Pre-Visit & Eligibility, Encounters, Claims, Invoicing & Billing, Patient Balances | `/revenue-cycle/eligibility`, `/revenue-cycle/encounters`, `/revenue-cycle/claims`, `/revenue-cycle/billing`, `/revenue-cycle/patient-balances` |
| **Worklists** (the "needs action" zone) | Denials, Rejections, Payment Posting, Pending Documentation, Import/Submission Errors | `/revenue-cycle/worklist/denials`, `/revenue-cycle/worklist/rejections`, `/revenue-cycle/worklist/posting`, `/revenue-cycle/worklist/pending-docs`, `/revenue-cycle/worklist/errors` |
| **Credentialing** | Payer Credentialing | `/revenue-cycle/credentialing` |
| **Automation** | Billing Rules, Prior Authorizations, Fee Schedule | `/revenue-cycle/automation/rules`, `/revenue-cycle/automation/prior-auth`, `/revenue-cycle/automation/fee-schedule` |
| **Reports** | (see §8.12) | `/revenue-cycle/reports` |

All routes register through `routes.tsx` exactly like every existing page — **reuse** `ProtectedRoute`, nest under the same `MainLayout` children array already present in `routes.tsx`.

### 3.4 Contextual Embeds (where RCM shows up outside its own pillar)

This is the part that makes it feel "melted in" rather than bolted on. All of these are **new UI added to existing files**, not new pages.

1. **`ClientProfile.tsx` — new "Billing" tab.** Sits alongside the existing Overview / Activity / Processes / Documents / Invoices tabs (per `docs/PROJECT_OVERVIEW.md` §3.1). Shows: current balance due, active claims with status badges, denial alerts if any, payment history, a "View Full Billing History" link into `/revenue-cycle/claims?client=X`. **Reuse:** `DraggableOverviewSections.tsx` pattern for card layout, `StageProgressBar.tsx` styling for a claim's mini-lifecycle indicator, existing tab component from `ClientProfile.tsx`.

2. **`Appointments.tsx` / `AppointmentCard.tsx` — eligibility & billing status chip.** A small status pill (Active / Inactive / Pending / Self-Pay — see §5.1 for exact states) appears directly on the appointment card, exactly where Athelas's "Pre-Visit & Eligibility" worklist lives conceptually, but surfaced where MantraAssist users already look instead of requiring a separate page visit. Clicking it opens the existing `AppointmentFilterModal.tsx`-adjacent drawer pattern with eligibility detail. **Reuse:** `AppointmentCard.tsx` badge-slot pattern (it likely already has a status badge for appointment status — add a second, distinct badge for billing/eligibility status using the same `Badge`/`StatusBadge` primitives).

3. **Activity Tab (`ActivityTab.tsx` via `activityEngine.ts`) — RCM events join the same timeline.** New activity event types: `claim_submitted`, `claim_denied`, `claim_paid`, `payment_posted`, `statement_sent`, `balance_updated`. These render inline with existing call/SMS/stage-change entries, using the same timeline item component. **Reuse:** the entire `activityEngine.ts` pub/sub + `ActivityTab.tsx` renderer — only new work is defining new event type constants and their icon/label mapping (consistent with how call/SMS/form events are already mapped).

4. **Reports (`Reports.tsx` / `CustomReportBuilderModal.tsx`) — RCM as a new data source.** `invoiceTypes.ts` already defines `ReportDataSource = "calls" | "appointments" | "revenue" | "clients" | "team" | "messaging" | "processes"`. Extend this union with `"claims" | "denials" | "collections"`, and extend `ReportDefinition.templateKey` with new template keys (e.g. `"claims_status"`, `"denial_analysis"`, `"aging_ar"`). **Reuse:** the entire report builder UI, filter engine, and chart rendering — this is a pure data/schema extension, zero new UI required for basic reporting (dedicated RCM report pages in §8.12 are for the deeper, purpose-built views only).

5. **Global search / command palette (if one exists via `cmdk`)** — claims and encounters should be searchable the same way clients currently are, using the same search index pattern.

---

## 4. AI Governance — Non-Negotiable Rule Set

This rule set applies to **every** AI-assisted feature described anywhere in this document. It is not a per-feature decision.

> **An AI suggestion is never applied automatically if it moves money, changes a claim's submission state, or changes what a patient owes.** It always renders as a proposal with a visible "why," and requires an explicit human Accept / Edit / Decline before taking effect. This mirrors both MantraAssist's own existing design principle (`DESIGN_NAVODYA.md` §10, "Human-Confirmation Gate") and the governing rule documented in the Athelas reference (`ATHELAS_FULL_DOCS.md` / claim lifecycle artifact §4) — we're not copying Athelas's implementation, we're agreeing with the correct governance model and enforcing it everywhere, including places Athelas's own docs don't fully specify (e.g. our denial-cluster suggested fixes and appeal drafts, per §5.4, are held to the same bar).

**Reuse:** `DESIGN_NAVODYA.md` §10 Agentic Interface Patterns — Agent Presence Ring, Thinking State with Plain Language, Tool-Call Trace Chips, Human-Confirmation Gate, Streaming Caret are all **already specified** in the existing design system. Build every AI touchpoint below using those exact patterns — do not invent a new "AI is thinking" visual language for RCM.

Concrete AI touchpoints in this build, each requiring the same confirm gate:

| Touchpoint | What AI does automatically | What requires human confirmation |
|---|---|---|
| Claim scrub suggestions (§8.4) | Detects missing modifiers, mismatched POS/diagnosis codes, flags them | Biller Accepts/Rejects each; rejecting requires a one-line reason (kept in the claim's note thread) |
| Denial cluster fix + appeal draft (§8.7) | Groups denials by CARC/RARC, drafts a suggested fix and an appeal letter | Biller reviews and edits before resubmit/send — never auto-sends an appeal |
| Eligibility rule builder (plain language → rule) (§8.10) | Converts a typed description into structured rule logic | Biller reviews the generated rule (readable summary, not raw JSON-first) before Save |
| Patient balance explainer | Generates plain-English "why do I owe this" summary | Informational only — no action taken, always available to view underlying line items |
| EOB/remittance transcription assist (if implemented, v2) | Extracts amounts/codes from an uploaded EOB image/PDF | Lands in a pending-review state; biller confirms before it posts to the ledger |

---

## 5. Data Model

**Governing principle:** the existing `invoiceTypes.ts` (`ClientInvoice`, `Payment`, `InvoiceLineItem`) is **not replaced**. It continues to serve simple self-pay invoicing. New RCM types are added alongside it, and where a claim generates a patient-facing invoice, that invoice is a real `ClientInvoice` row with a new optional `claimId` field linking it back — so the existing Invoices/Payments pages keep working unmodified for any invoice that has no claim behind it, and gain a "View Claim" link for ones that do.

All new types below extend the vocabulary already proven in the RCM prototype's `schema/*.ts` (Zod schemas — reuse Zod, it's a good pattern, add it as a dependency if not already present in `package.json`), corrected against gaps identified in the Athelas reference doc, and rewired to use real `clientId` per §2.3.

### 5.1 Eligibility

```ts
type EligibilityStatus =
  | "active" | "inactive" | "not_covered" | "inconclusive"
  | "pending" | "self_pay" | "site_responsibility";

interface EligibilityCheck {
  id: string;
  clientId: string;                 // FK to unified client record
  appointmentId: string;
  payerName: string;
  memberId?: string;
  status: EligibilityStatus;
  checkedAt: string;
  copayAmount?: number;
  deductibleRemaining?: number;
  source: "auto" | "manual_rerun";
}
```
*Reasoning note:* status vocabulary is intentionally close to the Athelas reference (`Active/Inactive/Not Covered/Inconclusive/Pending/Self Pay/Site Responsibility`) because these are industry-standard payer response categories, not an Athelas-specific invention — reusing recognizable terms reduces training burden for billing staff who may have used another system before.

### 5.2 Encounter

```ts
interface Encounter {
  id: string;
  clientId: string;
  appointmentId: string;
  providerName: string;
  serviceDate: string;
  cptCodes: string[];
  documentationLocked: boolean;      // true when Scribe note signed OR manual override checked
  documentationSource: "scribe" | "manual";
  status: "pending_documentation" | "ready_to_bill" | "billed" | "reconciled";
  totalCharges?: number;
  claimIds: string[];
  invoiceId?: string;                // links to existing ClientInvoice when generated
}
```

### 5.3 Claim — with the Rejection/Denial fix

**This is the single most important schema correction versus the RCM prototype.** The prototype's `ClaimSchema` treats `"Denied"` and `"Rejected"` as peer values in one status enum. The Athelas reference makes clear these are structurally different: a **rejection** never entered the payer's adjudication system at all (invisible to insurance, pure timely-filing risk), while a **denial** was adjudicated and declined. Conflating them in one flat enum means a worklist can't correctly branch on "was this ever seen by the payer" — fix it:

```ts
type ClaimLifecycleStatus =
  | "draft" | "scrubbing" | "awaiting_acknowledgement" | "in_adjudication"
  | "rejected" | "denied" | "paid" | "void";

type FaultAttribution = "platform_responsibility" | "site_action_required" | "unattributed";

interface Claim {
  id: string;                 // e.g. "CLM-2026-8812"
  encounterId: string;
  clientId: string;
  payerName: string;
  cptCodes: string[];
  serviceDate: string;
  status: ClaimLifecycleStatus;
  billedAmount: number;
  allowedAmount?: number;
  paidAmount?: number;
  timelyFilingDeadline: string;      // absolute date, always computed, never left null
  timelyDaysRemaining: number;       // derived, refreshed on read
  faultAttribution?: FaultAttribution;  // see rationale below — NEW, not in prototype
  rejectionReason?: string;           // populated only when status = "rejected"
  denialCarc?: string;                // CARC code, populated only when status = "denied"
  denialRarcs?: string[];
  notes: ClaimNote[];
  adjustmentsList?: ContractualAdjustment[];
  source: "native" | "imported";
}
```

**Why `faultAttribution` is new and mandatory-ish:** the Athelas reference explicitly tracks whether a stuck claim is "Athelas Responsibility" (their system's fault) vs. "Site Action Required" (the clinic's fault) — this is a trust feature, not decoration. Without it, every stuck claim looks like the clinic's problem, even when it's a platform/integration bug. Every claim entering `rejected` or `denied` state must be assigned a fault attribution, defaulting to `"unattributed"` only until triage happens — an `"unattributed"` claim sitting in a worklist for more than a defined SLA (default 24h) should visibly flag itself for biller-ops attention.

### 5.4 Denial Clustering

Reuse the RCM prototype's `DenialClusterGroup` model near-verbatim — it's a genuinely good pattern (grouping denials by CARC/RARC + payer, with AI-suggested fix and appeal draft), just rewire `patientId`/`patientName` references to real `clientId`, and gate the appeal draft behind the AI confirmation rule in §4.

```ts
interface DenialClusterGroup {
  id: string;
  payerName: string;
  carc: { code: string; description: string };
  rarcs: { code: string; description: string }[];
  totalAmountAtRisk: number;
  claimCount: number;
  priority: "critical" | "high" | "standard";
  suggestedFixSummary: string;       // AI-generated, human-readable
  appealDraftTemplate: string;       // AI-generated, requires review before send — see §4
  claims: DenialClaimItem[];
}

interface DenialClaimItem {
  claimId: string;
  clientId: string;
  encounterId: string;
  providerName: string;
  serviceDate: string;
  amount: number;
  timelyFilingDeadline: string;
  timelyDaysRemaining: number;
  priorityScore: number;
  status: "denied" | "resubmitted" | "reconciled" | "approved";
}
```

### 5.5 Remittance / Payment Posting

```ts
type PostingAction = "negate" | "write_off" | "write_off_pr" | "push_to_pr" | "custom_adjustment";

interface RemittanceLine {
  id: string;
  claimId: string;
  clientId: string;
  paidAmount: number;
  adjustments: { reasonCode: string; amount: number; note: string }[];
  postingAction?: PostingAction;
  source: "era_835" | "manual_eob" | "portal_check";
  status: "pending_review" | "confirmed" | "archived";
  receivedAt: string;
}
```
*Note:* v1 does not require live ERA/835 clearinghouse ingestion (that's an external integration decision, flagged in §12 phasing) — but the schema is built to support it from day one so manual-EOB-entry v1 data slots into the same model as automated ERA v2 data without a migration.

### 5.6 Patient Responsibility, extending existing Invoice types

```ts
interface PatientArBalance {
  id: string;
  clientId: string;
  invoiceableBalance: number;
  nonInvoiceableBalance: number;      // e.g. a denied portion still pending resolution — cannot be
                                       // billed to patient yet, per the sequencing rule below
  primaryPayer: string;
  hasActiveClawback: boolean;
  agingBucket: "0-30" | "31-60" | "61-90" | "91-120" | "121-180" | "181-365" | "366+";
}
```
**Sequencing rule (carried over from the Athelas reference because it's simply correct billing practice, not a stylistic choice):** patient responsibility only reaches the patient (i.e., only generates a statement or shows as an outstanding balance) once `PR amount = total balance amount` for that encounter — a denied portion sitting alongside legitimate PR blocks the statement until the denied portion is written off or resolved. This prevents billing a patient for an amount that might still change.

**Reuse for the actual invoice/statement object:** extend the existing `ClientInvoice` interface (`invoiceTypes.ts`) rather than creating a parallel "Invoice" type as the prototype did:

```ts
// addition to existing ClientInvoice interface in invoiceTypes.ts
interface ClientInvoice {
  // ...all existing fields unchanged...
  claimId?: string;              // NEW — present only when this invoice originated from a claim
  encounterId?: string;          // NEW
  insurancePaidAmount?: number;  // NEW — populated once remittance posts
}
```
This is the concrete mechanism that keeps Invoices.tsx/Payments.tsx working exactly as-is for self-pay, while giving insurance-originated invoices a thread back to their claim.

### 5.7 Fields to register in `FieldRegistryContext`

So these become filterable/reportable everywhere for free (per §3.4.4):

`claimStatus`, `balanceDue`, `payerName`, `lastDenialReason`, `agingBucket`, `faultAttribution`, `eligibilityStatus`, `documentationLocked`.

### 5.8 Credentialing (reuse prototype model, minor rename for clarity)

```ts
interface CredentialingRecord {
  id: string;
  providerId: string;               // FK to existing team member / provider record
  payerName: string;
  trueCredentialingStatus: "not_credentialed" | "pending" | "credentialed";
  transactionEnrollmentStatus: "not_enrolled" | "enrollment_pending" | "action_required" | "live" | "rejected";
  effectiveDate: string;
  terminationDate: string | null;
  npi: string;
  taxId: string;
  isServiceDateValid: boolean;      // computed: does effectiveDate/terminationDate cover today
}
```
*Competitive note:* per the Athelas gap analysis, their public docs show no dedicated payer-credentialing-as-RCM-function workflow — only EHR-side license/NPI scheduling safeguards. Keeping this as a real first-class feature (not cut for v1 triage) is a legitimate differentiator; see phasing recommendation in §12.

### 5.9 Scrub Rules, Fee Schedule, Prior Auth

Reuse the prototype's `ScrubRule`, `FeeScheduleItem`, `PriorAuthRecord` shapes near-verbatim — they're well-modeled and match the "Billing Rules Engine" concept validated against the Athelas reference (Priority-ordered rules, Hard Block / Skippable Rule / auto-field-change outcomes). Only change: `patientId`/`patientName` on `PriorAuthRecord` becomes `clientId`.

---

## 6. Component & Infrastructure Reuse Map

Concrete file-level reuse instructions for the build agent. **Treat this table as binding** — if a row says "reuse," do not create a new component.

| Need | Reuse this existing file | Notes |
|---|---|---|
| App shell / sidebar / header | `src/app/components/layout/MainLayout.tsx`, `Sidebar.tsx`, `Header.tsx` | Add one nav entry only, per §3.2 |
| Route registration | `src/app/routes.tsx` | Nest new routes under existing `MainLayout` children |
| Detail views (claim, denial, encounter) | `src/app/components/ui/DrawerShell.tsx`, `BottomDrawer.tsx` | Follow the pattern of `ProcessDetailDrawer.tsx` / `InvoiceDetailDrawer.tsx` — 2-column split (metadata + activity/notes) |
| Modals (confirm posting, record payment, resolve denial) | `src/app/components/ui/Modal.tsx`, and directly model on `RecordPaymentModal.tsx` | `RecordPaymentModal.tsx` already does almost exactly what remittance/PR payment recording needs |
| Status badges (claim status, eligibility, fault) | `src/app/components/ui/badge.tsx` | Extend variant set; do not build a new badge primitive |
| Tabs within a page (e.g. Claims list vs Rejections vs Denials as tabs) | `src/app/components/ui/PillTabs.tsx` | Matches existing tab pattern used elsewhere |
| Settings-style grouped sub-nav | `src/app/components/settings/SettingsSubnav.tsx` | Reuse pattern for Revenue Cycle sub-nav, §3.3 |
| Kanban board (Denial Board) | `src/app/pages/Deals.tsx` Kanban implementation | New component, same visual/drag-drop pattern — see §8.7 |
| Client-linked timeline entries | `src/lib/activityEngine.ts`, `src/app/components/activity/ActivityTab.tsx` | New event type constants only |
| Universal filterable fields | `src/app/context/FieldRegistryContext.tsx` | Register new fields per §5.7 |
| Invoice generation, payment ledger | `src/app/context/InvoiceContext.tsx`, `invoiceTypes.ts` | Extend, do not replace, per §5.6 |
| Report builder & data sources | `src/app/pages/Reports.tsx`, `CustomReportBuilderModal.tsx`, `ReportViewerModal.tsx` | Extend `ReportDataSource` union |
| Patient messaging on claim/balance events | `src/lib/chatbotFlowEngine.ts`, existing WhatsApp/SMS/email trigger infra, `getWhatsappTemplates.ts` | RCM fires events; existing engine sends messages — do not build a second messaging system |
| Payment links | `InvoiceContext.tsx` `paymentLinkUrl` mechanism (already exists on `ClientInvoice`) | Reuse directly for patient statement payment links |
| Role/permission gating (Biller role) | `src/lib/permissions.ts`, `src/types/permissions.ts`, `RolesPermissionsDrawer.tsx`, `CreateRoleDrawer.tsx` | Add "Biller" as a role option using the existing RBAC system, not a new one — see §11 |
| Custom field / form fields for RCM entities | `src/app/components/help/FieldManager.tsx` | Reuse the same custom-field manager UI already built for clients/processes |
| PDF generation (statements, receipts) | `src/lib/pdfGenerator.ts` | Already used for invoices — reuse for patient statements |
| Document storage (EOBs, remittance uploads) | `src/lib/clientDocumentsStore.ts`, `DocumentsTab.tsx` | Reuse for any uploaded billing documents |
| Guided walkthroughs for new RCM screens | `src/app/context/HowItWorksContext.tsx`, `HowItWorksModal.tsx` | Every new worklist should ship with a "How this works" entry, consistent with existing onboarding pattern |
| Design tokens, typography, color, spacing, motion | `docs/DESIGN_NAVODYA.md` in full | Non-negotiable — see §10 |

---

## 7. Human-Confirmation & Trust Patterns (UI-level)

Beyond the AI-specific rule in §4, apply these trust patterns (already implied by `DESIGN_NAVODYA.md` §0 "Clinical trust over cleverness") to every RCM screen:

- **No silent state changes.** Every claim/denial/payment state transition writes an activity entry (§3.4.3) — visible, timestamped, attributed to a person or "System."
- **Every status pairs color + icon + text label** — never color alone (already a hard rule in the design system; RCM must not introduce a color-only status anywhere, e.g. a plain green/red table row).
- **Every blocked/stuck item has a visible owner and next step.** A denial sitting with `faultAttribution: "unattributed"` past 24h escalates visually (not silently) — matches the design system's "transparency of autonomy" principle.
- **Numbers are always `font-mono tabular-nums`** for claim IDs, amounts, dates — per `DESIGN_NAVODYA.md` §1.3 numeric rule. This is a real usability requirement for billers scanning columns of dollar amounts quickly, not just style.

---

## 8. Feature Spec by Stage

Each stage below states: purpose → users → trigger → states → screens → reuse/new → edge cases (validated against the Athelas reference) → explicit "what we do differently and why."

### 8.1 Pre-Visit Eligibility & Verification

**Purpose:** confirm a patient's coverage before they arrive, so front desk isn't surprised at check-in.
**Users:** front desk (primary), biller (exception handling).
**Trigger:** appointment scheduled (auto) + nightly re-check of upcoming appointments + on-demand re-run.
**States:** see `EligibilityStatus` (§5.1).
**Screens:**
- `/revenue-cycle/eligibility` — worklist of upcoming appointments needing attention (Inconclusive/Inactive/Not Covered first, sorted by appointment date ascending).
- Embedded chip on `AppointmentCard.tsx` (§3.4.2) — the primary place most staff will actually see this; the dedicated worklist page is for the biller doing batch cleanup, not the everyday front-desk glance.
**Reuse:** `AppointmentCard.tsx`, `ScheduleAppointmentDrawer.tsx` (add eligibility status display), `AppointmentFilterModal.tsx` pattern for the worklist's filter bar.
**New:** eligibility check scheduling logic (a lightweight scheduled job concept — can be simulated client-side in the prototype phase the same way other "system" actions are currently mocked, e.g. `processLogsStore.ts` patterns), the eligibility clearinghouse integration point (stubbed in v1, real integration flagged in §12).
**Edge cases (from Athelas reference, adapted):**
- Inactive/Not Covered → front desk must correct insurance in the client record (which is possible since we own the client record, unlike Athelas's EHR-can't-write-back limitation) then Re-Run. **This is actually a place we can do better than Athelas** — because Client = Patient in one system we control, "fix it in the EHR" (an external hop in their model) becomes "fix it in the Client Profile" (same app, one click).
- Inconclusive → common causes (data mismatch, member ID format, coverage not found) shown as plain-English hints, not raw payer codes.
- Self-pay/no insurance → always resolves to a self-pay path; front desk proceeds with existing `Services.tsx` fee schedule / manual invoice flow (**reuse**, no new self-pay logic needed).

### 8.2 Check-in & Upfront Collection

**Purpose:** collect estimated patient responsibility at check-in.
**Users:** front desk.
**Reuse:** this is fundamentally an extension of the existing check-in step already implied in `Appointments.tsx` status lifecycle, and the existing `CreateInvoiceDrawer.tsx` / `RecordPaymentModal.tsx` for collecting the payment itself. **No new payment-collection UI required** — only new logic to compute an *estimated* PR amount (from fee schedule + eligibility copay/deductible data) and pre-fill the existing invoice/payment drawers with it.
**New:** "Block PR Rule" concept (§8.10) that can suppress estimated-PR generation for specific CPT codes/conditions — small, config-only addition to the automation rules engine.
**Edge case:** manual charge override — reuse existing manual line-item editing already present in `CreateInvoiceDrawer.tsx`.

### 8.3 Encounter & Charge Capture

**Purpose:** turn a completed, documented visit into a billable record.
**Trigger:** per §2.2 (both conditions).
**Screens:** `/revenue-cycle/encounters` — list view, status column (`pending_documentation` / `ready_to_bill` / `billed` / `reconciled`), filterable by provider/date/status. Encounter Detail Drawer (**reuse** `DrawerShell.tsx`) shows linked appointment, linked Scribe session (if any), CPT codes, and the "Mark Documentation Complete" manual checkbox for non-Scribe encounters.
**Reuse:** `AIScribeConsole.tsx` / `scribeSessionStore.ts` for the Scribe-lock signal; `AppointmentCard.tsx` completion status.
**New:** the Encounter entity itself and its status machine; the manual documentation-complete fallback UI.
**Worklist:** `/revenue-cycle/worklist/pending-docs` — every encounter stuck in `pending_documentation`, sorted by days-waiting, so nothing silently never gets billed. This worklist does not exist in the raw prototype or (visibly) in Athelas's docs — it's a direct product improvement earned by taking the "both conditions required" trigger seriously instead of just picking one.

### 8.4 Claim Scrubbing & Billing Rules

**Purpose:** catch errors before submission, not after a denial three weeks later.
**Users:** biller, assisted by AI (governed per §4).
**Screens:** `/revenue-cycle/automation/rules` — rule list, priority-ordered, each with enabled/disabled toggle (**reuse** `switch.tsx`), severity badge (Critical/Warning/Info — **reuse** `badge.tsx`). Rule creation form reuses `FieldManager.tsx`-style field/condition builder patterns already in the codebase (e.g. `ShareConditionsEditor.tsx` in webforms is a strong structural precedent for "condition + action" rule building — model the new rule builder on it rather than inventing a new conditions UI).
**Claim-level scrub view:** inside the Claim Detail Drawer, a "Scrub Results" section shows AI-detected issues as dismissible chips (Tool-Call Trace Chip pattern from `DESIGN_NAVODYA.md` §10), each Accept/Reject per §4.
**New:** the rule evaluation engine itself (priority-ordered, Hard Block / Skippable / Auto-field-change outcomes — modeled conceptually on the Athelas reference but implemented fresh, since nothing in MantraAssist evaluates prioritized conditional rule chains against a claim today).
**Edge case — Hard Block:** claim cannot be submitted; blocking reason shown inline at the top of the Claim Detail Drawer (missing DOB/insurance ID/NPI, compliance violation, known-bad pattern), styled with the design system's `--block` semantic (reuse `alert.tsx` destructive variant).

### 8.5 Submission

**Purpose:** send the claim.
**Screens:** action button on Claim Detail Drawer + bulk "Resubmit" action on `/revenue-cycle/claims` list (**reuse** the existing bulk-action pattern already present in `Clients.tsx`'s batch actions / `bulk-action-bar` concept from the RCM prototype, restyled to MantraAssist's `Button.tsx`).
**New:** submission clearinghouse integration point (stubbed in v1; see §12).
**Fork after submission:** clean acceptance → Remittance/Posting (§8.8); technical rejection → §8.6; adjudicated-but-declined → §8.7. This three-way fork is the direct, validated structure from the Athelas reference and should be implemented exactly as modeled — it reflects real payer behavior, not an Athelas-specific choice.

### 8.6 Rejection Management

**Purpose:** fix and resubmit claims the payer never accepted.
**Screens:** `/revenue-cycle/worklist/rejections` — worklist grouped by `faultAttribution` (Platform Responsibility items surfaced separately and prioritized for internal/ops resolution, not dumped on the clinic's biller — see §5.3 rationale).
**Reuse:** same list/table component as Claims list, filtered view; same Claim Detail Drawer.
**Edge case:** timely-filing risk must be visually urgent (rejections are invisible to the payer, so the clock is running with zero payer-side safety net) — use the design system's Critical/warning color treatment, and surface `timelyDaysRemaining` prominently, tabular-nums, per §7.

### 8.7 Denial Management — Denial Board

**Purpose:** the biller's primary daily workspace.
**Screens:** `/revenue-cycle/worklist/denials` as a **Kanban board**, columns = `Denied → Under Review → Resubmitted → Reconciled`. **Reuse the Deals.tsx Kanban implementation directly** — same drag-and-drop mechanics (`react-dnd`, already a project dependency), same card visual language, adapted card content (denial cluster summary instead of deal summary). This is the concrete, highest-value instance of "reuse a flow we've already built" from the product brief.
Each card = a `DenialClusterGroup` (§5.4), not an individual claim — grouping by CARC/RARC + payer is what makes this workable at volume, matches the Athelas reference's clustering concept, and matches the prototype's already-good data model.
Clicking a card opens a Drawer (**reuse** `DrawerShell.tsx`) with: the AI-suggested fix (governed per §4), the AI-drafted appeal (governed per §4, editable before send), and the list of individual claims in the cluster with per-claim resolve/resubmit actions.
**New:** the Kanban-card-as-cluster component (visual reuse of Deals, new card content), the AI suggestion/appeal generation logic.
**Edge cases:** partial denial (some CPT lines paid, others denied) and unresolved balance (all lines have an allowed amount but some remains denied) both need distinct flag treatment inside the claim detail (`PR Status: Provisional`, `Not Balanced` equivalents) — resolve via resubmit or write-off, both using the **existing** posting-action mechanism (§8.8), not a separate write-off flow.
**Deferred-claim guardrail:** a biller can defer a denial cluster, but a deferral with no scheduled resync date is disabled by validation — prevents permanent limbo. Cheap, high-value, directly adapted from the Athelas reference gap analysis.

### 8.8 Remittance / Payment Posting

**Purpose:** apply payer payments to the ledger correctly.
**Screens:** `/revenue-cycle/worklist/posting` — queue of remittance lines needing posting confirmation. Posting action modal (**reuse and extend** `RecordPaymentModal.tsx` — it already handles "amount, method, note, receipt" for patient payments; extend it with the five posting actions (Negate / Write Off / Write Off PR / Push to PR / Custom Adjustment) as a mode selector within the same modal rather than five separate modals).
**Preview-before-confirm pattern:** every posting action shows a preview of the resulting balance change before a final "Confirm Posting" — this is the same pattern already used for the AI confirmation gate (§4) and should reuse that visual treatment even though posting itself isn't AI-generated — consistency of "preview before financial action" builds trust regardless of whether a human or AI proposed the change.
**Edge case — Manual Review hold:** posting that would create a negative balance, doesn't balance to claimed charges, or involves a future check date is held, not silently applied — flagged in the worklist with a reason chip.

### 8.9 Patient Responsibility, Statements & Billing

**Purpose:** bill the patient for what they actually owe, once it's actually settled (§5.6 sequencing rule).
**Screens:** `/revenue-cycle/patient-balances` — list view with aging bucket column; `/revenue-cycle/billing` — the "Invoicing & Billing" hub described in §3.2, which is where insurance-linked invoices live alongside a link back to the existing plain `Invoices.tsx` for self-pay.
**Reuse — this is the biggest reuse win in the entire spec:** statement generation and sending is functionally the same job as the existing invoice send flow. `InvoiceContext.tsx` already supports `sentVia: "whatsapp" | "sms" | "email"` and `paymentLinkUrl` generation. A "patient statement" in RCM terms is simply a `ClientInvoice` with `claimId` populated and `insurancePaidAmount` set — **do not build a parallel statement/send system.** Extend `CreateInvoiceDrawer.tsx` / the send flow to pull in insurance-adjusted amounts when a claim is linked, and reuse `pdfGenerator.ts` for the PDF.
**New:** the aging-bucket computation and the PR sequencing-rule gate (a balance doesn't surface for billing until fully settled per §5.6) sitting in front of the existing invoice-creation flow.
**Batch statement automation:** reuse the existing automation/trigger engine (`chatbotFlowEngine.ts` / process trigger steps) to fire "balance ready to bill" as a new trigger condition, letting clinics configure batching (frequency, day-of-week spread) using the **same UI paradigm** already used for other automated messaging in `Process.tsx`, not a new scheduling UI.

### 8.10 Automation Configuration (Rules, Fee Schedule, Prior Auth)

**Purpose:** where billers configure the system's automated behavior.
**Screens:** `/revenue-cycle/automation/rules`, `/automation/fee-schedule`, `/automation/prior-auth`.
**Reuse:** `SettingsSubnav.tsx` pattern for this section's own internal tabs; `FieldManager.tsx` and `ShareConditionsEditor.tsx` structural patterns for building rule conditions; `table.tsx` for the fee schedule grid (directly analogous to any existing pricing/services table, e.g. `Services.tsx`'s pricing list — **model the fee schedule UI directly on `Services.tsx`**, since a CPT fee schedule and a services catalog are structurally the same "code/name/price" pattern).
**Prior Auth tracking:** `PriorAuthRecord` (§5.9) — visits authorized vs. used, expiration status (Active/ExpiringSoon/Exhausted). Reuse `progress.tsx` component for the visits-used progress bar (same primitive already used elsewhere for usage/quota displays).
**AI rule builder (v2 candidate, flag in phasing):** plain-language → structured rule, governed per §4, modeled on the Athelas reference's "Build a rule that does…" pattern but implemented as a new capability, not a port.

### 8.11 Credentialing

**Purpose:** track payer enrollment status per provider — a genuine differentiator per §5.8.
**Screens:** `/revenue-cycle/credentialing` — table view (provider × payer), status badges for both `trueCredentialingStatus` and `transactionEnrollmentStatus` (kept as two distinct, clearly-labeled columns, not merged into one confusing status — this distinction is the whole value of the feature).
**Reuse:** `table.tsx`, `badge.tsx`, and the existing team-member record (`ManageTeamMember.tsx` / `TeamMemberDrawer.tsx`) as the provider identity source — a `CredentialingRecord` should link to the real team member record, not a denormalized provider name, for the same reason Client=Patient unification matters (§2.3).
**New:** the credentialing status tracking UI itself and the `isServiceDateValid` computed-warning logic (flag an appointment/encounter if the rendering provider isn't validly credentialed with that payer on the date of service — a real compliance catch worth having even in v1, per the phasing note in §12).

### 8.12 Reporting & Insights

**Purpose:** give practice managers and billers the numbers that build trust in the system.
**Screens:**
- `/revenue-cycle/overview` — the Revenue Cycle pillar's landing page. Stat cards (**reuse** the Data & Stat Card spec already defined in `DESIGN_NAVODYA.md` §9.2 verbatim: Glass Base background, `radius-lg`, Outfit display metric, tabular-nums) for: claims awaiting action, denial rate, avg days to pay, total A/R, aging summary.
- `/revenue-cycle/payer-performance` — payer-by-payer approval rate (30d/60d/all-time), patient mix %, avg days to pay — **reuse** the prototype's `PayerPerformanceRow` schema directly, it's well-designed.
- `/revenue-cycle/revenue-analysis` — monthly revenue trend (insurance-paid vs. patient-paid split). **Reuse** `recharts` (already a MantraAssist dependency) and the existing `chart.tsx` wrapper component — do not introduce a new charting library.
- Dedicated report templates inside the **existing** `Reports.tsx` / `CustomReportBuilderModal.tsx` for: Aging AR (with the 7-bucket structure from §5.6, flagging 121–180 as approaching timely filing, directly adopting this genuinely useful convention from the Athelas reference), Collections, Provider Adjustments, Claim Adjustments, Submitted Claims — all built as new `templateKey` values inside the **existing** report engine (§3.4.4), not new bespoke pages, except where a report needs a visual (payer performance, revenue trend) that the generic table-based report builder can't express well.
**Month-end close (v2 candidate — see §12):** a guided runbook view (bank tie-out → GL entries → exceptions → A/R roll-forward), using the existing `HowItWorksModal.tsx` guided-walkthrough pattern as the delivery mechanism for the runbook steps rather than building a new wizard component.

---

## 9. Roles & Permissions

**Reuse the entire existing RBAC system** — `src/lib/permissions.ts`, `src/types/permissions.ts`, `RolesPermissionsDrawer.tsx`, `CreateRoleDrawer.tsx`. Do not build a parallel permission system for RCM.

**New:** add a `"Biller"` role option (and/or granular RCM permission flags — `rcm.view`, `rcm.post_payments`, `rcm.submit_claims`, `rcm.manage_rules` — following whatever granularity pattern `permissions.ts` already uses for other modules) so an org can grant RCM access without giving full admin rights, and so a front-desk role can be scoped to see *only* the contextual embeds (§3.4) without full Revenue Cycle pillar access.

---

## 10. Design System Compliance

**Every screen in this spec must comply with `docs/DESIGN_NAVODYA.md` in full — treat it as a hard constraint, not a suggestion.** Specific call-outs relevant to RCM work:

- **Typography:** claim IDs, MRNs, dosages, timestamps → `font-mono` (§1.1). Headings/stat metrics → `font-display` (Outfit). Body/tables/nav → `font-sans` (DM Sans). Numeric financial figures → `tabular-nums` always (§1.3).
- **Color:** RCM must use the **same locked palette** — Navy-to-Slate for hero/active-nav, Electric Blue `#1456f0` for primary actions, Clinical Emerald for verified/live/success states, the same slate text hierarchy. **Do not introduce new accent colors for RCM-specific concepts** — e.g. use the existing `--block`/critical red semantic already implied by destructive patterns elsewhere in the app for Hard Blocks, not a new color.
- **Components:** buttons (pill-shaped primary, per §9.1), stat cards (§9.2), status badges (icon + color + text, §9.3 — mandatory for every claim/denial/eligibility status shown anywhere), tables (sticky header, mono/tabular financial columns, §9.4), forms (§9.5), navigation (§9.6).
- **Agentic patterns:** Agent Presence Ring, Thinking State, Tool-Call Trace Chips, Human-Confirmation Gate, Streaming Caret (§10) — reuse for every AI touchpoint in §4's table.
- **Accessibility:** 4.5:1 contrast floor, color never the sole signal, mandatory focus rings, reduced-motion fallback (§11) — applies to every new RCM component, no exceptions for "biller power-user density" tradeoffs.

---

## 11. Phasing — What Ships When

Not every stage in §8 needs to ship simultaneously. Recommended cut:

**V1 — Core Loop (ship first):**
- Unified Client=Patient wiring, Encounter trigger logic (§2.2–2.3)
- Eligibility check + embed on Appointments (§8.1), manual re-run
- Encounter & Charge Capture incl. Pending Documentation worklist (§8.3)
- Claims list, Claim Detail Drawer, manual scrub rules (no AI-generated rules yet), submission (§8.4–8.5, minus AI rule builder)
- Rejection + Denial worklists incl. Denial Board Kanban reuse (§8.6–8.7), manual (not AI-drafted) appeal notes initially, AI suggestion layer added once core loop is stable
- Manual remittance/EOB entry + posting (§8.8) — live ERA/835 ingestion deferred
- Patient Responsibility + statements via extended Invoice flow (§8.9)
- Contextual embeds: Billing tab on ClientProfile, Activity Tab events, Appointments chip (§3.4)
- Basic RBAC: Biller role (§9)

**V2 — Depth & Automation:**
- AI scrub suggestions, AI denial-fix/appeal drafting (governed per §4)
- Plain-language rule builder (§8.10)
- Credentialing module (§8.11) — high value, not urgent-critical, good V2 anchor
- Payer Performance / Revenue Analysis dashboards (§8.12)
- Live clearinghouse integrations (eligibility + submission + ERA ingestion)

**V3 — Back-office depth:**
- Bank reconciliation (Plaid-style deposit matching, deposit slip ingestion)
- Month-end close runbook
- Billing addendums (post-submission chart-note corrections)
- Prior-auth automation, batch statement scheduling refinements

*Rationale:* V1 delivers the full patient-to-payment loop end to end with real trust patterns (no silent failures, fault attribution, sequencing rule) — a clinic can actually run its billing on it. V2 adds the AI leverage and payer-relationship intelligence once the core data model has been exercised in production. V3 is genuine back-office/accounting depth that matters for scale but doesn't block a clinic from using the product day one.

---

## 12. Open Questions / Assumptions Log

| # | Question | Default assumption used in this spec |
|---|---|---|
| 1 | Which clearinghouse(s) for eligibility/submission/ERA in v2? | Not decided here — schema (§5) is integration-agnostic so this can be decided later without a data model change |
| 2 | Does "Biller" need to be a distinct org-level seat/pricing tier, or just a permission flag? | Assumed permission flag on existing RBAC (§9); pricing/tier implications are a separate commercial decision |
| 3 | Should Scribe be a hard requirement for documentation-lock, or always optional via manual override? | Assumed always-optional manual override (§2.2), so lower-tier clinics without Scribe aren't blocked |
| 4 | Multi-location orgs — is RCM data scoped per-organization (existing `OrganizationContext`) or shared across a parent org's locations? | Assumed scoped per existing `OrganizationContext`, consistent with how the rest of the app already handles multi-tenancy |
| 5 | Appeal-letter sending — through existing fax/email infra, or new? | Assumed reuse of existing communication channels once appeal is approved (§4); if fax is required, note that no fax infrastructure currently exists in MantraAssist and would be new in v2/v3 |

---

## 13. Summary — The One-Sentence Version of This Spec

**RCM is not a new product screwed onto MantraAssist — it's the same client record, the same activity timeline, the same automation engine, the same design system, and the same component library, extended with a purpose-built claims state machine and a handful of genuinely new worklists, wired in at exactly one seam (the Encounter), and held to the same "AI proposes, human confirms" trust standard the rest of the product already promises.**

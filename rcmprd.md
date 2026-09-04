# MantraAssist Native RCM (Revenue Cycle Management) Product Requirements Document (PRD)

**Document Version**: 2.0.0 (Native Build Architecture)  
**Target Platform**: MantraAssist (AI Healthcare Voice Agent, Clinical CRM & Practice Management)  
**Reference Source**: Athelas RCM Claim Lifecycle Specification (`rcm.html`)  
**Workspace Location**: `c:\Users\Mantra\.gemini\antigravity\scratch\ma-figma\rcmprd.md`  
**Date**: September 2026  

---

## 1. Overview: The End-to-End Native RCM User Journey in MantraAssist

This journey details how practice staff (Front Desk, Provider, Certified Biller, Practice Administrator) and the MantraAssist AI (AI Receptionist, AI Scribe, Claim Scrubbing Copilot, Patient Billing Chatbot) experience the 12-stage claim lifecycle natively inside MantraAssist.

### Stage 1: Eligibility Check (Automated Pre-Visit Verification)
When an appointment is booked via the AI Phone Receptionist (`MyAIReceptionist.tsx`) or Front Desk calendar (`Appointments.tsx`), MantraAssist's background automation engine triggers a clearinghouse eligibility check 7 days prior to the visit and nightly thereafter. The front-desk user views the appointment card, now badged with a green `Active`, amber `Inconclusive`, or red `Inactive` pill. If coverage is absent or inconclusive, the AI Receptionist automatically texts the patient via WhatsApp (`Chats.tsx`) with a secure link to upload an updated insurance card; front-desk staff can click "Re-Run Verification" on demand from the appointment drawer without leaving the schedule.

### Stage 2: Check-In & Upfront Collection (Estimated PR Capture)
As the patient arrives, the front-desk receptionist clicks "Check In" in `Appointments.tsx`. The system evaluates the parsed clearinghouse co-pay, coinsurance, and remaining deductible, presenting a prominent **Estimated Patient Responsibility (PR)** widget. The receptionist collects the co-pay via `RecordPaymentModal.tsx` using an in-office card terminal, cash, or card-on-file. An `Estimated PR` placeholder ledger entry is stamped in cents on the visit record; if the front-desk overrides the amount via the appointment "Shield" action, the override is logged with user attribution while the visible balance remains zeroed until post-visit adjudication.

### Stage 3: Encounter & Claim Creation (Clinical Scribe to Billable Claim)
Inside the consultation room, the physician conducts the visit with ambient listening enabled in `AIScribeConsole.tsx`. When the doctor reviews the extracted 11-section EHR prescription and signs off, the signature action locks the note and fires an internal `encounter_signed` event. MantraAssist's Claim Generator instantly binds the patient's verified insurance demographics, rendering provider NPI, facility code, CPT codes, and ICD-10 diagnostic pointers into a structured `ClaimRecord`. If critical billing fields are missing (e.g. unmapped custom CPT or missing subscriber ID), the encounter automatically routes to the **Import Error Resolution Center** with an actionable fix alert.

### Stage 4: Claim Review & Billing Rules (Pre-Submission Scrubbing)
The certified biller opens the **Claims Worklist** (`/claims`) and clicks "Preview & Scrub". MantraAssist's billing rules engine runs five prioritized rule passes: Appointment Rules $\rightarrow$ Encounter Modifying Rules $\rightarrow$ Billing Rules $\rightarrow$ Submission Blocking Rules $\rightarrow$ Fee Adjustment Rules. Hard compliance blocks (missing NPI, invalid zip code, FQHC violation) physically disable the "Submit" button. Simultaneously, the **AI Validation Copilot** (✨) scans the CMS-1500 fields and suggests missing modifiers (e.g. Modifier 25 for E&M with procedure) or correct Place of Service (POS) codes; the biller accepts suggestions with one click or rejects them with a mandatory audit reason.

### Stage 5: Submission (Clearinghouse Transmission & Gateway Tracking)
The biller clicks "Submit Batch" (or the system auto-submits clean claims on a nightly schedule). MantraAssist packages the claims into HIPAA-compliant ANSI X12 837P (Professional) or 837I (Institutional) payloads and dispatches them to the clearinghouse API gateway with Medicare Secondary Payer (MSP) codes auto-attached. The claim card moves to `Submitted` in the Deals Kanban pipeline (`Deals.tsx`). The clearinghouse returns an immediate 999 Functional Acknowledgment followed by a 277 Claim Acknowledgment within 24–72 hours, tracking timely filing countdowns (60/90/120 days) directly on the claim card.

### Stage 6: Rejection Handling (Gateway Technical Error Remediation)
If a claim is rejected at the clearinghouse or payer EDI gateway (before entering adjudication), it moves automatically to the `Clearinghouse Rejected` column in `Deals.tsx`. The biller receives an itemized error badge (e.g., "Subscriber ID not found for Date of Service"). The biller corrects the field directly in the Claim Drawer or syncs corrected data from the client overview. MantraAssist provides a bulk resubmission tool allowing up to 50 corrected claims to be re-dispatched to the clearinghouse gateway in a single action, resetting the timely filing timer.

### Stage 7: Denial Management (Adjudicated Claim Appeals)
When a payer adjudicates a claim but declines payment, the ingested remittance routes the claim to the `Payer Denied` Kanban column and categorizes it as `Site Action Required` or `Unworkable`. The biller inspects the claim detail view, which displays standard CARC/RARC denial reason codes (e.g. `CO-16` lack of info, `PI-59` distinct procedure). If it is a partial denial, procedure lines with allowed amounts remain active while denied lines are highlighted in red with a `Provisional PR` flag. The biller initiates an appeal package, generates a corrected claim addendum, or logs an authorized write-off with a mandatory reason code.

### Stage 8: Remittance & Posting (835 ERA & EOB Ingestion)
As electronic remittance files (ANSI X12 835) arrive from payers, MantraAssist's posting engine parses the remittance loops and auto-posts clean payments within 6 hours. For payers delivering paper checks with Explanation of Benefits (EOB) scans, the biller opens **EOB Copilot** in `Invoices.tsx`, uploads the PDF/image, and the multimodal AI transcribes check numbers, procedure lines, allowed amounts, contractual adjustments, and copays into a side-by-side verification grid. The biller previews the net-zero ledger impact before clicking "Confirm Posting," executing five standard actions: `Push to PR`, `Write Off Contractual`, `Write Off PR`, `Negate`, or `Custom Adjustment`.

### Stage 9: Bank Reconciliation (Plaid-Powered Deposit Matching)
The practice administrator opens `/rcm/reconciliation`, connected to the clinic's operating bank account via Plaid read-only banking APIs. The system continuously cross-references incoming ACH deposits and paper check totals against posted remittance check numbers and dates, achieving 98%+ automated matching. For physical deposit slips, staff upload PDF or CSV slips with content-hash deduplication. For virtual credit cards issued by commercial payers, staff open the "Process Payer Virtual Card" drawer to charge 100% of the funds via Stripe with safeguards preventing misuse for patient cards.

### Stage 10: Patient Responsibility Reconciliation (Remittance True-Up)
With insurance payments and contractual adjustments posted, MantraAssist automatically reconciles the upfront `Estimated PR` against the final `Post-Remittance PR`. If the patient underpaid upfront, the remaining balance moves to patient billing. If the patient overpaid (e.g., actual deductible was met elsewhere), MantraAssist's **Auto-Refund** routine immediately credits the patient's internal balance ledger (`clientCredits`) or triggers an automated Stripe refund. PR balances are strictly held from patient invoicing until all primary insurance procedure lines balance to zero.

### Stage 11: Patient Billing & Digital Collections (Omnichannel Recovery)
Finalized patient balances trigger MantraAssist's digital-first collection workflows. Rather than waiting 30 days for expensive paper statements, MantraAssist schedules weekly staggered batch runs (~50% of outstanding accounts, capped at once every 14 days). The system dispatches an interactive WhatsApp message and SMS containing a secure hosted payment link (`paymentLinkUrl`). If the patient calls the clinic with questions, the AI Voice Receptionist (`MyAIReceptionist.tsx`) verifies caller identity, explains the exact EOB calculation in plain English, and securely processes the payment over the phone using the card-on-file.

### Stage 12: Month-End Close (A/R Roll-Forward & Financial Tie-Out)
On the final calendar day of the billing cycle, the practice administrator generates the **Month-End Close Report** in `Reports.tsx`. The system calculates the standard healthcare A/R roll-forward equation ($Closing\ A/R = Opening\ A/R + Billed - Collections - Adjustments - Write-offs$) and breaks down outstanding receivables into aging buckets (`0–30`, `31–60`, `61–90`, `91–120`, `121–180`, `181–365`, `366+` days). The 121–180 day bucket is highlighted with a timely-filing hazard indicator. Unmatched bank deposits are placed into a clearing account, allowing the practice to lock the financial period and export clean journal entries to QuickBooks or general ledger software.

---

## 2. Stage-by-Stage Feature Specification

The table below specifies the native implementation of each stage and edge-case branch in MantraAssist:

| Stage # / Flow | MantraAssist Screen & Route | Build Classification | What's Built / How It Works in MantraAssist | Actor (Human vs. AI vs. Automated) |
|---|---|---|---|---|
| **1.0 Eligibility Check** | [`Appointments.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Appointments.tsx) (`/appointments`) | **EXTEND** + **NEW Gateway** | 270/271 clearinghouse gateway client checks payer eligibility 7d pre-visit + nightly. Injects `eligibility_status`, `copay_amount`, `deductible_remaining`, `coinsurance_pct` into appointment context. | **Automated** (System background job) |
| 1.1 *Branch: Inactive / Not Covered* | [`Chats.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Chats.tsx) (`/chats`) & `Appointments.tsx` | **REUSE** + **EXTEND** | Eligibility failure triggers workflow step `stagemovement` to "Insurance Issue". Auto-sends WhatsApp message asking patient to photograph updated card. Front desk sees red alert on calendar card. | **Automated** (AI dispatch) $\rightarrow$ **Human** (Front Desk review) |
| 1.2 *Branch: Inconclusive* | `ScheduleAppointmentDrawer.tsx` | **EXTEND** | Amber warning badge on appointment. Drawer displays exact clearinghouse error (e.g. "Subscriber ID Format Invalid"). Staff edits insurance fields inline and clicks "Re-Run Verification". | **Human** (Front Desk / Registrar) |
| 1.3 *Branch: Self-Pay / No Insurance* | [`RecordPaymentModal.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/invoices/RecordPaymentModal.tsx) | **REUSE AS-IS** | Inconclusive/uninsured patient defaults to cash fee schedule from [`servicesStore.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/servicesStore.ts). Front desk collects self-pay charge; tagged as `paymentType: "self_pay"`. | **Human** (Front Desk) |
| **2.0 Check-In / Upfront Collection** | `Appointments.tsx` & `RecordPaymentModal.tsx` | **EXTEND** | Appointment check-in modal displays pre-calculated Estimated PR. Front desk collects payment via terminal, cash, or card-on-file. Records matching `Estimated PR` credit entry in ledger in cents. | **Human** (Front Desk) |
| 2.1 *Branch: Block PR Rule Active* | [`Process.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Process.tsx) (`/process`) | **EXTEND** | Process workflow engine evaluates CPT code against practice billing rules. If rule blocks PR (e.g. 100% covered preventative wellness exam), Estimated PR widget hides and sets required collection to $0. | **Automated** (Rule engine) |
| 2.2 *Branch: Charge Override* | `Appointments.tsx` (Appointment Card) | **EXTEND** | Shield icon on appointment opens PR Override popover. Front desk enters custom dollar amount in cents. Override reason is logged to [`activityEngine.ts`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/activityEngine.ts). | **Human** (Front Desk) |
| **3.0 Encounter / Claim Creation** | [`AIScribeConsole.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/AIScribeConsole.tsx) (`/scribe`) $\rightarrow$ `/claims` | **EXTEND** (Scribe) + **BUILD NEW** (Claim Model) | Physician signs chart note in AI Scribe. Finalize event locks note to read-only and automatically instantiates a new `ClaimRecord` linking patient, NPIs, ICD-10s, and CPT lines. | **Human** (Provider signs) $\rightarrow$ **Automated** (Claim generator) |
| 3.1 *Branch: Import Error* | `/rcm/import-errors` (Nested under `/deals` or `/claims`) | **BUILD NEW** | Pre-claim scrubber intercepts incomplete encounters (missing NPI, unmapped CPT, invalid member ID). Renders dedicated worklist with inline quick-fix inputs. | **Human** (Biller / Clinic Admin) |
| 3.2 *Branch: Billing Addendum* | `TranscriptDetailDrawer.tsx` | **EXTEND** | Post-signature note corrections require a formal "Billing Addendum". Only the original provider can sign/finalize. Re-locks note and syncs updated diagnosis codes to linked claim. | **Human** (Provider only) |
| **4.0 Claim Review & Billing Rules** | `/claims/:id` (Claim Detail Drawer) | **EXTEND** (Rule Engine) | Biller clicks "Preview & Scrub". Runs 5 rule passes in priority order. Renders Star auto-changes, Skippable Rule warnings, or Hard Blocks. | **Human** (Biller) + **Automated** (Rules engine) |
| 4.1 *Branch: Hard Block* | `/claims/:id` | **EXTEND** | Hard block banner disables "Submit" button. Lists blocking compliance violations (e.g., FQHC sliding fee schedule missing, NPI mismatch). Biller must resolve data before proceeding. | **Automated** (Blocker) $\rightarrow$ **Human** (Biller resolves) |
| 4.2 *Branch: AI Validation (✨)* | `/claims/:id` | **EXTEND** (LLM Scrubber) | Multimodal AI checks clinical transcript against CPT/ICD codes. Recommends missing modifiers (e.g. Modifier 25, 59), Place of Service fixes. Biller clicks "Accept" or provides "Reject Reason". | **AI** (Suggests) $\rightarrow$ **Human** (Confirms/Rejects) |
| 4.3 *Branch: Direct Submission Edit* | `/claims/:id` | **REUSE AS-IS** | Biller clicks pencil icon on individual claim fields to override scrubber recommendations. Displays explicit warning that automated validation has been bypassed. | **Human** (Biller) |
| **5.0 Submission** | `/claims` & [`Deals.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Deals.tsx) (`/deals`) | **BUILD NEW** (EDI 837) + **EXTEND** (Kanban) | Biller clicks "Submit Clean Claims" (or nightly auto-submit). Generates 837P/837I payloads to clearinghouse gateway. Moves card to `Submitted` stage; starts timely filing countdown clock. | **Human** (Biller batch) or **Automated** (Nightly runner) |
| **6.0 Rejection Branch** | `Deals.tsx` (Kanban Column: `Rejections`) | **REUSE** (Kanban) + **EXTEND** (Sub-chain) | Clearinghouse gateway technical errors transition claim to `More Info Required` or `Athelas Responsibility`. Sub-chain tracks `Not Started` $\rightarrow$ `Awaiting Updates` $\rightarrow$ `Updated`. | **Automated** (Ingest error) $\rightarrow$ **Human** (Biller resolves) |
| 6.1 *Branch: Blocked Sub-State* | `ProcessDetailDrawer.tsx` | **REUSE AS-IS** | Claim requiring clearinghouse engineering intervention triggers internal ticket via existing `liveintaketicket` step key or dispatches webhook to support. | **Human** (Biller escalates) |
| 6.2 *Branch: Bulk Resubmission* | `/claims` (Batch Toolbar) | **EXTEND** | Biller selects up to 50 corrected claims in the table, clicks "Batch Resubmit". Dispatches batch payload to clearinghouse; cards move back to `Submitted`. | **Human** (Biller) |
| 6.3 *Branch: Not Workable / Write-Off* | `RecordPaymentModal.tsx` | **REUSE AS-IS** | Biller abandons uncollectible technical rejection. Selects "Write Off Claim" with reason code `bad_debt` or `timely_filing_expired`. Terminal status logged. | **Human** (Biller / Admin) |
| **7.0 Denial Branch** | `Deals.tsx` (Kanban Column: `Denials`) | **REUSE** (Kanban) + **BUILD NEW** (CARC Map) | Adjudicated unpaid claims land in `Site Action Required` or `Unworkable` (Unavoidable vs. Regrettable). CARC/RARC denial reason code tags rendered on card. | **Automated** (ERA parse) $\rightarrow$ **Human** (Biller review) |
| 7.1 *Branch: Partial Denial* | `/claims/:id/ledger` | **EXTEND** | Line items display individual adjudication: procedure 1 paid, procedure 2 denied. Shows red outstanding balance, sets `PR Status: Provisional` and `Status: Not Balanced`. | **Human** (Biller decides appeal vs write-off) |
| 7.2 *Branch: Unresolved Balance* | `/claims/:id/ledger` | **EXTEND** | Procedure lines allowed $> \$0$ but charged balance short due to contractual adjustments (e.g. `PI-59`). Biller writes off remainder or pushes allowable remainder to PR. | **Human** (Biller ledger adjust) |
| **8.0 Remittance / Posting** | `/rcm/remittance` & [`Invoices.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Invoices.tsx) | **EXTEND** (Posting Ledger) | 835 ERA auto-posts clean payments within 6h. Biller executes 5 net-zero posting actions: `Push to PR`, `Write Off Contractual`, `Write Off PR`, `Negate`, `Custom Adjustment`. | **Automated** (Auto-post) + **Human** (Manual post) |
| 8.1 *Branch: Manual Review Hold* | `/rcm/remittance/exceptions` | **EXTEND** | Auto-posting held if: negative balance created, conflicting PR across resubmissions, remit $\ne$ ERA charges, future check date, or primary contains `OA23`. Held for human QA. | **Automated** (Halt) $\rightarrow$ **Human** (Biller balance QA) |
| 8.2 *Branch: Archived Remit* | `/rcm/remittance` | **EXTEND** | Biller marks duplicate or corrupted remit as `Archived`. Excluded from ledger balance calculations; reversible via "Unarchive". | **Human** (Biller) |
| 8.3 *Branch: EOB Copilot* | `/rcm/eob-copilot` | **EXTEND** (Multimodal LLM) | Biller uploads paper EOB PDF/scan. Multimodal AI transcribes check #, date, CPT rows, allowed/denied amounts, and CARC codes into editable QA grid. Biller approves posting. | **AI** (Vision OCR/Extract) $\rightarrow$ **Human** (QA Approve) |
| **9.0 Bank Reconciliation** | `/rcm/reconciliation` | **BUILD NEW** (Plaid Engine) | Plaid integration continuously ingests bank deposits. Matches bank ACH credits to posted ERA check trace numbers (98%+ match rate). Split Deposits vs. Checks tabs. | **Automated** (Plaid sync & matcher) |
| 9.1 *Branch: Deposit Slip Ingestion* | `/rcm/reconciliation/upload` | **BUILD NEW** (Hasher/Parser) | Staff uploads PDF/CSV deposit slip (max 10MB / 3k rows). AI extracts items. Rejects upload if `DUPLICATE_CHECK_NUMBER`, total mismatch, or content-hash duplicate detected. | **AI** (Extraction) + **Automated** (Hash audit) |
| 9.2 *Branch: Virtual Card Processing* | `/rcm/virtual-cards` | **EXTEND** (Stripe Terminal) | Biller enters payer virtual credit card details to drain 100% of funds via Stripe. Strict UI banners prevent accidental use for patient card-reader transactions. | **Human** (Biller) |
| **10.0 PR Reconciliation** | [`InvoiceContext.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/context/InvoiceContext.tsx) | **REUSE** (Credits) + **EXTEND** (True-Up) | 3-way check upon ERA posting: Payment = PR (cleared), Payment < PR (remainder to patient statement), Payment > PR (Auto-Refund credit added via `addClientCredit`). | **Automated** (True-up runner) |
| 10.1 *Branch: Deferred Claim* | `Deals.tsx` | **EXTEND** | Biller pauses PR generation for disputed claim. Guardrail: system prohibits indefinite deferral without a mandatory resumption date; flags claims deferred $>120$ days. | **Human** (Biller sets deferral date) |
| **11.0 Patient Billing / Collection** | `Invoices.tsx`, `Chats.tsx`, `MyAIReceptionist.tsx` | **REUSE** (Omnichannel) + **EXTEND** (Batching) | Weekly batch statement runner (~50% split, max once every 14d). Dispatches WhatsApp/SMS payment links. Inbound calls to AI Voice Receptionist answer billing questions and charge cards. | **Automated** (Batch link dispatch) + **AI** (Voice phone collection) |
| **12.0 Month-End Close** | [`Reports.tsx`](file:///c:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/pages/Reports.tsx) (`/reports`) | **EXTEND** (Aging) + **BUILD NEW** (GL Close) | A/R roll-forward engine ($Close = Open + Billed - Paid - Adjust - WriteOff$). Healthcare aging buckets (`0-30` through `366+` with `121-180` timely filing warning). Period lock. | **Human** (Admin / Financial Controller) |

---

## 3. New MantraAssist Modules Required (Scoped Individually)

To support native RCM, five genuinely new modules must be introduced into the MantraAssist codebase:

### Module 1: Claims Engine & Claim Detail Drawer (`/claims`)
* **Purpose**: Core transactional record and UI for managing medical insurance claims (separate from patient invoices).
* **Routes & Components**:
  - Route: `/claims` (Tabular directory with search, filters by payer, provider, status, aging).
  - Component: `src/app/components/claims/ClaimDetailDrawer.tsx` (Split-view drawer: left side renders editable CMS-1500 / UB-04 form blocks; right side renders rules validation, AI suggestions, and activity audit stream).
  - Component: `src/app/components/claims/BatchClaimToolbar.tsx` (Multi-select bar for batch scrub, submit, and export).
* **State Store**: `src/lib/claimsStore.ts` (Reactive store backed by indexedDB/sessionStorage syncing claim lifecycles, procedure lines, and submission timestamps).

### Module 2: Clearinghouse Gateway Connector (`/settings?tab=clearinghouse`)
* **Purpose**: Secure abstraction layer managing ANSI X12 EDI transactions with clearinghouse partners (Stedi, Waystar, or Availity APIs).
* **Components**:
  - API Client: `src/lib/clearinghouse/ediClient.ts` (Handles X12 270/271 eligibility requests, 837P/837I claim submission payloads, 999/277 acknowledgment polling, and 835 ERA retrieval).
  - Settings UI: `src/app/components/settings/ClearinghouseConfigSection.tsx` (Credentials for trading partner IDs, submitter IDs, SFTP/API keys, and live/test mode switches).

### Module 3: Pre-Claim Scrubbing & Import Error Center (`/rcm/import-errors`)
* **Purpose**: Intercepts clinical encounters generated by AI Scribe that fail baseline billing validation before entering the formal claim pipeline.
* **Components**:
  - Route: `/rcm/import-errors` (Kanban/Table view categorized by error sub-type: `Missing Insurance`, `Unregistered Provider`, `Custom CPT Unmapped`, `Duplicate Patient`).
  - Component: `src/app/components/rcm/ImportResolutionModal.tsx` (Modal providing inline mapping of custom CPTs to standard CPT/HCPCS, provider NPI registration, or patient record merging).

### Module 4: Bank Reconciliation & Plaid Matcher (`/rcm/reconciliation`)
* **Purpose**: Automated matching of posted insurance remittances to practice bank account deposits.
* **Components**:
  - Route: `/rcm/reconciliation` (Two-tab interface: "Bank Deposits" vs. "Posted ERAs / Checks").
  - Service: `src/lib/plaidReconciliationEngine.ts` (Plaid Link connection, transaction ingestion, and algorithmic matching of deposit amounts, check trace numbers, and settlement dates).
  - Component: `src/app/components/rcm/DepositSlipUploadModal.tsx` (PDF/CSV deposit slip upload with SHA-256 content-hash deduplication).

### Module 5: General Ledger (GL) Month-End Roll-Forward Engine (`/rcm/close`)
* **Purpose**: Healthcare accounting closure, tie-out verification, and period-locking.
* **Components**:
  - Route: `/rcm/close` (Step-by-step month-end wizard: 1. Bank tie-out $\rightarrow$ 2. Unposted deposit clearing $\rightarrow$ 3. A/R roll-forward tie-out $\rightarrow$ 4. Period Lock).
  - Engine: `src/lib/glRollForwardEngine.ts` (Evaluates $Closing\ A/R = Opening\ A/R + Billed - Paid - Adjustments - WriteOffs$; locks accounting periods against historical edits).

---

## 4. Existing MantraAssist Modules Being Extended

The following table details precisely what exists today in MantraAssist versus what must be added:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   MANTRAASSIST EXISTING MODULE EXTENSIONS                        │
├──────────────────────────┬───────────────────────────┬───────────────────────────┤
│ Module / File            │ Current State             │ Required Extended State   │
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ Appointments.tsx         │ Calendar scheduling,      │ • 270/271 Eligibility pill│
│ & Drawers                │ provider select, statuses │ • Estimated PR card widget│
│                          │ (Scheduled, Completed)    │ • Shield override in cents│
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ AIScribeConsole.tsx      │ Ambient audio capture,    │ • Finalize lock event     │
│ & TranscriptDetailDrawer │ Deepgram STT, 11-section  │ • Auto-generate Claim     │
│                          │ prescription PDF dispatch │ • Billing addendum gate   │
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ InvoiceContext.tsx       │ Simple unit-price line    │ • 5-bucket procedure lines│
│ & RecordPaymentModal     │ items, cash/card payments,│ • 5 posting actions       │
│                          │ client credit ledger      │ • Virtual card terminal   │
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ FieldRegistryContext.tsx │ Modules: client, process, │ • Add "claim" module      │
│                          │ appointment, scribe       │ • Seed: NPI, CPT, POS,    │
│                          │ 23+ data types (money)    │   modifiers, CARC/RARC    │
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ permissions.ts           │ Fixed module permissions: │ • Add `claims`, `rcm`     │
│                          │ clients, processes, calls,│ • Enforce Biller vs Front │
│                          │ stage-level overrides     │   Desk vs Doctor actions  │
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ Process.tsx              │ Multi-stage pipeline,     │ • 5-tier claim scrubber   │
│ & useProcessStore.ts     │ field/intent conditions,  │ • Star auto-changes       │
│                          │ stagemovement trigger     │ • Hard block halt logic   │
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ Chats.tsx &              │ Voice receptionist, SMS/  │ • Plain-English EOB expl. │
│ MyAIReceptionist.tsx     │ WhatsApp inbox, dynamic   │ • Conversational payment  │
│                          │ payment link generation   │ • Card-on-file execution  │
├──────────────────────────┼───────────────────────────┼───────────────────────────┤
│ Reports.tsx              │ Revenue, calls, appts;    │ • Healthcare aging buckets│
│                          │ sum/avg/count metrics;    │   (0-30 to 366+ days)     │
│                          │ date range filters        │ • 121-180d filing warning │
└──────────────────────────┴───────────────────────────┴───────────────────────────┘
```

---

## 5. State & Automation Model (MantraAssist Engine Native)

Athelas's statuses and ledger actions are translated directly into concrete TypeScript types, lifecycle stages, and automation triggers for MantraAssist's internal engine:

### 5.1 Claim Lifecycle Status Machine (`ClaimStatus`)
To be defined in `src/app/types/claimTypes.ts`:
```typescript
export type ClaimStatus =
  | "draft"                    // Initial encounter formed, pending scrub
  | "import_error"             // Pre-claim scrub failed (missing NPI, CPT, Member ID)
  | "ready_to_submit"          // Scrubbed, all rules passed, pending batch dispatch
  | "submitted"                // Dispatched to clearinghouse, awaiting 277 ACK
  | "clearinghouse_rejected"   // 277 ACK rejected (formatting, missing info, timely-filing risk)
  | "payer_acknowledged"       // Accepted into payer claims engine, pending adjudication
  | "payer_denied"             // Adjudicated with zero allowed amount (CARC code attached)
  | "partially_paid"           // Adjudicated with partial payment + denied procedure lines
  | "remittance_posted"        // 835 ERA posted to ledger, contractual adjustments written off
  | "pr_balanced"              // Patient responsibility trued up and balanced
  | "settled_closed"           // Fully paid by payer & patient; zero balance
  | "written_off";             // Uncollectible balance written off (terminal)
```

### 5.2 Patient Responsibility Lifecycle (`PRStatus`)
Tracks patient liability across the clinical-to-remittance timeline:
```typescript
export type PatientResponsibilityStatus =
  | "none"                     // 100% covered preventative or self-pay invoice
  | "estimated_pr"             // Calculated pre-visit based on 271 eligibility
  | "provisional_pr"           // Remittance received with denied procedure lines pending appeal
  | "post_remittance_pr"       // Remittance finalized, exact patient share determined
  | "invoiced_pr"              // Transferred to active patient invoice, payment link sent
  | "paid_pr"                  // Settled by patient payment or client credit
  | "credit_adjusted";         // Overpayment converted to account credit
```

### 5.3 Remittance Ledger Posting Actions (`PostingActionType`)
Net-zero double-entry ledger actions executing inside `InvoiceContext.tsx`:
```typescript
export type PostingActionType =
  | "push_to_pr"               // Pushes denied or allowable balance to patient statement
  | "write_off_contractual"    // Contractual discount write-off (e.g. CO-45 PPO discount)
  | "write_off_pr"             // Practice courtesy or hardship discount on patient share
  | "write_off_uncollectible"  // Bad debt write-off on unworkable rejections/denials
  | "negate_charge"            // Reversal of prior claim charges
  | "custom_adjustment";       // Practice-specific adjustment with mandatory note
```

### 5.4 Automation Engine Triggers (`Process.tsx`)
New automation event triggers to add to `WorkflowStep.trigger`:
1. `on_eligibility_failure`: Fires when 270/271 check returns `Inactive` or `Inconclusive` $\rightarrow$ triggers WhatsApp message requesting updated card.
2. `on_chart_note_signed`: Fires in AI Scribe $\rightarrow$ triggers claim generation and runs pre-claim scrubber.
3. `on_clearinghouse_rejection`: Fires upon 277 reject $\rightarrow$ moves claim card to `Rejections` column in `Deals.tsx` and sends biller notification.
4. `on_era_posted`: Fires when 835 matches $\rightarrow$ triggers Stage 10 PR True-Up runner.
5. `on_timely_filing_hazard`: Fires when claim age hits 120 days $\rightarrow$ escalates priority badge to `CRITICAL` in Deals drawer.

---

## 6. Deferred & Blocked Items from Athelas Open Gaps

The reference document (`rcm.html`) identified 12 open gaps in Athelas's documentation. Here is how they are handled in MantraAssist's native build:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   ATHELAS GAPS RESOLUTION MATRIX FOR V1                          │
├─────┬─────────────────────────────────────┬──────────────┬───────────────────────┤
│ Gap │ Description                         │ Status in V1 │ Rationale & Handling  │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 01  │ No per-payer timely filing table    │ SAFELY       │ Stub with clinic-     │
│     │ (docs state "typically 60-90 days") │ STUBBED      │ configurable payer    │
│     │                                     │              │ table in Settings.    │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 02  │ Soft SLA figures ("about 15 days",  │ SAFELY       │ Define strict internal│
│     │ "about 24 hours")                   │ STUBBED      │ queue SLAs: 24h scrub,│
│     │                                     │              │ 48h resubmit.         │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 03  │ Target Allowed Amounts (TAA) logic  │ SAFELY       │ Omit black-box auto-  │
│     │ is completely opaque                │ STUBBED      │ writeoffs; require    │
│     │                                     │              │ biller confirmation.  │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 04  │ No CARC/RARC taxonomy or mapping    │ SAFELY       │ Ingest official WPC   │
│     │ to Unavoidable vs. Regrettable      │ STUBBED      │ CARC/RARC table into  │
│     │                                     │              │ Field Registry.       │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 05  │ Rules Tab rollout is inconsistent   │ SAFELY       │ Build standard rules  │
│ & 06│ and Rule Builder is Beta in Athelas │ STUBBED      │ engine natively into  │
│     │                                     │              │ Process.tsx.          │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 07  │ Clearinghouse mechanics unspecified │ BLOCKING     │ Must select partner   │
│     │ (API vs. SFTP, payload schema)      │ FOR STAGE 5  │ (Stedi/Waystar) before│
│     │                                     │              │ coding EDI 837 client.│
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 08  │ Pricing model rate not disclosed    │ SAFELY       │ N/A — Native build    │
│     │ (percentage of collections private) │ STUBBED      │ eliminates third-     │
│     │                                     │              │ party rev-share fee.  │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 09  │ No provider credentialing workflow  │ BLOCKING     │ Providers must be pre-│
│     │ documented                          │ FOR GO-LIVE  │ enrolled with payers; │
│     │                                     │              │ manage via checklist. │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 10  │ Faxing/messaging appeals cluster    │ SAFELY       │ Stub appeals via PDF  │
│     │ not fully documented                │ STUBBED      │ download & existing   │
│     │                                     │              │ email dispatch.       │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 11  │ Calendar cluster out of scope       │ SAFELY       │ Fully covered by      │
│     │                                     │ STUBBED      │ Appointments.tsx.     │
├─────┼─────────────────────────────────────┼──────────────┼───────────────────────┤
│ 12  │ Features in Development: lockbox,   │ SAFELY       │ Lockbox stubbed via   │
│     │ interest payments on claims         │ STUBBED      │ manual EOB upload in  │
│     │                                     │              │ v1 release.           │
└─────┴─────────────────────────────────────┴──────────────┴───────────────────────┘
```

---

## 7. Open Questions for the Product Team

Before kicking off sprint planning for native RCM, the product team must align on the following architectural questions:

1. **Clearinghouse API Partner Selection (Blocking Stage 5)**:
   Which clearinghouse infrastructure provider will MantraAssist connect to?
   - **Option A: Stedi (Recommended)**: Modern, developer-first JSON REST APIs for 270/271, 837, and 835 with zero legacy SFTP overhead.
   - **Option B: Waystar / Change Healthcare / Availity**: Traditional clearinghouse aggregators with broader direct-to-payer commercial connectivity but heavy SFTP/batch processing requirements.

2. **Scope of Billing Forms (CMS-1500 vs. UB-04)**:
   Does MantraAssist intend to bill institutional facility charges (UB-04) for surgery centers/hospitals, or exclusively Professional billing (CMS-1500) for outpatient clinics, behavioral health, and telehealth?
   *(Recommendation: Restrict v1 to Professional CMS-1500 to match MantraAssist's core outpatient customer base).*

3. **Real-Money Patient Refunds via Stripe**:
   When an overpayment occurs in Stage 10, should MantraAssist trigger an automated refund to the patient's credit card via the Stripe API, or should it credit the patient's internal clinic balance ledger (`clientCredits`) by default?

4. **Dedicated RCM Navigation Placement**:
   Should billing capabilities live inside the existing navigation structure (e.g. extending `/deals` and `/invoices`), or should a dedicated top-level sidebar item **Claims / RCM** (`/claims`) be added alongside `Clients`, `Deals`, `Appointments`, and `AI Scribe`?
   *(Recommendation: Add a dedicated `/claims` top-level route to give billers a distraction-free operational workspace).*

---

*Authored for the MantraAssist Engineering & Product Design Team.*

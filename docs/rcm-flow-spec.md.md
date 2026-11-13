# MantraAssist RCM — Product Flow Spec (Prototype)

Nov 13, 2026 · @Navodya

## Scope and assumptions

This spec fixes **where RCM lives, how each flow runs, which pipelines and automations drive it, and which fields it needs**, so the prototype can be built on mock data before any backend work. It is written against the current mantra-assist prototype (from the codebase review on 2026-11-13) and reuses what already exists wherever possible.

| Decision | What this spec assumes |
| --- | --- |
| Market | US outpatient clinics first: ophthalmology, multi-specialty. Professional claims (837P) only; facility claims later |
| Who bills | The clinic's own staff (front desk, billers) inside MantraAssist. An outsourced billing team can use the same screens with a Biller role |
| Connectivity | A clearinghouse behind a vendor-neutral interface. In the prototype this is a **mock adapter** with canned scenarios (active, inactive, AAA rejects, 999/277CA rejects, 835 paid/denied) |
| Data | Mock data in the same local stores as the rest of the prototype; every new entity gets a typed store so the backend can replace it one-for-one |
| AI rule | AI proposes, a person confirms anything that moves money or changes a claim (codes, appeal letters, voice-agent benefits) |
| Existing work | The `rcm-2` branch's screens are the starting UI; the `rcm` branch's eligibility drawer is ported in. One insurance model wins (see section 9) |

**Design principles**

1. **One record per real thing.** Coverage, eligibility check, encounter, claim, denial and patient balance are separate records linked to the client and appointment, never free text copied onto a claim.
2. **Pipelines move records; tasks move people.** Each RCM record type runs on a Process (pipeline) with stages; anything a person must do becomes a Task linked to that record.
3. **Every screen shows plain language.** Raw 271/835 data stays behind a "View raw" link for billers.
4. **Automations are the default path; queues hold the exceptions.** Staff should mostly see work items, not every claim.

## Where RCM lives

RCM gets one new sidebar pillar, **Revenue Cycle**, for billers, plus small, specific touchpoints inside the screens front desk and clinicians already use. Front desk and clinicians should never need to open the Revenue Cycle pillar to do their part.

### New sidebar pillar: Revenue Cycle

| Screen | Who uses it | What it shows | Starting point in code |
| --- | --- | --- | --- |
| RCM Home | Biller, practice manager | Today's queues with counts, money at stake, KPIs (clean-claim rate, denial rate, days in A/R) | New |
| Eligibility worklist | Front desk lead, biller | Upcoming appointments with coverage status; failed or inconclusive checks first | `rcm-2` EligibilityWorklist + `rcm` EligibilityDetailDrawer |
| Prior auth list | Biller | Auths required, pending, approved, expiring; visits used vs approved | `rcm-2` PriorAuthList |
| Charges to review (encounters) | Coder, provider | Signed visits waiting for coding approval; AI-suggested codes to accept | `rcm-2` EncountersList |
| Claims | Biller | All claims by status, payer, age; claim detail drawer with timeline | Existing `Claims.tsx` + `rcm-2` ClaimsList / ClaimDetailDrawer |
| Rejections worklist | Biller | Claims rejected before adjudication (999 / 277CA / scrubber), with the fix needed | `rcm-2` RejectionsWorklist |
| Denials board | Biller | Kanban of denials by stage, grouped by reason; appeal deadlines | `rcm-2` DenialBoard |
| Payment posting | Biller | ERAs received, auto-posted vs needing review; manual EOB entry | `rcm-2` PaymentPostingWorklist + `RecordPaymentModal` |
| A/R follow-up | Biller | Unpaid claims by aging bucket (0–30, 31–60, 61–90, 90+) and payer | New (work queue view of Tasks) |
| Patient balances | Front desk, biller | Patients owing money, statements sent, payment plans | `rcm-2` Patient Balances |
| RCM reports | Practice manager | Report builder sources for claims, denials, payments, A/R | Extend `reportEngine.ts` |

### RCM touchpoints inside existing screens

| Existing screen | What gets added | Why there |
| --- | --- | --- |
| Schedule appointment drawer | Insurance picker (from the patient's coverages); "Verify now" button; result chip; auth-required warning | Coverage problems are cheapest to fix before the visit |
| Appointment card / calendar | Coverage chip: green verified, amber inconclusive, red inactive, grey not checked | Front desk sees risk at a glance |
| Appointment detail drawer | Eligibility summary (copay, deductible remaining, coinsurance, OOP remaining), estimate, "Re-run", link to raw | The visit-day view |
| Check-in (front desk and kiosk) | Confirm insurance card, capture card photos, collect copay | Natural moment to collect money and fix data |
| Client profile | New **Insurance** tab (coverages, primary/secondary, card images, eligibility history) and **Billing** tab (claims, balances, payments, statements) | One place for a patient's money story |
| AI Scribe / visit note | "Codes" panel: suggested ICD-10 and CPT + modifiers to accept, edit or decline; "Sign and send to billing" | Charges are captured where the visit is documented |
| Invoices | Invoice linked to claim; shows "insurance paid" and "patient owes" | Patient balance comes from adjudication |
| Tasks | RCM task types (enrollment, fix demographics, denial follow-up, call payer), linked to their record, with priority and due date | All human work lands in one inbox |
| Deals / pipeline board | Claim, denial and patient-balance pipelines visible as kanban | Reuses existing board UI |
| Chats / WhatsApp templates | Templates for estimate, statement, payment link, missing-insurance request | Patient-facing money messages |
| AI Receptionist | Two new call types: payer benefits call (fallback) and patient balance reminder | Reuses existing voice-agent config |
| Settings | New **Billing setup** section: billing entity, NPIs, tax ID, locations and POS, fee schedules, payers and enrollment, clearinghouse connection, claim defaults | Billing identity is set once, not typed per claim |
| Integrations | Clearinghouse card (eligibility, claims, ERA) in the existing registry | Same pattern as other integrations |
| Notifications | Clearinghouse alerts (already in settings), new events for rejections, denials, auth expiry | Existing toggles become real |

## End-to-end flow

The happy path runs automatically from booking to a closed balance; staff only touch the four exception points, each of which creates a task and loops back.

&#91;embedded content: RCM flow · 10 main steps, 4 exception loops\]

Read it as a snake: top row left to right (before and at the visit), middle row right to left (claim to payment), then down the left column to the patient's balance.

## Pipelines

Six pipelines run RCM. They sit on the existing Process system (`useProcessStore.ts`, whose `entityType` already includes `insurance` and `claim`); the current default "Insurance and Claims" and "Claim" processes are replaced by the ones below. Stage names map to a fixed system status per record, set by an explicit mapping table rather than today's substring match on the stage name. SLAs are starting proposals to tune with clinics.

### 1. Coverage verification (entity: eligibility check, one per appointment)

| Stage | Enters when | Leaves when | Owner | SLA |
| --- | --- | --- | --- | --- |
| Not checked | Appointment booked with a coverage | Check runs | System | Batch runs 3 days and 1 day before visit |
| Checking | Request sent | Response or error | System | Seconds (real time) / overnight (batch) |
| Verified active | 271 active, benefits parsed | Visit happens or re-check due | — | Re-check if older than 30 days or coverage edited |
| Needs fix | AAA reject the front desk can fix (ID, name, DOB) | Data fixed and re-check passes | Front desk | Before visit day |
| Provider setup issue | AAA says provider not enrolled | Enrollment done | Biller | 5 business days |
| Inconclusive | No usable electronic answer after retries | Voice agent or staff confirms | Biller | 1 business day before visit |
| Pending review | Voice agent or manual entry captured benefits | Staff accepts or corrects | Biller | Same day |
| Inactive | 271 says coverage inactive | Patient gives new coverage or chooses self-pay | Front desk | Before visit |
| Self-pay | Patient has no coverage or chose self-pay | — | — | — |

### 2. Prior authorization (entity: authorization)

| Stage | Enters when | Leaves when | Owner | SLA |
| --- | --- | --- | --- | --- |
| Required | Booking matches a payer × service auth rule | Request submitted | Biller | 3 business days before visit |
| Submitted | Request sent (portal, fax, later FHIR API) | Payer decision | Biller | Follow up after 3 days (payers must decide standard requests in 7 days for MA, Medicaid, exchange plans) |
| Approved | Auth number recorded | Units used up or expiry | — | Alert 14 days before expiry or at 80% units used |
| Denied | Payer denies | Appeal, reschedule, or patient self-pays | Biller | 2 business days |
| Expired / used up | Date or units exceeded | New auth requested | Biller | Before next visit |

### 3. Charge capture (entity: encounter)

| Stage | Enters when | Leaves when | Owner | SLA |
| --- | --- | --- | --- | --- |
| Visit open | Patient checked in | Provider signs note | Provider | Same day |
| Coding review | Note signed; AI codes suggested | Codes accepted | Provider or coder | 24 hours |
| Ready to bill | Codes accepted, charges priced | Claim created | System | Immediate |
| Billed | Claim created | — | — | — |
| Hold | Missing info (auth, coverage, referring provider) | Info added | Biller | 2 business days |

### 4. Claim (entity: claim)

| Stage | Enters when | Leaves when | Owner | SLA |
| --- | --- | --- | --- | --- |
| Draft | Created from encounter | Scrubber runs | System | Immediate |
| Scrub failed | Scrubber finds errors | Errors fixed | Biller | 1 business day |
| Ready to submit | Scrub passed | Sent in next batch | System | Daily batch, or immediate |
| Submitted | 837 sent | 999 and 277CA received | System | 2 days for acknowledgments |
| Rejected | 999 or 277CA rejection | Corrected and resubmitted | Biller | 2 business days |
| Accepted by payer | 277CA accepted | Payer adjudicates | System | Status check if no ERA after 30 days |
| Pending (payer) | Status says pending or info requested | Decision | Biller | Per payer |
| Paid | 835 paid in full (expected) | Patient balance settled | — | — |
| Partially paid / underpaid | Paid less than expected | Adjusted, appealed or accepted | Biller | 5 business days |
| Denied | 835 denial | Moves to denial pipeline | System | Immediate |
| Closed | Balance zero | — | — | — |

### 5. Denial (entity: denial, one per denied claim or line)

| Stage | Enters when | Leaves when | Owner | SLA |
| --- | --- | --- | --- | --- |
| New | 835 denial posted | Triaged | Biller | 2 business days |
| Correct and resubmit | Fixable error (coding, demographics, missing info) | Corrected claim sent | Biller | 5 business days |
| Appeal drafted | Needs an appeal; AI drafts letter | Biller sends it | Biller | Well before payer deadline |
| Appeal submitted | Appeal sent | Payer decision | Biller | Follow up at 30 days |
| Won | Payer pays on appeal | Claim paid | — | — |
| Lost / write-off | Final denial | Write-off approved or billed to patient | Practice manager | — |

### 6. Patient balance (entity: patient invoice after adjudication)

| Stage | Enters when | Leaves when | Owner | SLA |
| --- | --- | --- | --- | --- |
| Estimate shown | Pre-visit estimate sent | Visit happens | System | — |
| Collected at visit | Copay or deposit taken at check-in | Claim adjudicates | Front desk | — |
| Balance due | Patient responsibility from ERA | Paid | System | Statement sent day 0 |
| Reminder 1 / 2 | 15 / 30 days unpaid | Paid or plan set up | System | WhatsApp/SMS, then voice call |
| Payment plan | Patient agrees to instalments | Plan complete | Front desk | Per plan |
| Overdue | 60+ days unpaid | Paid, plan, or collections decision | Practice manager | Review monthly |
| Paid / written off | Balance zero | — | — | — |

## Flows, step by step

Nine flows cover the whole cycle; each lists who acts, on which screen, and what the system does on its own.

### F1. New patient booking with insurance (front desk, AI receptionist, patient portal)

1. Staff or the AI receptionist books the appointment; the drawer asks "Insurance or self-pay?".
2. Insurance: pick an existing coverage or add one (payer search, member ID, group, subscriber and relationship; card photos optional). Payer search uses the canonical payer list, never free text.
3. On save, the system runs a real-time eligibility check (flow F2) and shows the chip within seconds.
4. If the service needs prior auth for that payer, the drawer warns and creates an authorization record in **Required**.
5. The patient gets a confirmation message; if benefits are known, it includes an estimate ("You'll likely pay about $40 at the visit").
6. AI receptionist variant: the agent collects payer name and member ID by voice, reads back, and the same check runs; on failure it tells the caller staff will follow up and a task is created.

### F2. Eligibility check and the resolver (system)

1. Triggers: booking, coverage edited, batch 3 days and 1 day before visit, manual "Re-run".
2. De-dup: skip if a verified-active check for the same coverage and service is under 30 days old (configurable).
3. Send request through the connectivity interface (mock adapter in prototype).
4. **Active response** → parse into benefits, set chip green, store estimate inputs.
5. **Rejection (AAA)** → the resolver picks the action from its table:
   1. Payer temporarily down → retry at 1, 5, 30 minutes, then try alternate vendor.
   2. Member not found / ID invalid → retry with variants (strip prefix, ID + DOB only, name variants), up to 3 tries.
   3. Name, DOB or gender mismatch → stage **Needs fix**; task to front desk naming the field to confirm.
   4. Provider not enrolled → stage **Provider setup issue**; enrollment task to biller.
   5. Still no answer → **Inconclusive**; queue a voice-agent payer call (flow F3) if enabled, else task to biller.
6. **Inactive** → chip red; task to front desk to get new coverage or switch to self-pay; message patient asking for updated insurance.
7. Response points to another plan (Medicare Advantage, vision carve-out) → auto-run a second check against that plan.

### F3. Voice-agent payer call (fallback, later phase in prototype)

1. Created from an **Inconclusive** check, scheduled in payer business hours.
2. Agent navigates the payer phone tree, gives provider NPI and patient details, asks a fixed benefit script (active? copay, deductible and remaining, coinsurance, OOP, auth needed for the service).
3. Agent records the payer rep's name and call reference number.
4. Results land as **Pending review** with the call recording and transcript linked; nothing is used for estimates until a biller accepts.

### F4. Check-in and collection (front desk, kiosk)

1. Check-in shows the coverage chip and copay; if the last check is stale, re-run automatically.
2. Ask the patient to confirm insurance unchanged; scan card if new.
3. Collect copay or estimated deposit (card, cash, payment link); record a payment against the visit.
4. Inactive or unverified coverage: offer self-pay or reschedule; manager can override with a reason.

### F5. Visit to claim (provider, coder, system)

1. Visit note in AI Scribe; on signing, the Codes panel shows suggested ICD-10 (with pointers) and CPT + modifiers (e.g., RT/LT/50 for eye laterality).
2. Provider accepts, edits or declines each code; encounter moves to **Ready to bill**.
3. System prices each line from the fee schedule and creates a draft claim, pulling billing entity, NPIs, POS, payer and member data from records, not typed.
4. Scrubber runs (flow F6). Pass → **Ready to submit**; fail → **Scrub failed** with a task listing each fix.

### F6. Scrubbing and submission (system, biller)

1. Checks: required fields; diagnosis pointers valid; code and modifier pairs (NCCI) and units (MUE); coverage verified for date of service; auth present if required; within payer timely-filing window; payer-specific rules.
2. Daily batch (or immediate) sends ready claims; claim moves to **Submitted**.
3. 999 rejection (file format) → **Rejected**, alert engineering/biller. 277CA rejection (payer front end) → **Rejected** with the payer's reason in plain words, task to biller.
4. 277CA accepted → **Accepted by payer**.
5. Biller fixes and resubmits from the Rejections worklist; each resubmission is a claim event, not a new claim.

### F7. Remittance and posting (system, biller)

1. ERA (835) arrives; the system matches each claim payment to a claim by claim number.
2. Auto-post: payment, contractual adjustment (CO), patient responsibility (PR: deductible, coinsurance, copay), other adjustments, per line.
3. Paid as expected → **Paid**; patient responsibility creates or updates the patient invoice (flow F9).
4. Underpaid vs expected → **Partially paid**, task to biller. Denied line → denial record (flow F8).
5. Unmatched payments go to the Payment posting worklist for manual matching. Paper EOBs are entered manually in the same screen.

### F8. Denial management (biller, AI)

1. Each denial gets a category from its reason codes (eligibility, auth, coding, duplicate, timely filing, medical necessity, other) and an appeal deadline from payer rules.
2. Denials board groups by category and payer so repeat causes are visible.
3. Fixable → correct and resubmit. Appealable → AI drafts an appeal letter from the claim, note and payer reason; biller edits and sends.
4. Outcome recorded: won (payment posts), lost (write-off with reason, or bill patient where allowed).
5. Monthly: top denial reasons feed new scrubber rules.

### F9. Patient balance and collections (system, front desk)

1. After adjudication, the patient invoice shows charge, insurance paid, adjustments and what the patient owes.
2. Statement sent by WhatsApp/SMS/email with a payment link; card on file charged if the patient agreed.
3. Reminders at 15 and 30 days; then an AI voice reminder (consent required).
4. Patient can request a payment plan; front desk sets instalments.
5. 60+ days: practice manager decides (keep trying, write off, collections).

## Automations

30 automations run RCM; they need 26 new events and 4 new rule actions in the existing rule engine (`ruleEngine.ts`, `useAutomationStore.ts`). Today `claim.*`, `insurance.*` and `task.*` events are catalogued but never emitted, and there is no "create task" or "create claim" action, so those come first.

### Events to emit

| Event | Emitted when |
| --- | --- |
| `coverage.added`, `coverage.updated` | Insurance saved or edited on a client |
| `eligibility.checked` | Any response (with status: active, inactive, rejected, inconclusive) |
| `eligibility.needs_fix`, `eligibility.inconclusive` | Resolver decides staff or voice action |
| `auth.required`, `auth.approved`, `auth.expiring`, `auth.denied` | Authorization changes |
| `encounter.signed`, `encounter.coded` | Note signed; codes accepted |
| `claim.created`, `claim.scrub_failed`, `claim.submitted`, `claim.rejected`, `claim.accepted`, `claim.paid`, `claim.partially_paid`, `claim.denied` | Claim lifecycle |
| `era.received`, `era.unmatched` | Remittance arrives; a payment cannot be matched |
| `denial.deadline_near` | 14 days before appeal deadline |
| `balance.created`, `balance.overdue` | Patient owes; unpaid past threshold |
| `task.created`, `task.overdue` | Work items |

### New rule actions

| Action | Does |
| --- | --- |
| `create_task` | Creates a task linked to a record, with type, queue, priority, assignee rule and due date |
| `run_eligibility` | Runs a check for an appointment or coverage |
| `create_claim_from_encounter` | Builds a draft claim and runs the scrubber |
| `start_call` | Queues an AI voice call (payer benefits or patient balance) |

### Automation catalog

| # | Trigger | Condition | Action | Channel / owner |
| --- | --- | --- | --- | --- |
| A1 | `appointment.booked` | Has coverage | `run_eligibility` (real time) | System |
| A2 | Daily 6 pm | Appointments in 3 days and tomorrow | `run_eligibility` (batch), skip fresh checks | System |
| A3 | `coverage.updated` | Future appointments exist | `run_eligibility` | System |
| A4 | `eligibility.needs_fix` | — | `create_task` "Confirm \[field\] with patient", due before visit | Front desk queue |
| A5 | `eligibility.checked` | Inactive | `create_task` + send patient "Please update your insurance" with a form link | Front desk; WhatsApp/SMS |
| A6 | `eligibility.checked` | Rejected: provider not enrolled | `create_task` "Enroll \[provider\] with \[payer\]" | Biller queue |
| A7 | `eligibility.inconclusive` | Voice fallback enabled | `start_call` payer benefits | Voice agent |
| A8 | `eligibility.inconclusive` | Voice off or call failed | `create_task` "Verify benefits by phone/portal" | Biller queue |
| A9 | `eligibility.checked` | Active, benefits known, 2 days before visit | Send estimate message | WhatsApp/SMS |
| A10 | `appointment.booked` | Payer × service needs auth | Create authorization in Required + `create_task` | Biller queue |
| A11 | `auth.expiring` | 14 days left or 80% units used | `create_task` "Renew auth" | Biller queue |
| A12 | Daily | Visit in 2 days and auth not approved | Notify front desk + biller; flag appointment | In-app |
| A13 | `appointment.checked_in` | Last check older than 1 day | `run_eligibility` | System |
| A14 | `appointment.completed` | — | Create encounter in Visit open; remind provider to sign at end of day | In-app |
| A15 | Daily 7 pm | Encounters unsigned over 24 h | Notify provider | In-app |
| A16 | `encounter.coded` | — | `create_claim_from_encounter` | System |
| A17 | `claim.scrub_failed` | — | `create_task` listing each error | Biller queue |
| A18 | Daily 5 pm | Claims in Ready to submit | Submit batch | System |
| A19 | Daily | Submitted over 2 days with no acknowledgment | Alert biller | In-app |
| A20 | `claim.rejected` | — | `create_task` with payer reason in plain words | Rejections queue |
| A21 | Daily | Accepted, no ERA after 30 days | Run claim status check; if pending or missing → `create_task` | A/R queue |
| A22 | `era.received` | — | Auto-post matched payments | System |
| A23 | `era.unmatched` | — | `create_task` to match manually | Posting queue |
| A24 | `claim.partially_paid` | Paid under expected by more than $5 or 5% | `create_task` "Review underpayment" | Biller queue |
| A25 | `claim.denied` | — | Create denial; categorize; set deadline; assign by category | Denials board |
| A26 | `denial.deadline_near` | Not yet appealed | Escalate priority + notify manager | In-app |
| A27 | `balance.created` | Patient owes > $0 | Send statement with payment link; charge card on file if authorized | WhatsApp/SMS/email |
| A28 | 15 and 30 days unpaid | No plan | Reminder message | WhatsApp/SMS |
| A29 | 45 days unpaid | Voice consent on file | `start_call` balance reminder | Voice agent |
| A30 | `balance.overdue` (60 days) | — | `create_task` for manager decision | Manager queue |

In the prototype, the daily triggers can be a "Run daily jobs now" button in RCM Home so demos don't need a scheduler.

## Fields

16 new entities (plus a new Location list) and additions to 7 existing ones. Required fields are marked **R**; the rest are optional. Every new entity also carries `id`, `orgId`, `createdAt`, `updatedAt`, `createdBy`.

### Additions to existing entities

| Entity (file) | Fields to add | Notes |
| --- | --- | --- |
| Client (`clientsStore.ts`) | **R** legalFirstName, legalLastName, **R** dob, **R** sex (F/M/U), address (line1, line2, city, state, zip), preferredContact, guarantorId, selfPay (bool), consents {sms, voice, cardOnFile} | Today DOB is read as `(cl as any).dob`; make it typed |
| Team member (`teamStore.ts`) | npi, taxonomyCode, licenseNumber, licenseState, specialty, isRenderingProvider, isBillingProvider | No NPI exists today |
| Organization / Settings | billingEntity: **R** legalName, **R** taxId (EIN), **R** groupNpi, taxonomyCode, billingAddress, payToAddress | Replace hard-coded values in `CreateClaimDrawer.tsx` |
| Location (new list in Settings) | name, address, npi (optional), **R** placeOfService (e.g., 11 office) | Today locations are strings |
| Appointment (`appointmentService.ts`) | **R** clientId (always set), coverageId, secondaryCoverageId, authorizationId, encounterId, latestEligibilityCheckId, financialClass (insurance/self-pay) | Fix name-based client link |
| Service (`servicesStore.ts`) | cptCodes \[{code, modifiers, units}\], defaultDiagnosisHints, authRequiredDefault | One service can bill several codes |
| Invoice (`invoiceTypes.ts`) | claimId, insurancePaid, adjustmentsTotal, patientResponsibility, statementCount, lastStatementAt, paymentPlanId | Link patient bill to claim |
| Task (`types/task.ts`) | entityRef {type, id}, taskType, queueId, priority (low/normal/high/urgent), dueAt, slaBreached, payerId, amountAtStake, source (automation/resolver/manual) | Today tasks can't point at a record |

### New entities

**Payer** — **R** name, **R** payerType (commercial, Medicare, Medicaid, MA, vision, workers comp, other), clearinghousePayerIds {vendor: id}, supports {eligibility, claims, status, era}, timelyFilingDays, appealDeadlineDays, phone (provider services), portalUrl, authRules \[{serviceOrCpt, required}\], quirks notes.

**Payer enrollment** — **R** payerId, **R** providerId or billingEntity, transaction (eligibility/claims/ERA), status (not started, submitted, approved, rejected), submittedAt, approvedAt.

**Coverage** — **R** clientId, **R** payerId, **R** memberId, groupNumber, planName, **R** priority (primary/secondary/tertiary), **R** subscriberRelationship (self, spouse, child, other), subscriber {firstName, lastName, dob, sex, memberId}, effectiveFrom, effectiveTo, cardFrontImage, cardBackImage, status (active, inactive, unknown), lastVerifiedAt.

**Eligibility check** — **R** coverageId, appointmentId, **R** trigger (booking, batch, check-in, manual, coverage-edit), **R** source (clearinghouse, voice, manual), **R** status (active, inactive, needs fix, provider issue, inconclusive, pending review), serviceTypeCodes, serviceDate, rejectionCode, rejectionCategory, resolverAction, attemptNumber, parentCheckId, planName, planBegin, planEnd, otherPayers \[{role, name, payerId}\], summary {copay, deductibleRemaining, coinsurance, oopRemaining, network}, rawRef, callSessionId, reviewedBy, reviewedAt.

**Benefit line** — **R** eligibilityCheckId, **R** serviceTypeCode, **R** kind (copay, coinsurance, deductible, out-of-pocket max, limit, not covered, auth required), coverageLevel (individual/family), network (in, out, both, unknown), amount, percent, remaining, period (calendar year, plan year, visit, lifetime), quantity, note, confidence (high/medium/low).

**Authorization** — **R** coverageId, **R** clientId, **R** serviceScope (CPT codes or service), authNumber, status (required, submitted, approved, denied, expired), unitsApproved, unitsUsed, validFrom, validTo, requestedAt, decidedAt, referringProviderId, notes, attachments.

**Encounter** — **R** appointmentId, **R** clientId, **R** renderingProviderId, **R** locationId, scribeSessionId, **R** dateOfService, status (open, coding review, ready, hold, billed), holdReason, signedAt, codedBy.

**Encounter diagnosis** — **R** encounterId, **R** icd10Code, **R** sequence (1–12), source (AI suggested / provider), accepted.

**Encounter procedure (charge)** — **R** encounterId, **R** cptCode, modifiers (up to 4), **R** units, diagnosisPointers (up to 4), fee, source, accepted.

**Claim** (replaces today's `Claim`) — **R** encounterId, **R** coverageId, **R** payerId, **R** claimNumber (our ID sent to payer), frequency (original/corrected/void), payerClaimNumber, **R** billingProviderNpi, renderingProviderNpi, referringProviderNpi, **R** placeOfService, authorizationId, **R** status, totalCharge, expectedAmount, paidAmount, adjustmentAmount, patientResponsibility, submittedAt, acceptedAt, paidAt, timelyFilingDeadline, assigneeId, batchId.

**Claim line** — **R** claimId, **R** lineNumber, **R** cptCode, modifiers, **R** units, **R** charge, diagnosisPointers, serviceDate, paidAmount, allowedAmount, status.

**Claim event** (timeline, append-only) — **R** claimId, **R** type (scrub, submitted, 999, 277CA, status, payment, denial, resubmitted, note), code, message (plain words), rawRef, actor, createdAt.

**Remittance (ERA)** — **R** payerId, **R** traceNumber (check/EFT number), **R** paymentAmount, paymentDate, method (EFT/check), receivedAt, status (auto-posted, partly posted, needs review). Child **remittance claim**: claimId (matched), payerClaimNumber, paid, patientResponsibility, matchConfidence. Child **adjustment**: claimLineId, **R** group (CO, PR, OA, PI), **R** reasonCode (CARC), remarkCodes (RARC), **R** amount.

**Denial** — **R** claimId, claimLineId, **R** reasonCodes, **R** category (eligibility, auth, coding, duplicate, timely filing, medical necessity, other), rootCause, appealDeadline, appealLevel, status (new, correct, appeal drafted, appeal submitted, won, lost), ownerId, amountAtStake, appealLetter, outcome.

**Fee schedule** — **R** name, payerId (blank = default), items \[{cptCode, modifier, amount}\], effectiveFrom.

**Payment plan** — **R** clientId, **R** totalAmount, instalmentAmount, frequency, nextDueDate, cardOnFileToken, status.

### Status lists to standardize

Use one shared enum per status field so pipelines, chips and reports agree: coverage status, eligibility status, authorization status, encounter status, claim status, denial category and status, remittance status, task priority.

## Work queues, roles and permissions

Eight queues hold all RCM work; each is a saved, filtered view of Tasks, so no new task system is needed. Items are sorted by due date, then money at stake.

| Queue | Fed by automations | Default owner | Item opens |
| --- | --- | --- | --- |
| Insurance fixes | A4, A5 | Front desk | Client Insurance tab with the field highlighted |
| Benefits to verify | A8, voice review | Biller | Eligibility check (pending review) |
| Enrollment | A6 | Biller / manager | Payer enrollment record |
| Prior auth | A10, A11, A12 | Biller | Authorization |
| Claim fixes | A17, A20 | Biller | Claim with scrubber or payer errors listed |
| Posting | A23, A24 | Biller | Remittance with suggested matches |
| Denials and A/R | A21, A25, A26 | Biller | Denial or claim timeline |
| Patient balances | A30 | Manager / front desk | Invoice and payment history |

### Roles

Add these to the existing permission model (`types/permissions.ts`) as a new **Billing** module, with these defaults:

| Capability | Front desk | Provider | Coder | Biller | Practice manager | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Add / edit coverage, run eligibility | Yes | View | View | Yes | Yes | Yes |
| Accept voice-agent benefits | No | No | No | Yes | Yes | Yes |
| Accept codes on encounter | No | Own visits | Yes | Yes | No | Yes |
| Create, edit, submit claims | No | No | Edit codes | Yes | View | Yes |
| Post payments, match ERAs | No | No | No | Yes | View | Yes |
| Work denials, send appeals | No | No | Help | Yes | Approve | Yes |
| Write off balances | No | No | No | Up to limit | Yes | Yes |
| Collect payments, set payment plans | Yes | No | No | Yes | Yes | Yes |
| Billing setup (NPIs, tax ID, fee schedules, payers, clearinghouse) | No | No | No | View | Yes | Yes |
| RCM reports | No | Own | No | Yes | Yes | Yes |

Every view of insurance, claim or payment data should create an audit entry once the backend exists; in the prototype, log it to the existing audit store so the pattern is visible.

## Prototype build order and decisions

Build in five front-end slices, each demoable on mock data; slice 1 is the foundation the rest reuse. Estimates are rough front-end engineer-weeks (inference) and assume work starts from the `rcm-2` branch.

| Slice | Builds | Mock data needed | Demo moment | Est. |
| --- | --- | --- | --- | --- |
| 1. Data and setup | Typed stores for every entity in section 7; Billing setup in Settings; payer list; Client Insurance tab; task `entityRef` + queues; new events and rule actions | 15 payers, 3 providers with NPIs, 1 billing entity, 2 locations, 40 patients with coverages | "Billing identity is set once and every claim uses it" | 3–4 |
| 2. Eligibility | Schedule drawer insurance + Verify; appointment chips; detail drawer summary; Eligibility worklist; resolver table; mock adapter scenarios; A1–A9, A13 | Scenario per payer: active, inactive, member-not-found, DOB mismatch, provider not enrolled, payer down, inconclusive | Book → chip turns red → task appears → fix → green | 3–4 |
| 3. Visit to claim | Encounter + Codes panel in AI Scribe; fee schedule; claim builder; scrubber with 10–15 rules; Claims and Rejections worklist; A14–A20 | Ophthalmology codes (92004, 92014, 92083, 76519, 66984 with RT/LT), fee schedule, mock 999/277CA | Sign note → accept codes → claim scrubbed → submitted → one rejected and fixed | 4–5 |
| 4. Money back | ERA posting screen; denials board with categories and AI appeal draft; patient balance, statement message, payment plan; A21–A30 | 10 mock ERAs: paid, partial, denied (CO-97, CO-16, PR-1, CO-50), unmatched | ERA posts → denial appears → appeal drafted → patient gets statement | 4–5 |
| 5. Home and reports | RCM Home with queue counts and KPIs; report sources; prior auth list; voice-agent payer-call and balance-reminder configs (UI only) | Derived from slices 1–4 | Manager's morning view | 2–3 |

**Total: about 16 to 21 front-end engineer-weeks** for the full clickable prototype. Slices 1 and 2 alone (6 to 8 weeks) are enough to validate the core experience with clinics.

### Decisions needed before slice 1

- [ ] **Branches:** build on `rcm-2`, port the eligibility drawer from `rcm`, retire the rest? (recommended)
- [ ] **Insurance model:** keep `rcm-2`'s `ClientInsurance` and extend it to the Coverage fields above (recommended), or `rcm`'s `ClientInsuranceRecord`?
- [ ] **First payer set and specialty** for mock data: ophthalmology + Medicare Part B + 2 vision plans + 5 commercial payers?
- [ ] **Who codes:** provider self-codes with AI suggestions, or a separate coder role?
- [ ] **Voice agent for payer calls:** include as UI-only in slice 5, or defer entirely?
- [ ] **Remove vendor branding** ("Athelas clearinghouse") from mock screens so demos aren't mistaken for live connections.
- [ ] **India:** separate later track (NHCX), not in this prototype?

After the prototype is validated with 2 to 3 clinics, the typed stores in slice 1 become the backend tables, and the mock adapter is swapped for a real clearinghouse adapter with no screen changes.

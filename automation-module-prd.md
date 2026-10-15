# Mantra Assist
## Automation Module
### Product Requirements Document

---

## 1. Overview
The Mantra Assist Automation module automates repetitive healthcare administrative workflows by executing actions when clinical and operational records enter pipeline stages, and by orchestrating multi-entity tasks across appointments, billing, messaging, and client journeys. The module's primary objective is to eliminate manual handoffs while keeping stage movement strictly governed, so clinics can reliably communicate with patients, issue invoices, and advance care pathways without operational errors or infinite loops.

> [!NOTE]
> **Not in this PRD (Out of Scope):**  
> Insurance verification and claims management automations (Phase 5) are deferred to future releases. Call triggering and voice AI scheduling rules are governed by the dedicated *MantraAssist Call Trigger and Scheduling Rule PRD*.

---

## 2. How it works today

* **Stage-scope automations**:
  * Scoped to an individual stage within a process (configured directly inside the stage drawer via the Automations tab).
  * Automatically fires when a record enters that specific stage.
  * Contains only on-entry execution actions (such as sending an SMS, dispatching a WhatsApp message, or sending an email notification).
  * Strictly forbids move-to-stage actions; a stage-scoped automation cannot transition records between stages.
* **Global-scope automations**:
  * Managed centrally on the Global Automation page (`/automation`).
  * Features an expansive catalog of trigger events spanning multiple entities (Client created/updated, Appointment booked/rescheduled/cancelled/completed, Invoice created/paid, and Call events).
  * Supports complex, multi-step sequential and parallel chains (for example: *Appointment Booked &rarr; Generate Invoice &rarr; Move Invoice to Sent &rarr; Send WhatsApp link*).
  * Serves as the single centralized authority permitted to configure "when this action happens, move to this stage" rules.
* **Entity processes**:
  * **Client processes**: Healthcare practices can create, rename, clone, and delete an arbitrary number of client care journeys and intake pipelines (e.g., *Patient Intake*, *Physical Therapy Pathway*, *Post-Op Follow-up*).
  * **System entity processes**: Appointment and Invoice entities each have exactly one locked, system-managed process whose stages map 1:1 to module statuses (e.g., Appointment stages: *Booked*, *Rescheduled*, *Reminder*, *Checked In*, *Completed*, *Cancelled*, *No-show*; Invoice stages: *Draft*, *Sent*, *Viewed*, *Partially Paid*, *Paid*, *Overdue*, *Void*). These stages cannot be created or deleted, only edited.
  * **Strict Entity Isolation**: Module-level actions can only transition stages belonging to their own entity (e.g., an invoice payment can advance an invoice stage, but cannot directly update a client pipeline stage).
  * **Client process pipeline routing**: When a patient reaches the final stage of a client process, handoff transitions into the next process are configured and governed through Global Automation rules.
* **Automation drawer and Flow Builder behavior**:
  * Both Stage Automations and Global Automations share the exact same trigger-first drawer component (`AddAutomationDrawer`).
  * The drawer opens in a structured slide-over panel featuring **Builder** and **Details** views:
    * **Trigger section ("When this happens")**: Clearly specifies the firing event or stage entry.
    * **Actions sequence ("Then do these actions")**: Displays a numbered list of configured action cards with icon, title, parameter badge, and quick-action controls.
    * **"Add next step" menu**: Searchable action picker categorized into Workflow logic, Communication, Caller Engagement, Data, and Webhooks.
    * **"Open in flow builder" link**: Expands the drawer to a 75% screen-width visual canvas (`FlowBuilderTab`) for visual node wiring, parallel branches, and flow inspection without losing context.

---

## 3. Problems to solve

### 3.1 Main problem
**Administrators lack a single, predictable automation framework: stage-level automations and multi-entity global workflows currently blur together, making it easy to create conflicting stage transitions, accidental duplicate messages, and untraceable patient pipeline jumps.**

### 3.2 Cases not handled well today
* **Dispersed transition logic**: When stage transitions are configured across different screens, administrators cannot see what caused a patient or invoice to advance, complicating audits.
* **Cross-entity stage contamination**: When an event from one module attempts to force a stage update on an incompatible entity without strict validation, records fail to update or land in invalid states.
* **Fragile multi-step dependencies**: A multi-step flow that creates an invoice and then immediately references that new invoice in a subsequent step can fail if the newly generated ID is not synchronously passed down the execution chain.
* **Unclear completion routing**: When a client reaches the terminal stage of a care journey, clinic staff must manually verify whether the patient was enrolled in a continuation program or discharged.
* **Inadvertent loop cascading**: If an automated stage change inadvertently fires another rule that moves the record back, the system can trigger continuous execution loops.

---

## 4. Job To Be Done (JTBD)

* **When** a patient books an appointment or enters an intake stage,  
  **I want to** automatically dispatch confirmations and prepare invoices without manual data entry,  
  **So that** clinical staff save hours of daily administrative work and patients receive immediate instructions.

* **When** configuring automated actions for a specific pipeline stage,  
  **I want** a clear, streamlined drawer that guarantees actions only run when patients enter that stage,  
  **So that** I do not inadvertently disrupt other clinical departments or introduce unintended stage jumps.

* **When** building multi-step operational chains that span appointments, billing, and patient messaging,  
  **I want** to manage all stage transition rules in one centralized Global Automation page,  
  **So that** I have full visibility and governance over how records flow across the practice.

* **When** a patient completes all steps of a care plan,  
  **I want** the system to seamlessly transition them to their next follow-up process based on global routing rules,  
  **So that** care continuity is maintained without patients falling through the cracks.

---

## 5. Core rules

### 5.1 When does an automation run

| Scope | Allowed Trigger Type | Firing Condition | Allowed Actions | Disallowed Actions |
| :--- | :--- | :--- | :--- | :--- |
| **Stage Scope** | Stage Movement (`stage.entry`) | Fires immediately when a record enters the parent stage | Notifications (WhatsApp, SMS, Email), field updates, external webhooks | Move-to-stage actions (`update_to_stage`, `processmovement`), cross-entity transitions |
| **Global Scope** | Event Catalog (`client.*`, `appointment.*`, `invoice.*`, `call.*`) | Fires when the specified business or lifecycle event occurs | Multi-step chains, invoice generation, notifications, delays, parallel steps, **Move-to-stage** | Moving stages across mismatched entity types |

### 5.2 How a trigger or action is handled

| If this happens... | The system does... |
| :--- | :--- |
| A patient record is moved into Stage "Intake Complete" | Executes the stage-scoped on-entry automations (e.g., sends welcome WhatsApp and updates intake status). |
| A stage-scope drawer is opened to configure actions | Restricts the trigger to the current stage entry, hides all move-to-stage action types from the catalog, and binds actions directly to the stage. |
| An appointment is marked as "Booked" | Triggers matching Global Automation rules, generates a linked draft invoice, and advances the invoice stage to "Sent". |
| An action attempts to move an entity to a stage of a different entity type | Rejects and blocks the transition with an entity mismatch error; logs the failure and leaves the record in its current stage. |
| A client reaches the final stage of a Client Process | Checks the Global Automation rules for completion routing; if a next process rule is active, enrolls the client into the initial stage of that next process. |
| A parallel branch step is encountered in an automation | Concurrently schedules all branch actions; downstream sequential steps execute only after all parallel branch tasks complete or resolve. |
| A delay step (e.g., "Wait 2 hours") is reached | Pauses execution of downstream steps for the configured duration before resuming the next action in sequence. |

### 5.3 Rules that always hold

1. **Stage Entry Invariance**: Stage-scoped automations run strictly upon stage entry. They never fire on stage exit, hover, or field modification alone.
2. **Move-to-Stage Exclusion in Stage Scope**: Stage automations cannot contain move-to-stage actions. Stage progression logic belongs exclusively to Global Automation.
3. **Strict Entity Boundary**: Module-level actions can only alter stages belonging to their own entity type. Appointment rules move appointment stages; invoice rules move invoice stages; client rules move client stages.
4. **Single Immutable Process for Core Entities**: Appointment and Invoice modules each have exactly one system process. Their stages correspond directly to module statuses and cannot be added or deleted.
5. **Centralized Lifecycle Routing**: Routing a client from one process to another upon pipeline completion is defined and governed strictly through Global Automation rules.
6. **Drawer Consistency**: The same trigger-first drawer component is used for both stage and global configurations, adapting its available controls based on scope.
7. **Canvas Parity**: The 75% width visual Flow Builder canvas reflects the exact same step tree and parameters as the list-based drawer. Changes made in one view reflect immediately in the other.

---

## 6. Requirements

| ID | Requirement | Behaviour |
| :--- | :--- | :--- |
| **FR-1** | Unified Trigger-First Drawer | The system shall present a single slide-over drawer (`AddAutomationDrawer`) with Builder and Details views for creating or editing both stage and global automations. |
| **FR-2** | Stage-Scope Action Filter | When opened from a stage, the drawer shall automatically lock the trigger to the stage's entry and hide all move-to-stage actions (`update_to_stage`, `processmovement`) from the action catalog. |
| **FR-3** | Global Scope Event Catalog | When opened from the Global Automation page, the drawer shall offer a trigger selection dropdown spanning Appointment, Client, Invoice, and Call events. |
| **FR-4** | Global Move-to-Stage Governance | The system shall permit move-to-stage actions exclusively within global-scope automations. |
| **FR-5** | Entity Boundary Enforcement | The rule engine shall validate target processes before executing a stage move. If an action targets an incompatible entity (e.g., an appointment trigger targeting an invoice stage directly without a created invoice), the engine must block the action and log an entity mismatch. |
| **FR-6** | Fixed Entity Process Schema | The system shall enforce exactly one system process for Appointments (`process-appointment-default`) and Invoices (`process-invoice-default`). Users cannot delete these processes or add new stages beyond the defined module statuses. |
| **FR-7** | Dynamic Client Processes | The system shall allow administrators to create, edit, reorder, clone, and delete multiple custom processes for the Client entity. |
| **FR-8** | Last-Stage Next Process Routing | When a client record reaches a stage marked as final, the system shall evaluate Global Automation rules to determine whether to enroll the client into the initial stage of a subsequent process. |
| **FR-9** | Step Parameter Configuration | Clicking the settings button on any action card shall open a dedicated `StepDetailDrawer` to configure action-specific parameters (e.g., WhatsApp template, recipient phone number, invoice due date, or field update values). |
| **FR-10** | Flow Builder Canvas Drawer | Clicking "Open in flow builder" shall expand the drawer to a 75% screen-width visual canvas where users can view and edit node hierarchies, connections, and parallel branches. |
| **FR-11** | Execution Idempotency & Safety | The automation execution engine shall maintain idempotency keys and enforce a maximum chain depth of 10 steps to prevent infinite loop execution. |
| **FR-12** | Sequential Delay Support | The system shall support "Wait / Delay" steps with configurable durations (minutes, hours, days) that hold execution before advancing to downstream actions. |

---

## 7. Worked examples

*Default Setup: Clinic has an active "Patient Intake" client process, a standard "Appointment Flow" process, and a "Billing & Invoicing" process. Global automation rules are enabled.*

| # | Situation | Result |
| :-: | :--- | :--- |
| **1** | A clinic assistant drags patient "Sarah Connor" into the "Consultation Completed" stage in the Patient Care Journey process. | The stage-scope automation on "Consultation Completed" fires immediately on entry: sends a post-consultation WhatsApp summary to Sarah's phone and updates her client profile status to "Post-Care". No stage movement occurs. |
| **2** | A patient books a new consultation online, firing the `appointment.booked` global trigger event. | Global Automation executes the multi-step chain in sequence: (1) Sets appointment stage to "Booked"; (2) Generates a linked draft invoice for $150; (3) Advances the newly created invoice to stage "Sent"; (4) Dispatches a WhatsApp message containing the payment link to the patient. |
| **3** | An administrator configures an invoice rule and attempts to add an action that moves the record to the "Checked In" stage of the Appointment process. | The rule engine rejects the configuration during validation with error: `"Entity mismatch: invoice rule cannot move records to appointment process."` The rule is flagged as failed and prevented from running. |
| **4** | Patient "Michael Scott" reaches the final stage "Discharged" of the "Physical Therapy Intake" process. | The rule engine evaluates global routing rules for the final stage. It detects an active rule: `"When Client Completes Physical Therapy Intake, Move to Post-Therapy Wellness Process"`. Michael is automatically enrolled in Stage 1 ("Initial Check-in") of the "Post-Therapy Wellness" process. |

---

## 8. Decisions made

| Decision | Reason |
| :--- | :--- |
| **Stage automations are strictly on-entry** | Eliminates confusion over timing and prevents double-execution loops between entry and exit triggers. |
| **Disallow move-to-stage actions inside stage scope** | Prevents localized spaghetti routing where individual stages jump across pipelines without central oversight. |
| **Centralize all stage transitions in Global Automation** | Provides practice managers and developers with a single dashboard to audit, debug, and govern all business flow transitions. |
| **Lock Appointment and Invoice processes to 1 per entity** | Appointments and invoices follow strict operational accounting and scheduling lifecycles that correspond 1:1 to system statuses. |
| **Keep Client processes multi-instance and flexible** | Healthcare practices require distinct clinical pathways for different specialties (e.g., dental intake vs. cardiology treatment vs. telehealth). |
| **Reuse the same drawer component for Stage and Global scopes** | Ensures complete UI consistency, reduces maintenance overhead, and flattens the learning curve for staff. |
| **Expand Flow Builder into a 75% width side drawer** | Gives users ample visual canvas space for complex branched trees while keeping the underlying application page accessible. |

---

## 9. Acceptance criteria

| # | Criteria |
| :-: | :--- |
| **AC-1** | **Given** an admin opens the stage automation drawer from any stage, **then** the trigger is pre-selected and locked to that stage's entry, and the action catalog contains no move-to-stage options. |
| **AC-2** | **Given** a patient record is moved into a stage with an active stage automation, **then** the configured actions execute immediately, and the patient remains in that stage. |
| **AC-3** | **Given** an admin creates a global automation triggered by `appointment.booked`, **then** they can chain an action to create an invoice, transition that invoice to "Sent", and dispatch a WhatsApp message. |
| **AC-4** | **Given** an automation action is configured with a target stage belonging to a different entity type, **then** the rule engine blocks execution and logs a validation error indicating an entity mismatch. |
| **AC-5** | **Given** an admin views the Process management page, **then** Appointment and Invoice processes do not show "Add Process", "Delete Process", or "Add Stage" options. |
| **AC-6** | **Given** an admin views Client processes, **then** they can create new processes, add custom stages, and reorder stages freely. |
| **AC-7** | **Given** a client reaches the final stage of a process, **then** the system checks Global Automation for next-process transition rules and moves the client accordingly. |
| **AC-8** | **Given** an admin clicks "Open in flow builder" inside the drawer, **then** a 75% screen-width canvas opens displaying the identical step nodes and execution parameters. |

---

## 10. Open questions

| # | Topic | Code Implementation Today | Confirmed PRD Direction | Resolution Required |
| :-: | :--- | :--- | :--- | :--- |
| **OQ-1** | **Stage Scope Trigger Category Dropdown** | `AddAutomationDrawer.tsx` currently renders a trigger category selector allowing "Stage (Movement)", "Client", or "Appointment" even when in stage scope. | Confirmed: Stage scope has a single trigger (stage movement, entry only). | Should the trigger category dropdown be hidden entirely when `scope === "stage"`, locking the drawer strictly to "On Stage Entry"? |
| **OQ-2** | **Stage Exit Triggers** | `AddAutomationDrawer.tsx` and `StageAutomationsTab.tsx` include support for "On Stage Exit". | Confirmed: Automations are stage-dependent and fire on stage entry. | Should "On Stage Exit" be completely removed from the stage drawer UI and rule engine, or kept as an advanced option? |
| **OQ-3** | **Next Process Configuration Location** | Stage settings currently include a `nextProcessTransitions` array stored directly on the Stage object in `useProcessStore.ts`. | Confirmed: Client-process last-stage "next process" routing lives on the Global Automation page. | Should the `nextProcessTransitions` UI on the Stage drawer be deprecated and migrated to Global Automation rules? |
| **OQ-4** | **Cross-Entity Check-in Exception** | `ruleEngine.ts` (lines 308-312 and 500-564) allows an appointment check-in event to move a client record in "Patient Care Journey". | Confirmed: Module-level actions can only move stages of their own entity. | Should this special cross-move hardcode be removed in favor of an explicit two-step global automation rule? |

---

## 11. Suggestions (Not part of current specification)

*The following ideas are optional enhancements for future development consideration and are not part of the active Phase 1–4 scope:*

* **Execution Dry-Run Simulator**: A "Test Automation" button inside the 75% canvas drawer that simulates step parameter substitution using sample client or appointment data before activating the rule.
* **Visual Audit Trail on Records**: An interactive timeline chip on Client and Invoice profile screens showing which specific automation rule caused their latest stage transition.
* **Template Marketplace**: Pre-packaged global automation templates for standard clinic workflows (e.g., "Missed Appointment Re-engagement", "Post-Treatment 30-Day Checkup").

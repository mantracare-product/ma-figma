# Automation Builder: CRM Action, Messaging & Assignment Nodes

Specification, expected behavior, and acceptance criteria for the CRM Action nodes added under **Action > Create CRM Entities** in the Automation Builder (`Create Contact`, `Duplicate Process`, `Create Task`, alongside removal of legacy `Create Client`), plus updated **Communication** (`Send WhatsApp`, `Send SMS`, `Send Email`) and **Assign Responsible** nodes.

---

## 1. Scope & File References

| Area | Details | Source |
| :--- | :--- | :--- |
| Step Catalog & Allowed Triggers | Registers `create_contact`, `duplicate_process`, and `create_task`; removes `create_client` | [AddAutomationDrawer.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/AddAutomationDrawer.tsx) |
| Visual Flow Canvas | Registers `"create-contact"`, `"duplicate-process"`, and `"create-task"` node types, styles, icons, labels, subtitles, and bidirectional `stepKey` mapping; removes `"create-client"` | [FlowBuilderTab.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/FlowBuilderTab.tsx) |
| Step Drawer Shell | Forwards `sourceProcessId` and `sourceProcessName` context props | [StepDetailDrawer.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/StepDetailDrawer.tsx) |
| Parameter Configuration UI | Renders Contact Type + Required/Optional contact fields (`create_contact`), shared vs. unique field resolution (`duplicate_process`), Task creation (`create_task`), template-only WhatsApp/SMS/Email messaging with connected accounts, multi-select Assign Responsible dropdowns (`Round Robin` / `Random`), and inline icon-only field pickers (`renderInputTrailingIcons`) | [StepParametersFields.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/StepParametersFields.tsx) |
| Messaging Templates Store | Provides shared `getStoredSmsTemplates()` and `getStoredEmailTemplates()` backed by `localStorage` | [messagingTemplatesStore.ts](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/messagingTemplatesStore.ts) |
| Contact Categories Store | Supplies dynamic Contact Type options (`getContactCategories`, `CONTACT_CATEGORIES_EVENT`) | [contactCategoriesStore.ts](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/lib/contactCategoriesStore.ts) |
| Process Field Definitions | Supplies process/stage field metadata (`processIds`, `required`, `requiredStages`) via `useFieldRegistry()` | [FieldRegistryContext.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/context/FieldRegistryContext.tsx) |

---

## 2. Node 1: Create Contact (`create_contact` / `create-contact`)

### 2.1 Catalog & Canvas Metadata
- **Step Key / Node Type:** `create_contact` (catalog) / `create-contact` (Flow Builder canvas)
- **Category:** `Action > Create CRM Entities` (`crm-entities` in Flow Builder; `["all", "crm", "data"]` in catalog)
- **Allowed Triggers:** `["stage", "incall", "inchat", "postcall"]`
- **Canvas Visuals:** Sky theme (`bg-sky-50`, `border-sky-400`, `text-sky-700`), `User` icon
- **Dynamic Node Subtitle:**
  - Configured: `Type: <contactType> (from trigger)`
  - Unconfigured default: `Create contact from trigger`

### 2.2 Configurable Parameters
- **Contact Type (`params.contactType`):**
  - Dropdown populated live from `getContactCategories()` (includes default categories `"Lead"`, `"Client"`, `"Supplier"`, `"Vendor"` plus any admin-added categories, updating on `CONTACT_CATEGORIES_EVENT`).
  - Defaults to `params.contactType || contactCategories[0] || "Lead"`.
- **Contact Parameter Fields (`params.processFields`, scoped from `"client"` Field Registry):**
  - Dynamically pulls Contact (`"client"` module) fields filtered by organization scope (`scopedClientFields`) and selected Contact Type (`!f.contactCategories || f.contactCategories.length === 0 || f.contactCategories.includes(selectedContactType)`), excluding `contact_type` and `processes`.
  - **Required Fields (`Must be filled`):** Renders core contact fields (`name`, `phone`) plus any fields marked `required: true` in Contact Field Settings, each with static input + inline field-picker icon (`<Sliders />` inside the input container calling `assignProcessFieldToken`).
  - **Optional Fields (`N optional` expandable section):** Renders all remaining matching contact fields (`email`, `location`, `country`, `status`, `company`, `role`, `language`, `responsible`, category-specific fields such as `lead_source`, `account_tier`, etc., and custom Contact fields).
  - Unmapped/blank fields automatically fall back to matching values from the trigger payload at runtime.

### 2.3 Expected Runtime Behavior
1. When the automation executes `create_contact`, the runtime reads `params.contactType` (e.g., `"Lead"`, `"Client"`, or a custom category).
2. Explicitly configured values or variable mappings in `params.processFields` (under **Required Fields** / **Optional Fields**) are resolved first for each contact attribute.
3. Any contact fields left unconfigured automatically fall back to matching values from the triggering entity/event payload (call, chat, form, or process trigger).
4. A new CRM Contact record is created with the selected `contactType` and merged contact fields.

### 2.4 Acceptance Criteria — Create Contact
- [ ] **AC-CC-1 (Catalog & Category Placement):** Under **Action > Create CRM Entities** in the Flow Builder palette and **Create CRM Entities / CRM & Data** in the step catalog, **Create Contact** is selectable and **Create Client** is no longer listed.
- [ ] **AC-CC-2 (Contact Type & Field Parameters UI):** Opening the **Create Contact** step drawer displays the **Contact Type** selector followed by the **Required Fields** section and collapsible **Optional Fields** section using the shared card layout (`renderFieldCardsList`) with the inline `<Sliders />` field-picker icon inside each input.
- [ ] **AC-CC-3 (Dynamic Contact Categories & Field Scoping):** Changing **Contact Type** dynamically filters `contactCategories`-scoped Contact fields (e.g., Lead vs. Client vs. Supplier vs. Vendor fields) alongside common fields (`Name`, `Phone`, `Email`, `Location`, `Country`, etc.), and updates when `CONTACT_CATEGORIES_EVENT` fires.
- [ ] **AC-CC-4 (Persistence & Variable Mapping):** Values entered directly or mapped via the inline field-picker icon (`{{field_key}}`) persist in `params.processFields`, **Contact Type** persists in `params.contactType` (updating the canvas subtitle to `Type: <contactType> (from trigger)`), and unmapped fields fall back to trigger data.
- [ ] **AC-CC-5 (Legacy Create Client Removed):** `create_client` / `create-client` no longer appears in the catalog, Flow Builder palette, or parameter renderer.

---

## 3. Node 2: Duplicate Process (`duplicate_process` / `duplicate-process`)

### 3.1 Catalog & Canvas Metadata
- **Step Key / Node Type:** `duplicate_process` (catalog) / `duplicate-process` (Flow Builder canvas)
- **Category:** `Action > Create CRM Entities` (`crm-entities` in Flow Builder; `["all", "crm", "workflow"]` in catalog)
- **Allowed Triggers:** `["stage", "inchat", "postcall"]`
- **Canvas Visuals:** Indigo theme (`bg-indigo-50`, `border-indigo-400`, `text-indigo-700`), `Copy` icon
- **Dynamic Node Subtitle:**
  - Configured with process (+ optional stage): `Duplicate to <processName>` or `Duplicate to <processName> • <stageName>`
  - Unconfigured default: `Duplicate into target process`

### 3.2 Configurable Parameters
1. **Source Process Context (`sourceProcessId` / `params.sourceProcessId`)**:
   - **Process/Stage-scoped automation:** Automatically resolves the trigger/source process from `sourceProcessId` or `sourceProcessName` (`startNode.config.triggerProcessId`, `startNode.config.processId`, `stageRef.processId`, or `currentProcessId`) and shows a read-only **Duplicating From (Trigger Process)** badge card.
   - **Global automation (no locked source process):** Displays an optional **Source Process (from Trigger)** selector defaulting to `Trigger Process (Common / Global Fields)` so admins can either compare against shared global process fields or preview overlap against a specific source process.
2. **Choose Target Process (`params.processId`, `params.processName`)**:
   - Lists client/process-entity workflows (`!entityType || entityType === "client" || entityType === "processes"`).
   - Defaults to a different process than the source process when available.
   - Changing the target process resets `stageId` / `stageName` / `stepDetailStage` to the new target process's first stage.
3. **Choose Target Stage (`params.stageId`, `params.stageName`)**:
   - Lists stages belonging to the selected target process.
4. **Copied Shared Fields Summary**:
   - Computes target process fields (`targetProcFields`) and source process fields (`sourceProcFields`, matching either `processIds` including source `id`/`name` or global fields where `processIds` is empty/`"all"`/`"*"`).
   - Any target field whose `key` is also present in `sourceProcFields` is displayed as a pill inside the **Copied Shared Fields** card with an `<N> auto-copied` count badge.
5. **Unique Target Process Fields (`renderProcessFieldsCardList` with `onlyFieldKeys`)**:
   - Filters target process fields to only keys **not** present in the source process (`!sourceFieldKeys.has(f.key)`).
   - Renders those unique fields using the standard **Required Fields** and collapsible **Optional Fields** cards (supporting static values and the inline field-picker icon opening `SelectFieldsMultiModal`).
   - If all target process fields also exist in the source process (`uniqueProcessFields.length === 0`), displays a message stating that all fields match the source process and will copy automatically.

### 3.3 Expected Runtime Behavior
1. When triggered on a source process record, the automation creates a new record in the selected target **Process** and places it in the selected target **Stage**.
2. Every field whose `key` exists on both the source process and target process automatically has its value copied from the triggering source process record into the new target process record.
3. Any field unique to the target process (not present in the source process) is populated using the value/variable mapping configured in the node's **Required Fields** / **Optional Fields** parameters.
4. Target stage validation considers both auto-copied shared fields and configured unique field values.

### 3.4 Acceptance Criteria — Duplicate Process
- [ ] **AC-DP-1 (Catalog & Category Placement):** **Duplicate Process** appears under **Action > Create CRM Entities** in the Flow Builder sidebar and catalog.
- [ ] **AC-DP-2 (Process & Stage Selection):** User can select any valid target **Process** and a **Stage** within that process; changing the target process automatically updates the stage dropdown to the newly selected process's stages and sets the first stage by default.
- [ ] **AC-DP-3 (Shared Field Detection):** Fields belonging to both the source (trigger) process and the selected target process appear in the **Copied Shared Fields** summary card with an accurate `auto-copied` count, and are **excluded** from manual input cards below.
- [ ] **AC-DP-4 (Unique Field Filtering):** Only fields present in the target process and absent from the source process appear under **Required Fields** and **Optional Fields**, using the shared field card layout (including stage-specific required rules via `requiredStages` and the inline field-picker icon inside each input).
- [ ] **AC-DP-5 (All-Shared Edge Case):** When the selected target process has no unique fields relative to the source process (e.g., identical field sets or duplicating into the same process), no redundant manual field forms are shown and an explanatory notice confirms all fields copy automatically.
- [ ] **AC-DP-6 (Global Trigger Fallback):** When editing a global automation without a locked `sourceProcessId`, the **Source Process (from Trigger)** selector is available and recalculates shared vs. unique fields immediately on change.
- [ ] **AC-DP-7 (Canvas Subtitle):** Selecting a target process and stage updates the Flow Builder node subtitle to `Duplicate to <processName> • <stageName>`.

---

## 4. Node 3: Create Task (`create_task` / `create-task`)

### 4.1 Catalog & Canvas Metadata
- **Step Key / Node Type:** `create_task` (catalog) / `create-task` (Flow Builder canvas)
- **Category:** `Action > Create CRM Entities` (`crm-entities` in Flow Builder; `["all", "crm", "workflow"]` in catalog)
- **Allowed Triggers:** `["stage", "incall", "inchat", "postcall"]`
- **Canvas Visuals:** Unique magenta-violet crystal orb (`CheckSquare` icon)
- **Dynamic Node Subtitle:** Configured `taskTitle`, or default `"Create follow-up task"`.

### 4.2 Configurable Parameters (Matching Task Module `TaskQuickCreateDrawer`)
- **Task Title & Task Description (`params.taskTitle`, `params.taskDescription`):** Grouped in a shared bordered section with inline `<Sliders />` field-picker icons inside both the Task Title input and Task Description textarea containers supporting trigger field tokens (`{{client_name}}`, etc.).
- **Task Responsible (`params.responsibleSource`: `"custom" | "inherit"`, `params.responsibleType`: `"team" | "contact"`):** Dropdown selector (**Assignment Source**) switching between **Custom** and **Inherit from Previous Node**:
  - **Custom:** Assign via **Team Members** (`Role` filter + multi-select `Select Members` + **Assignment Strategy**: `Round Robin` or `Assign All Selected`) or **Contacts** (`Category` filter + multi-select `Select Contacts`, defaulting to triggering Contact).
  - **Inherit from Previous Node:** Automatically inherits the responsible assignee set by a preceding node (such as `Assign Responsible`) or falls back to the trigger record owner.
- **Mark Required Toggle (`params.isRequired`):** Toggle switch synced with the **Mark Required** toggle in [TaskQuickCreateDrawer.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/tasks/TaskQuickCreateDrawer.tsx) (`TaskEntity.isRequired`).
- **Workflow Pipeline (`params.workflowId`, `params.workflowName`):** Bordered selector pulling from Task module pipelines (`entityType === "task"` via `DEFAULT_TASK_PROCESSES`, e.g., Clinical & Operational Tasks, Compliance & Credentialing, Patient Care Follow-up).
- **Schedule:** Relative **Deadline Offset** (`deadlineOffsetValue`, `deadlineOffsetUnit`) plus **Target Time** (`deadlineTime`).
- **Repeat (Recurrence):** Enable toggle, `Every` (`repeatInterval` + `repeatUnit`), `End Recurrence` (`never` / `count` / `date`), and `Skip weekends`.
- **Observers (`params.observerSource`: `"custom" | "inherit"`, `params.observerDistribution`: `"round_robin" | "all"`):** Dropdown selector (**Observer Source**) for `Custom` vs `Inherit from Previous Node`, plus Role filter, multi-select `Select Observer Members` (`selectedObserverMemberIds`), and **Observer Strategy** (`Round Robin` or `Assign All Selected`).
- **Task Studio Deliverables (`params.studioItems`):** Add, reorder (`up` / `down`), and remove checklist deliverable items with title, description, important flag, and full resource types (`None`, `File`, `Image`, `Video`, `URL`, `HTML Block`) supporting Direct Upload (max 1MB) or Online URL plus live preview.

### 4.3 Acceptance Criteria — Create Task
- [ ] **AC-CT-1 (Catalog & Canvas Placement):** **Create Task** appears under **Create CRM Entities** in both Flow Builder sidebar and step catalog.
- [ ] **AC-CT-2 (Task Configuration):** User can set title (including dynamic field tokens), description, link scope, assignee, relative due time, and priority.

---

## 5. Communication Nodes (Template-Only) & Assign Responsible Updates

### 5.1 Communication Nodes (`whatsapp`, `sms`, `email`)
- **Send WhatsApp (`whatsapp` / `send-whatsapp`):**
  - **Connected Account (`params.whatsappConnectedAccount`):** Dropdown of WhatsApp Business numbers from `getStoredWhatsAppNumbers()`.
  - **Template (`params.whatsappTemplate`):** Template-only selector from `getStoredTemplates()` with read-only body preview. **Select Source**, **Campaign**, and **Website Chat Notification Message** are removed.
- **Send SMS (`sms` / `send-sms`):**
  - **Connected Account (`params.smsConnectedAccount`):** Dropdown of SMS-capable phone numbers from `getStoredPhoneNumbers()`.
  - **Template (`params.smsTemplate`):** Template-only selector from `getStoredSmsTemplates()` with read-only body preview. Free-form message and Website Chat Notification Message are removed.
- **Send Email (`email` / `send-email`):**
  - **Connected Account (`params.emailConnectedAccount`):** Dropdown of mailbox accounts from `getStoredMailboxAccounts()`.
  - **Template (`params.emailTemplate`):** Template selector from `getStoredEmailTemplates()` with read-only Subject + Body preview. Manual Template Mode, Subject, and Body editor are removed.

### 5.2 Assign Responsible (`assignhuman` / `assign-responsible`)
- Uses clean searchable **MultiSelectDropdown** pickers (`Departments` + `Roles`, or `Team Members`) instead of card blocks and sequence priority controls.
- **Distribution Method:** Supports **Round Robin** and **Random** only (**Strict Priority** removed).

---

## 6. Inline Field-Picker Pattern Across Automation Step Inputs

- **UI Pattern (`renderInputTrailingIcons` in [StepParametersFields.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/StepParametersFields.tsx)):**
  - The legacy **Select Field** text capsule button is removed from field headers and labels across Automation step parameters.
  - Each mapped text input (`renderFieldCardsList` used by **Create Contact**, **Create Process**, **Duplicate Process**, **Update to Stage**, **Create Appointment**, and **Generate Invoice**; `Value` in **Field Update**; and `Appointment Title` in **Create Appointment**) renders an icon-only `<Sliders />` button (`title="Select Field"`, `aria-label="Select Field"`) inside the right side of the `<div className="relative flex items-center">` input container alongside the clear `<X />` button when populated.
- **Acceptance Criteria:**
  - [ ] **AC-UI-1 (No Select Field Capsules):** No `<span>Select Field</span>` capsule pills appear above or beside Automation parameter inputs in `StepParametersFields.tsx`.
  - [ ] **AC-UI-2 (Inline Input Icons Only):** Clicking the `<Sliders />` icon inside the input opens the Field Registry picker modal and inserts the chosen field token into that input without colliding with text or the clear `<X />` icon.

---

## 7. Verification Status (Static & Build Checks)
- **Inline Capsule Removal Check (`git grep -n "<span>Select Field</span>" src/app/components/process/`):** `0` remaining occurrences.
- **TypeScript (`npx tsc --noEmit`):** `0` errors across `AddAutomationDrawer.tsx`, `FlowBuilderTab.tsx`, `StepDetailDrawer.tsx`, `StepParametersFields.tsx`, and `messagingTemplatesStore.ts` (only 3 unrelated pre-existing errors remain in `NoteTemplateBuilderDrawer.tsx`, `AdminFormTemplates.tsx`, and `AIScribeConsole.tsx`).
- **Vite Production Build (`npx vite build`):** Passed cleanly (`3861` modules transformed, built in `23.11s`, exit code `0`).
- **UI Interactive / Runtime Execution:** Requires manual QA pass in the browser Automation Builder UI (Flow Builder & Step Catalog) and backend workflow execution verification against the acceptance criteria above.

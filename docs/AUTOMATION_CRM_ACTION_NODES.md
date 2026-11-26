# Automation Builder: Create Contact & Duplicate Process Nodes

Specification, expected behavior, and acceptance criteria for the new CRM Action nodes added under **Action > Create CRM Entities** in the Automation Builder (alongside the removal of the legacy **Create Client** node).

---

## 1. Scope & File References

| Area | Details | Source |
| :--- | :--- | :--- |
| Step Catalog & Allowed Triggers | Registers `create_contact` and `duplicate_process`; removes `create_client` | [AddAutomationDrawer.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/AddAutomationDrawer.tsx) |
| Visual Flow Canvas | Registers `"create-contact"` and `"duplicate-process"` node types, styles, icons, labels, subtitles, and bidirectional `stepKey` mapping; removes `"create-client"` | [FlowBuilderTab.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/FlowBuilderTab.tsx) |
| Step Drawer Shell | Forwards `sourceProcessId` and `sourceProcessName` context props | [StepDetailDrawer.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/StepDetailDrawer.tsx) |
| Parameter Configuration UI | Renders the Contact Type selector + Required/Optional contact fields (`create_contact`), shared vs. unique field resolution (`duplicate_process`), and removes the old `create_client` form | [StepParametersFields.tsx](file:///C:/Users/Mantra/.gemini/antigravity/scratch/ma-figma/src/app/components/process/StepParametersFields.tsx) |
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
  - **Required Fields (`Must be filled`):** Renders core contact fields (`name`, `phone`) plus any fields marked `required: true` in Contact Field Settings, each with static input + **Select Field** token picker (`assignProcessFieldToken`).
  - **Optional Fields (`N optional` expandable section):** Renders all remaining matching contact fields (`email`, `location`, `country`, `status`, `company`, `role`, `language`, `responsible`, category-specific fields such as `lead_source`, `account_tier`, etc., and custom Contact fields).
  - Unmapped/blank fields automatically fall back to matching values from the trigger payload at runtime.

### 2.3 Expected Runtime Behavior
1. When the automation executes `create_contact`, the runtime reads `params.contactType` (e.g., `"Lead"`, `"Client"`, or a custom category).
2. Explicitly configured values or variable mappings in `params.processFields` (under **Required Fields** / **Optional Fields**) are resolved first for each contact attribute.
3. Any contact fields left unconfigured automatically fall back to matching values from the triggering entity/event payload (call, chat, form, or process trigger).
4. A new CRM Contact record is created with the selected `contactType` and merged contact fields.

### 2.4 Acceptance Criteria — Create Contact
- [ ] **AC-CC-1 (Catalog & Category Placement):** Under **Action > Create CRM Entities** in the Flow Builder palette and **Create CRM Entities / CRM & Data** in the step catalog, **Create Contact** is selectable and **Create Client** is no longer listed.
- [ ] **AC-CC-2 (Contact Type & Field Parameters UI):** Opening the **Create Contact** step drawer displays the **Contact Type** selector followed by the **Required Fields** section and collapsible **Optional Fields** section using the same card + **Select Field** layout as process nodes.
- [ ] **AC-CC-3 (Dynamic Contact Categories & Field Scoping):** Changing **Contact Type** dynamically filters `contactCategories`-scoped Contact fields (e.g., Lead vs. Client vs. Supplier vs. Vendor fields) alongside common fields (`Name`, `Phone`, `Email`, `Location`, `Country`, etc.), and updates when `CONTACT_CATEGORIES_EVENT` fires.
- [ ] **AC-CC-4 (Persistence & Variable Mapping):** Values entered directly or mapped via **Select Field** (`{{field_key}}`) persist in `params.processFields`, **Contact Type** persists in `params.contactType` (updating the canvas subtitle to `Type: <contactType> (from trigger)`), and unmapped fields fall back to trigger data.
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
   - Renders those unique fields using the standard **Required Fields** and collapsible **Optional Fields** cards (supporting static values, dynamic variable picker, and `Select Field` mapping modal).
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
- [ ] **AC-DP-4 (Unique Field Filtering):** Only fields present in the target process and absent from the source process appear under **Required Fields** and **Optional Fields**, using the existing field card layout (including stage-specific required rules via `requiredStages`, `VariablePickerButton`, and `Select Field` modal).
- [ ] **AC-DP-5 (All-Shared Edge Case):** When the selected target process has no unique fields relative to the source process (e.g., identical field sets or duplicating into the same process), no redundant manual field forms are shown and an explanatory notice confirms all fields copy automatically.
- [ ] **AC-DP-6 (Global Trigger Fallback):** When editing a global automation without a locked `sourceProcessId`, the **Source Process (from Trigger)** selector is available and recalculates shared vs. unique fields immediately on change.
- [ ] **AC-DP-7 (Canvas Subtitle):** Selecting a target process and stage updates the Flow Builder node subtitle to `Duplicate to <processName> • <stageName>`.

---

## 4. Verification Status (Static & Build Checks)
- **TypeScript (`npx tsc --noEmit`):** `0` errors across `AddAutomationDrawer.tsx`, `FlowBuilderTab.tsx`, `StepDetailDrawer.tsx`, and `StepParametersFields.tsx` (verified after `create_client` removal; only 3 unrelated pre-existing errors remain in `NoteTemplateBuilderDrawer.tsx`, `AdminFormTemplates.tsx`, and `AIScribeConsole.tsx`).
- **Vite Production Build (`npx vite build`):** Passed cleanly (`3860 modules transformed`, exit code `0`).
- **UI Interactive / Runtime Execution:** Requires manual QA pass in the browser Automation Builder UI (Flow Builder & Step Catalog) and backend workflow execution verification against the acceptance criteria above.

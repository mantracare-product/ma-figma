# MantraAssist Automation Module — Codebase Audit Report

**Date of Audit:** October 14, 2026  
**Audited Codebase:** `c:\Users\Mantra\.gemini\antigravity\scratch\ma-figma`  
**Scope:** Read-only ground-truth architectural inspection of triggers, conditions, actions, flow builders, rule engines, event buses, and entity services.

---

# PART A: TRIGGERS

## A1. Full List of Every Trigger in the System

| Trigger Key | UI Label | Category | Entity | Available in Stage Scope (Y/N) | Available in Global Scope (Y/N) | Where Event is Emitted in Code (File & Lines) | Data Available to Later Steps (Payload Fields) | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `stage.entry` / `stage.entered` | On Stage Enter / Stage Entered | Stage (Movement) | Stage | Y | Y | `src/lib/useAutomationStore.ts:529`, `src/lib/appointmentService.ts:1122`, `src/lib/invoiceService.ts:980` | `recordType`, `recordId`, `stageId`, `stageName`, `processId`, `processName`, `timestamp`, `cause` | **Built and wired** |
| `stage.exit` / `stage.exited` | On Stage Exit / Stage Exited | Stage (Movement) | Stage | Y | Y | `src/lib/useAutomationStore.ts:542` | `recordType`, `recordId`, `stageId`, `stageName`, `processId`, `processName`, `timestamp` | **Built and wired** |
| `[entity].entered_stage` | Entity Entered Stage | Stage | Client / Appt / Inv | N | Y | `src/lib/useAutomationStore.ts:535` | `recordType`, `recordId`, `stageId`, `stageName`, `processId`, `processName` | **Built and wired** |
| `client.created` | Client created | Client | Client | Y *(via category selector)* | Y | Not emitted in active app code (only in `src/test/trigger_and_document_automation.test.ts:172`) | Defined: `name`, `email`, `phone`, `company`, `location`, `responsible`, `status` | **Defined, not wired** |
| `client.updated` | Client updated | Client | Client | N | Y | `src/app/pages/ClientProfile.tsx:798` | Full updated client record payload (`name`, `email`, `phone`, `location`, `responsible`, `customFields`, etc.) | **Built and wired** |
| `client.product_assigned` | Assign Product | Client | Client | N | Y | `src/app/pages/ClientProfile.tsx:3575`, `src/app/pages/ClientProfile.tsx:3790` | `clientId`, `serviceId`, `serviceName`, `product`, `price`, `assignedAt`, `assignedBy` | **Built and wired** |
| `client.deleted` | Client deleted | Client | Client | N | Y | Not found | None | **Defined, not wired** |
| `client.checked_in` | Patient Checked In | Client | Client | N | N *(catalog removed; emitted in code)* | `src/lib/appointmentService.ts:1043`, `src/app/pages/patient/PatientCheckinScreen.tsx:76, 132`, `src/reception/lib/api/mockMaClient.ts:1368` | `clientId`, `clientName`, `checkinTime`, `method`, `appointmentId` | **Built and wired** *(internal event)* |
| `appointment.booked` | Appointment booked | Appointment | Appointment | Y *(via category selector)* | Y | `src/lib/appointmentService.ts:800` | Full appointment object: `id`, `clientName`, `clientEmail`, `clientPhone`, `employeeId`, `serviceId`, `date`, `time`, `duration`, `status`, `notes`, `title`, `currentStageId`, `processId`, `clientId`, `location`, `sessionType`, `roomNumber`, `invoiceId`, `source` | **Built and wired** |
| `appointment.rescheduled` | Appointment rescheduled | Appointment | Appointment | N | Y | `src/lib/appointmentService.ts:868` | Full appointment object plus `previousDate`, `previousTime`, `previousStart`, `previousEnd` | **Built and wired** |
| `appointment.cancelled` | Appointment cancelled | Appointment | Appointment | N | Y | `src/lib/appointmentService.ts:919` | Full appointment object with `status: "cancelled"`, cancellation notes | **Built and wired** |
| `appointment.completed` | Appointment completed | Appointment | Appointment | N | Y | `src/lib/appointmentService.ts:1017` | Full appointment object with `status: "completed"` | **Built and wired** |
| `appointment.no_show` | No-show | Appointment | Appointment | N | Y | Not found | Defined: appointment object | **Defined, not wired** |
| `appointment.checked_in` | Appointment Checked In | Appointment | Appointment | N | N *(catalog removed; emitted in code)* | `src/lib/appointmentService.ts:1039`, `src/reception/lib/api/mockMaClient.ts:1376` | Full appointment object with checked-in timestamp and station ID | **Built and wired** *(internal event)* |
| `invoice.created` | Invoice created | Invoice | Invoice | N | Y | `src/lib/invoiceService.ts:691` | Full invoice object: `id`, `clientId`, `clientName`, `clientEmail`, `clientPhone`, `appointmentId`, `processId`, `currentStageId`, `status: "draft"`, `lineItems`, `subtotal`, `discountAmount`, `taxAmount`, `total`, `dueDate`, `paymentMode`, `paymentLinkUrl` | **Built and wired** |
| `invoice.sent` | Invoice sent | Invoice | Invoice | N | Y | `src/lib/invoiceService.ts:731` | Full invoice object with `status: "sent"`, sent timestamp | **Built and wired** |
| `invoice.viewed` | Invoice viewed | Invoice | Invoice | N | Y | Not found | Defined: invoice object | **Defined, not wired** |
| `invoice.partially_paid` | Partially paid | Invoice | Invoice | N | Y | `src/lib/invoiceService.ts:844` | Full invoice object with updated balance and `payment` object (`amount`, `mode`, `reference`, `date`) | **Built and wired** |
| `invoice.paid` | Invoice paid | Invoice | Invoice | N | Y | `src/lib/invoiceService.ts:842` | Full invoice object with settled balance and final `payment` record | **Built and wired** |
| `invoice.overdue` | Invoice overdue | Invoice | Invoice | N | Y | `src/lib/invoiceService.ts:902` | Full invoice object with overdue flags | **Built and wired** |
| `invoice.voided` | Invoice voided | Invoice | Invoice | N | Y | `src/lib/invoiceService.ts:931` | Full invoice object with voided status | **Built and wired** |
| `insurance.verified` | Eligibility verified | Insurance | Insurance | N | Y | Not found | Defined: insurance record | **Defined, not wired** |
| `insurance.failed` | Verification failed | Insurance | Insurance | N | Y | Not found | Defined: insurance record | **Defined, not wired** |
| `field.updated` / `client.field_updated` | Field updated | Field Update | Client | N | Y | `src/app/pages/ClientProfile.tsx:796-797` | Full updated record data map with modified keys and values | **Built and wired** |

---

## A2. Trigger Categories as Shown in the Trigger Picker

### 1. In Global Automation Drawer (`src/app/types/automation.ts:89-159` & `src/app/components/process/AddAutomationDrawer.tsx:1124-1131`)
The Global Trigger Category dropdown displays the following 6 categories:
1. **Client** (`type: "client"`)
   * *Client created* (`client.created`)
   * *Client updated* (`client.updated`)
   * *Assign Product* (`client.product_assigned`)
   * *Client deleted* (`client.deleted`)
2. **Appointment** (`type: "appointment"`)
   * *Appointment booked* (`appointment.booked`)
   * *Appointment rescheduled* (`appointment.rescheduled`)
   * *Appointment cancelled* (`appointment.cancelled`)
   * *Appointment completed* (`appointment.completed`)
   * *No-show* (`appointment.no_show`)
3. **Invoice** (`type: "invoice"`)
   * *Invoice created* (`invoice.created`)
   * *Invoice sent* (`invoice.sent`)
   * *Invoice viewed* (`invoice.viewed`)
   * *Partially paid* (`invoice.partially_paid`)
   * *Invoice paid* (`invoice.paid`)
   * *Invoice overdue* (`invoice.overdue`)
   * *Invoice voided* (`invoice.voided`)
4. **Insurance** (`type: "insurance"`)
   * *Eligibility verified* (`insurance.verified`)
   * *Verification failed* (`insurance.failed`)
5. **Stage** (`type: "stage"`)
   * *Stage entered* (`stage.entered`)
   * *Stage exited* (`stage.exited`)
6. **Field Update** (`type: "field_update"`)
   * *Field updated* (`field.updated`)

### 2. In Stage Scope Drawer (`src/app/components/process/AddAutomationDrawer.tsx:1080-1110`)
When opened from a stage, the trigger category dropdown exposes:
1. **Stage (Movement)** (`value="stage"`)
   * *On Stage Enter* (`entry` / `stage.entry`)
   * *On Stage Exit* (`exit` / `stage.exit`)
2. **Client (Profile & Lifecycle)** (`value="client"`)
   * *Client created* (`client.created`)
   * *Client updated* (`client.updated`)
   * *Assign Product* (`client.product_assigned`)
   * *Client deleted* (`client.deleted`)
3. **Appointment (Booking & Status)** (`value="appointment"`)
   * *Appointment booked* (`appointment.booked`)
   * *Appointment rescheduled* (`appointment.rescheduled`)
   * *Appointment cancelled* (`appointment.cancelled`)
   * *Appointment completed* (`appointment.completed`)
   * *No-show* (`appointment.no_show`)

---

## A3. Parameters and Filters Available on Triggers

*(Source: `src/app/components/process/StepParametersFields.tsx:3420-3625`)*

| Trigger Key / Category | Parameter / Filter Name (UI Label) | Type | Required | Options / Source | Default Value | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `stage` (`stage.entered` / `stage.exited`) | **Process Filter** | Dropdown | No | `"all"` (Any Process) + all scoped processes | `"all"` | **Built and wired** |
| `stage` (`stage.entered` / `stage.exited`) | **Stage Filter** | Dropdown | No | `"all"` (Any Stage in this Process) + stages of selected process | `"all"` | **Built and wired** |
| `field_update` (`field.updated`) | **Monitored Fields** | Tag list / Modal picker | No | Selected from `SelectFieldsMultiModal` | `[]` (Empty = triggers on ANY field update) | **Built and wired** |
| `field_update` (`field.updated`) | **Trigger Parameter (Evaluation Logic)** | Dropdown | Yes | `"any"` (Any Field Updated), `"all"` (All Fields Updated) | `"any"` | **Built and wired** |
| `client.product_assigned` | **Target Product / Service** | Dropdown | No | `"all"` (Any Product or Service) + items from `getStoredServices()` | `"all"` | **Built and wired** |
| `invoice` (all invoice triggers) | **Payment Mode Filter** | Dropdown | No | `"all"`, `"Online / Link"`, `"Bank Transfer"`, `"Card on File"`, `"Cash / POS"` | `"all"` | **Built and wired** |
| `trigger_config` (any trigger) | **Trigger Conditions** | Condition list | No | Any field from registry via `renderConditionRulesBuilder` | `[]` | **Built and wired** |
| All other triggers (`client.created`, `client.updated`, `appointment.*`) | None | N/A | N/A | None | None | **No parameters** |

---

## A4. Stage-Scope Trigger Specifications

* **Where Configured:** In `src/app/components/process/AddAutomationDrawer.tsx:1080-1198` and `src/app/components/process/StageAutomationsTab.tsx:98-101`.
* **Available Options in Stage Scope Today:**
  * **On Stage Enter** (`stageTriggerWhen = "entry"` &rarr; event: `stage.entry`)
  * **On Stage Exit** (`stageTriggerWhen = "exit"` &rarr; event: `stage.exit`)
  * **Non-movement event triggers** (Client / Appointment categories are present in the UI dropdown).
* **What is shown in the UI:**
  * Trigger Category dropdown: "Stage (Movement)", "Client (Profile & Lifecycle)", "Appointment (Booking & Status)".
  * Trigger Event dropdown: "On Stage Enter", "On Stage Exit".
  * Scope chip in drawer header: Shows stage color pill with `[Stage Name] · [Process Name]`.
* **What is locked:**
  * When `stageTriggerCategory === "stage"`, the stage is permanently locked to the parent stage (`stageRef.stageId`). The user cannot pick a different stage or process.
  * In `StepParametersFields.tsx:3428, 3452`, `Process Filter` and `Stage Filter` dropdowns are marked `disabled={true}` with `disabled:cursor-not-allowed`.

---

# PART B: CONDITION COMPONENT

## B1. Location of Condition Component in Code and UI

* **Code Location:**
  * Definition and Component UI: `src/app/components/process/StepParametersFields.tsx:762-1001` (function `renderConditionRulesBuilder`).
  * Wire-up inside Step Parameters: `src/app/components/process/StepParametersFields.tsx:3226` (`{stepKey === "condition" && renderConditionRulesBuilder("Condition Rules")}`).
  * Wire-up inside Trigger Config: `src/app/components/process/StepParametersFields.tsx:1006-1010` (`{stepKey === "trigger_config" && renderConditionRulesBuilder("Trigger Conditions")}`).
  * Catalog Entry: `src/app/components/process/AddAutomationDrawer.tsx:136-142` (`key: "condition"`, `name: "Condition Gate"`).
  * Runtime Evaluator: `src/lib/ruleEngine.ts:26-129` (`evaluateCondition`) and `src/lib/ruleEngine.ts:424-436`.
* **UI Location:**
  * Exists in the "Add next step" menu under "Workflow" as **Condition Gate** (icon: `split`).
  * When clicked, opens inside `StepDetailDrawer.tsx` rendering `StepParametersFields.tsx`.
  * Also rendered inside the start trigger configuration drawer as **Trigger Conditions**.

---

## B2. How the Condition Component Works

* **Where it can be added:**
  * **Stage scope:** Yes, can be added into the action list via "Add next step".
  * **Global scope:** Yes, can be added to any position in the action sequence.
  * **Inside flows:** Yes, acts as an inline execution gate between steps.
  * **Inside parallel branches:** Yes, via `appendStepToTree` targeting a branch ID.
* **What the user sees:**
  * A container card titled *"Condition Rules"* (or *"Trigger Conditions"*).
  * A header button: **"+ Select Fields from Registry"**.
  * A list of numbered condition cards (*"Condition #1"*, *"Condition #2"*).
  * Each card contains:
    1. **Primary Field**: Clickable selector showing module chip, field label, and key, with a *"Change Field"* link opening `SelectFieldsMultiModal`.
    2. **Operator**: Dropdown adapting its choices to the selected field's data type.
    3. **Comparison Value Toggle**: Segmented control switching between **Static Value** and **Dynamic Field**.
    4. **Value Input / Picker**: Text input, date picker, or dropdown for static values; dynamic field picker button for secondary field comparisons.
    5. **Remove Button**: Red trash icon removing that specific condition row.
  * Footer buttons: **"Select Fields from Registry"** (dashed button) and **"+ Add Blank"**.

---

## B3. Available Fields for Conditions by Entity

*(Source: `src/app/context/FieldRegistryContext.tsx:1394-1812` & `SYSTEM_SEEDS`)*

| Entity / Module | Field Key | Field Label (UI) | Input Type | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Client** | `name` | Name | `text` | System field | **Built and wired** |
| **Client** | `status` | Status | `select` (`active`, `inactive`, `pending`) | System field | **Built and wired** |
| **Client** | `processes` | Processes | `select` | System field | **Built and wired** |
| **Client** | `email` | Email | `email` | System field | **Built and wired** |
| **Client** | `phone` | Phone | `tel` | System field | **Built and wired** |
| **Client** | `location` | Location | `text` | System field | **Built and wired** |
| **Client** | `company` | Company | `text` | System field | **Built and wired** |
| **Client** | `role` | Role | `text` | System field | **Built and wired** |
| **Client** | `language` | Language | `text` | System field | **Built and wired** |
| **Client** | `country` | Country | `text` | System field | **Built and wired** |
| **Client** | `responsible` | Responsible Person | `select` | System field | **Built and wired** |
| **Appointment** | `appointment_date` | Appointment Date | `date` | System field | **Built and wired** |
| **Appointment** | `appointment_time` | Appointment Time | `text` | System field | **Built and wired** |
| **Appointment** | `appointment_type` | Appointment Type | `select` (`video`, `in-person`) | System field | **Built and wired** |
| **Appointment** | `status` | Status | `select` (`scheduled`, `completed`, `cancelled`, `no-show`, `pending-accept`) | System field | **Built and wired** |
| **Appointment** | `provider` | Provider | `select` | System field | **Built and wired** |
| **Appointment** | `source` | Source | `select` (`MA-Client`, `Inbound Call`, `Walked In`) | System field | **Built and wired** |
| **Invoice** | `client_name` | Client | `crm_bind` | System field | **Built and wired** |
| **Invoice** | `client_email` | Client Email | `email` | System field | **Built and wired** |
| **Invoice** | `client_phone` | Client Phone | `tel` | System field | **Built and wired** |
| **Invoice** | `invoice_number` | Invoice Number | `text` | System field | **Built and wired** |
| **Invoice** | `issue_date` | Issue Date | `date` | System field | **Built and wired** |
| **Invoice** | `due_date` | Due Date | `date` | System field | **Built and wired** |
| **Invoice** | `payment_mode` | Payment Mode | `new_list` (`Bank Transfer`, `Card`, `Cash`, `UPI`, `Stripe`, `PayPal`) | System field | **Built and wired** |
| **Invoice** | `product_name` | Product Name | `crm_bind` | System field | **Built and wired** |
| **Invoice** | `quantity` | Quantity | `number` | System field | **Built and wired** |
| **Invoice** | `unit_price` | Price | `money` | System field | **Built and wired** |
| **Invoice** | `tax_rate` | Tax | `number` | System field | **Built and wired** |
| **Invoice** | `subtotal` | Subtotal | `money` | System field | **Built and wired** |
| **Invoice** | `tax_amount` | Tax Amount | `money` | System field | **Built and wired** |
| **Invoice** | `discount_applied` | Discount Applied | `money` | System field | **Built and wired** |
| **Invoice** | `payment_url` | Payment Link URL | `link` | System field | **Built and wired** |
| **Process** | `process_name` | Process Name | `text` | System field | **Built and wired** |
| **Process** | `stage` | Stage | `text` | System field | **Built and wired** |
| **Process** | `responsible` | Responsible Person | `select` | System field | **Built and wired** |
| **Call** | `status` | Call Status | `text` | System field | **Built and wired** |
| **Call** | `duration` | Duration | `text` | System field | **Built and wired** |
| **Call** | `call_sentiment` | Sentiment | `text` | System field | **Built and wired** |
| **Service** | `name` | Service Name | `text` | System field | **Built and wired** |
| **Service** | `price` | Pricing & Currency | `money` | System field | **Built and wired** |
| **Custom Fields** | Any tenant custom field | Custom Field Label | Any registered type | Custom field | **Built and wired** |

---

## B4. Operators by Field Type

*(Source: `src/app/components/process/StepParametersFields.tsx:224-263` & `src/lib/ruleEngine.ts:90-128`)*

| Field Input Type | UI Operator Label | Evaluator Key (`ruleEngine.ts`) | Evaluation Logic |
| :--- | :--- | :--- | :--- |
| **Number / Money / Rating** | Equal To | `equals` / `equal_to` | `Number(actual) === Number(target)` |
| | Not Equal To | `not_equals` / `not_equal_to` | `Number(actual) !== Number(target)` |
| | Greater Than | `greater_than` / `gt` | `Number(actual) > Number(target)` |
| | Less Than | `less_than` / `lt` | `Number(actual) < Number(target)` |
| | Greater Than or Equal | `greater_than_or_equal` / `gte` | `Number(actual) >= Number(target)` |
| | Less Than or Equal | `less_than_or_equal` / `lte` | `Number(actual) <= Number(target)` |
| | Is Empty | `is_empty` / `empty` | `actual === undefined \|\| actual === null \|\| actual === ""` |
| | Is Not Empty | `is_not_empty` / `not_empty` | `actual !== undefined && actual !== null && actual !== ""` |
| **Date / Date-Time / Time** | Equal To | `equals` / `equal_to` | String equality or timestamp match |
| | Before | `less_than` / `lt` | `Number(new Date(actual)) < Number(new Date(target))` |
| | After | `greater_than` / `gt` | `Number(new Date(actual)) > Number(new Date(target))` |
| | Is Empty | `is_empty` | Missing or blank date |
| | Is Not Empty | `is_not_empty` | Valid non-empty date string |
| **Select / List / Yes-No** | Equal To | `equals` / `is` | Exact value or normalized source match |
| | Not Equal To | `not_equals` / `is_not` | Inequality comparison |
| | Is Empty | `is_empty` | No option selected |
| | Is Not Empty | `is_not_empty` | An option is selected |
| **Text / String / Others** | Equal To | `equals` / `equal_to` | Case-insensitive trimmed string equality |
| | Not Equal To | `not_equals` / `not_equal_to` | Case-insensitive string inequality |
| | Includes / Contains | `contains` / `includes` | Substring inclusion (`toLowerCase().includes()`) |
| | Starts With | `starts_with` | Substring prefix match |
| | Is Empty | `is_empty` | Undefined, null, or empty string |
| | Is Not Empty | `is_not_empty` | Value exists and has non-whitespace characters |

---

## B5. Condition Combinations and Path Execution

* **Combination Logic:**
  * In `ruleEngine.ts:324-340` (trigger conditions) and `ruleEngine.ts:427-435` (condition step nodes):
  * Conditions evaluate using strict **AND** logic:
    ```typescript
    const pass = rules.every((r: any) => evaluateCondition(r, event.data || {}));
    ```
  * **OR logic:** **Not built**. There is no UI or rule engine support for OR groupings.
  * **Groupings / Nesting:** **Not built**. Condition cards are a flat list of rules.
* **True and False Paths:**
  * **True Path:** If all conditions evaluate to `true`, the engine advances to the next sequential action in the flow.
  * **False Path:** **Not built**. There is no alternative "Else" or "False branch" in the condition component. When conditions fail at run time, the engine logs the halt and executes a `break`, immediately terminating the rest of the automation flow.

---

## B6. Runtime Evaluation and Missing Field Handling

*(Source: `src/lib/ruleEngine.ts:26-88`)*

1. **Field Resolution:**
   * Looks up `event.data[fieldKey]`.
   * If not found and the key contains a dot (e.g. `client.status`), it splits the dot and checks the terminal key (`data["status"]`).
   * If still undefined, it performs a case-insensitive search across all top-level keys in `event.data`.
2. **Missing / Empty Fields:**
   * If the field does not exist in `event.data`, `actualValue` is `undefined`.
   * For binary operators (`equals`, `contains`, `greater_than`), `undefined` evaluates to empty string `""` or `NaN`.
   * Number comparisons against missing fields evaluate to `false`.
   * `is_empty` returns `true` if `actualValue === undefined || actualValue === null || String(actualValue).trim() === ""`.
   * `is_not_empty` returns `false` if `actualValue` is missing or blank.
3. **Dynamic Field Comparisons:**
   * If `condition.valueType === "dynamic"`, the engine resolves `condition.dynamicField` from `event.data` at runtime and assigns it as `targetValue` before evaluating the operator.
4. **Source Normalization:**
   * Fields with `"source"` in their key normalize values automatically: strings like `"walk"`, `"reception"` normalize to `"walked in"`; `"ma client"`, `"patient portal"` normalize to `"ma-client"`; `"inbound"`, `"call"` normalize to `"inbound call"`.

---

## B7. Stored Condition Data Shape

```json
{
  "id": "cond-1772984102931-a8f2",
  "field": "service",
  "fieldLabel": "Service Name",
  "fieldSource": "appointment",
  "operator": "Equal To",
  "valueType": "static",
  "value": "Initial Consultation"
}
```

*Dynamic Comparison Example (comparing two fields dynamically):*
```json
{
  "id": "cond-1772984105822-b9e1",
  "field": "due_amount",
  "fieldLabel": "Due Amount",
  "fieldSource": "invoice",
  "operator": "Greater Than",
  "valueType": "dynamic",
  "dynamicField": "amountPaid",
  "dynamicFieldLabel": "Amount Paid",
  "dynamicFieldSource": "invoice"
}
```

---

# PART C: ACTIONS

## C1. Full List of Every Action in the "Add next step" Picker

*(Source: `src/app/components/process/AddAutomationDrawer.tsx:125-277` & `WORKFLOW_CATALOG_STEPS`)*

| Action Key | UI Label | Category in Picker | Entity it Works On | Available in Stage Scope (Y/N) | Available in Global Scope (Y/N) | What it Does at Run Time (`ruleEngine.ts`) | Output it Gives to Later Steps | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| `wait` | Wait / Delay | Workflow | Flow logic | Y | Y | Pauses execution for duration before proceeding | None | **Built and wired** |
| `condition` | Condition Gate | Workflow | Flow logic | Y | Y | Halts remaining flow (`break`) if conditions fail; continues if true | None | **Built and wired** |
| `parallel` | Parallel Branches | Workflow | Flow logic | Y | Y | Flattens branches; runs child steps | None | **Built and wired** |
| `update_to_stage` | Update to stage | Workflow | Client, Appt, Invoice | N *(hidden)* | Y | Calls entity service to move record to selected process stage | Updated record stage | **Built and wired** |
| `endworkflow` | End Workflow | Workflow | Flow logic | Y | Y | Terminal node marker | None | **UI only** |
| `generate_invoice` | Generate Invoice | Records | Appointment, Client | Y | Y | Calls `invoiceService.createInvoiceFromAppointment`; creates draft invoice | `invoice.id`, binds `invoiceId` to `event.data` | **Built and wired** |
| `generate_document` | Generate Document | Records | Client, Appt, Invoice | Y | Y | Merges template fields via `docxProcessor`/`pdfGenerator` and saves to `clientDocumentsStore` | Created document ID | **Built and wired** |
| `send_payment` | Send Payment | Records / Communication | Client, Invoice | Y | Y | Appends activity log; dispatches payment link via selected channel | None | **Built and wired** |
| `whatsapp` | WhatsApp | Communication | Client | Y | Y | Resolves template variables, logs activity, dispatches WhatsApp payload | None | **Built and wired** |
| `sms` | SMS | Communication | Client | Y | Y | Resolves placeholders, appends SMS activity log | None | **Built and wired** |
| `email` | Email | Communication | Client | Y | Y | Resolves placeholders, appends email activity log | None | **Built and wired** |
| `send-invoice` | Send Invoice | Communication | Invoice | Y | Y | Transitions invoice to `"Sent"`, generates payment link, logs activity | Dispatched invoice link | **Built and wired** |
| `callaction` | Transfer Call | Caller Engagement | Telephony | Y | Y | Sets active call transfer target to human or queue agent | Transferred status | **Built and wired** |
| `idlemessages` | Idle Messages | Caller Engagement | Telephony | Y | Y | Configures idle prompt seconds and speech message | None | **Built and wired** |
| `callhangup` | Auto Hangup | Caller Engagement | Telephony | Y | Y | Configures call hangup message and duration | None | **Built and wired** |
| `fieldupdate` | Field Update | Data | Client | Y | Y | Modifies specified field in `event.data`, updates client record in storage, logs activity | Modified field values in `event.data` | **Built and wired** |
| `assignhuman` | Assign to a Human | Data | Client, Process | Y | Y | Assigns team member ID to client/record responsible field | Updated `responsible` | **Built and wired** |
| `wh_trigger` | API Automation | Webhook | Integration | Y | Y | Dispatches HTTP REST request with JSON payload | None | **Built and wired** |
| `webhook_trigger` | Webhook Automation | Webhook | Integration | Y | Y | Posts event payload to configured external webhook receiver | None | **Built and wired** |

---

## C2. Action Parameters Table

*(Source: `src/app/components/process/StepParametersFields.tsx`)*

| Action Key | Parameter Name (UI Label) | Type | Required | Default | Options Source | Supports Dynamic Placeholders / Variables | Validation Message Shown |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| `wait` | Duration | Number | Yes | `5` | Min: 1 | No | None |
| `wait` | Unit | Dropdown | Yes | `"minutes"` | `seconds`, `minutes`, `hours`, `days` | No | None |
| `condition` | Condition Rules | Builder | Yes | `[]` | Field registry | Yes (via Dynamic Field comparison) | None |
| `parallel` | Number of Branches | Number | Yes | `2` | Range: 2 to 6 | No | None |
| `update_to_stage` | Choose Entity | Dropdown | Yes | `"processes"` | `processes`, `appointment`, `invoice` | No | None |
| `update_to_stage` | Choose Process | Dropdown | Yes | `""` | Filtered from `effectiveProcesses` by entity | No | None |
| `update_to_stage` | Choose Stage | Dropdown | Yes | `""` | Stages belonging to selected process | No | None |
| `update_to_stage` | End current process before moving | Toggle | No | `false` | Boolean switch | No | None |
| `generate_invoice` | Bill for | Dropdown | Yes | `"appointment"` | `appointment`, `client`, `choose` | No | None |
| `generate_invoice` | Service Item (when choose) | Picker | Yes | Service 0 | `getStoredServices()` | No | None |
| `generate_invoice` | Quantity | Number | Yes | `1` | Min: 1 | No | None |
| `generate_invoice` | Discount | Number & Unit | No | `0` (`%` or `$`) | Manual number | No | None |
| `generate_invoice` | Due in | Number | Yes | `14` | Days (0-365) | No | None |
| `generate_invoice` | Payment mode | Dropdown | Yes | `"Bank Transfer"` | `Bank Transfer`, `Card`, `Cash`, `Insurance-EMI` | No | None |
| `generate_document` | Select Entity * | Selector dice | Yes | `"client"` | `client`, `process`, `appointment`, `invoice` | No | None |
| `generate_document` | Select Template | Dropdown | Yes | Template 0 | `getStoredDocumentTemplates()` filtered by entity and scope | No | None |
| `generate_document` | Document Title / File Name | Text | Yes | `"{client_name} - Document"` | Manual text | Yes (`VariablePickerButton`) | None |
| `generate_document` | Output Format | Dropdown | Yes | `"pdf"` | `pdf` (PDF Document), `doc` (Word Document) | No | None |
| `send_payment` | Delivery Channel | Dropdown | Yes | `"whatsapp"` | `whatsapp`, `sms`, `email` | No | None |
| `whatsapp` | Template | Dropdown | Yes | `""` | `useWhatsappTemplates()` | Yes (`{client_name}`, `{appointment_date}`, etc.) | None |
| `sms` | Message | Textarea | Yes | `""` | Manual text | Yes (`VariablePickerButton`) | None |
| `email` | Subject | Text | Yes | `""` | Manual text | Yes (`VariablePickerButton`) | None |
| `email` | Body | Textarea | Yes | `""` | Manual rich text or HTML | Yes (`VariablePickerButton`) | None |
| `send-invoice` | Delivery Channel | Dropdown | Yes | `"whatsapp"` | `whatsapp`, `email`, `sms` | No | None |
| `send-invoice` | Attach downloadable PDF | Checkbox | No | `true` | Boolean checkbox | No | None |
| `callaction` | Transfer Type | Radio | Yes | `"human"` | `human`, `agent` | No | None |
| `callaction` | Country Code | Dropdown | Yes | `"+1"` | `+1`, `+44`, `+91`, `+61`, `+49` | No | None |
| `callaction` | Phone Number | Tel | Yes | `""` | Manual phone input | No | None |
| `callaction` | Select AI Agent | Radio list | Yes | `""` | Seeded telephony agents list | No | None |
| `idlemessages` | Idle Message | Textarea | Yes | `""` | Manual text | No | None |
| `idlemessages` | Idle Delay (sec) | Number | Yes | `30` | Seconds (min 1) | No | None |
| `callhangup` | Hangup Message | Textarea | No | `""` | Manual text | No | None |
| `fieldupdate` | Field to Edit | Field Picker | Yes | `""` | `SelectFieldsMultiModal` | No | None |
| `fieldupdate` | Value Source | Segmented | Yes | `"static"` | `static`, `variable` | Yes (when variable source) | None |
| `fieldupdate` | Update Value | Input / Picker | Yes | `""` | Dynamic per field input type | Yes | None |
| `assignhuman` | Assign To | Dropdown | Yes | `""` | Team members from `teamStore` | No | None |
| `wh_trigger` | API Integration | Dropdown | Yes | `""` | `customApiIntegrations` from storage | Yes (in payload values) | None |
| `webhook_trigger` | Webhook Integration | Dropdown | Yes | `""` | `customWebhookIntegrations` from storage | Yes (in payload values) | None |

---

## C3. Actions Blocked in Stage Scope and Blocking Mechanism

* **Blocked Action:**
  * `update_to_stage` ("Update to stage") is blocked in stage scope.
* **How the Code Blocks It:**
  1. **Hidden from Picker (`AddAutomationDrawer.tsx:614-617`):**
     ```typescript
     if (effectiveScope === "stage" && s.isMoveToStage) {
       return false;
     }
     ```
     `isMoveToStage` is flagged on `update_to_stage`. In stage scope, the drawer filters it out from `availableCatalogSteps`, so the user cannot see or select it in the step catalog popover.
  2. **Not Blocked in Canvas View:**
     In `FlowBuilderTab.tsx:215`, `update-stage` is defined in `NODE_CATEGORIES["logic"]`. `NODE_CATEGORIES` does not inspect `scope === "stage"`, so the node is visible in the canvas library even in stage scope.
  3. **No runtime rejection:** If an `update_to_stage` step exists in a stage-scoped rule, `ruleEngine.ts` does not explicitly reject it based on `scope === "stage"`; it attempts to execute it.

---

## C4. Move-to-Stage Action: Selection and Entity Boundaries

*(Source: `src/app/components/process/StepParametersFields.tsx:2192-2420`, `src/lib/useAutomationStore.ts:283-336`, and `src/lib/ruleEngine.ts:307-320`)*

### 1. How Target Process and Target Stage are Chosen
* User selects **Choose Entity**: Dropdown offering `"processes"` (Client processes), `"appointment"`, or `"invoice"`.
* User selects **Choose Process**: Populated dynamically:
  * For `"processes"`: Lists all custom client processes from `effectiveProcesses`.
  * For `"appointment"`: Lists the single Appointment process (`"Appointment Flow"`).
  * For `"invoice"`: Lists the single Invoice process (`"Billing & Invoicing"`).
* User selects **Choose Stage**: Populated with the exact stages belonging to the chosen process.

### 2. Entity Boundary Enforcement
* **Enforced at Configuration / Save Time (`useAutomationStore.ts:283-336`):**
  When a rule is created or updated via `createRule` or `updateRule`, it executes `validateRuleEntityTarget(rule)`:
  ```typescript
  if (effectiveEntity && targetEntityType !== effectiveEntity && !isCheckinCrossMove) {
    return {
      valid: false,
      error: `Entity mismatch: ${effectiveEntity} rule cannot move records to ${targetEntityType} process.`,
    };
  }
  ```
  If `stageId` does not belong to the target process stages, it returns:
  `"Target stage \"[stageId]\" not found in process \"[processName]\"."`
* **Enforced at Run Time (`ruleEngine.ts:307-320`):**
  When an event fires, the engine calls `validateRuleEntityTarget(rule, processes)`. If validation fails:
  * Rule health is marked `"failed"` (`rule.health = "failed"`).
  * Failure message is written (`rule.healthMessage = validation.error`).
  * Stored rules are updated in storage (`saveStoredRules(allRules)`).
  * Execution of that rule is skipped (`skippedReason: "Validation failed: Entity mismatch..."`).

---

## C5. Action Failure Handling and Visibility

*(Source: `src/lib/ruleEngine.ts:306-656`)*

* **What Happens When an Action Fails:**
  * **Retry:** **Not built**. There is no automatic retry mechanism for failed actions.
  * **Skip:** In step loops, if a specific entity update fails (e.g. appointment stage move throws an error), the code catches the exception with `console.warn` and proceeds to the next step.
  * **Stop the Flow:** If a **Condition step** evaluates to false (`!pass`), the engine logs:
    `[RuleEngine] Condition step "[name]" evaluated to false. Halting flow for rule "[ruleName]".`
    and issues a `break`, halting all downstream actions for that rule.
  * **Log:** All transitions and executions are logged to `logStageMove` and `appendActivity`.
* **Where Failures are Visible:**
  * **Browser Console:** Errors are output via `console.error` and `console.warn`.
  * **Automation Rule Store:** In `localStorage` under `mantra_global_automation_rules_v1`, `rule.health` is set to `"failed"` and `rule.healthMessage` contains the exact failure string.
  * **UI Visibility:** **Defined, not wired in table view**. While `AutomationRule` has `health` and `healthMessage` fields, `Automation.tsx` table columns do not render the health badge; only the Active/Paused status button and Last Run timestamp are displayed in the UI table.

---

# PART D: FLOW DESIGN

## D1. Step / Node Types Supported by Flow Builder

*(Source: `src/app/components/process/FlowBuilderTab.tsx:150-268` & `NODE_CATEGORIES`)*

| Node Type | UI Label | Category | How User Adds It | Parameters Configured | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `start` | Trigger | Start | Pre-seeded on canvas | Selected event, process filter, stage filter, monitored fields, conditions | **Built and wired** |
| `condition` | Condition | Logic & Routing | Drag from library or click "+" | Condition rules list (Primary field, operator, static/dynamic value) | **Built and wired** |
| `wait` | Wait / Delay | Logic & Routing | Drag from library or click "+" | Duration (number), Unit (`seconds`, `minutes`, `hours`, `days`) | **Built and wired** |
| `parallel` | Parallel Branches | Logic & Routing | Drag from library or click "+" | Branch count (2-6), branch step sequences | **Built and wired** |
| `update-stage` | Update to stage | Logic & Routing | Drag from library or click "+" | Target Entity, Target Process, Target Stage, End current process toggle | **Built and wired** |
| `end` | End Workflow | Logic & Routing | Drag from library or click "+" | None (visual end marker) | **UI only** |
| `generate-invoice` | Generate Invoice | Records & Billing | Drag from library or click "+" | Bill for, service items, quantity, discount, due days, payment mode | **Built and wired** |
| `generate-document` | Generate Document | Records & Billing | Drag from library or click "+" | Target Entity, Template ID, Document Title, Output format (`pdf`/`doc`) | **Built and wired** |
| `send-payment` | Send Payment | Records & Billing | Drag from library or click "+" | Delivery channel (`whatsapp`, `sms`, `email`) | **Built and wired** |
| `send-invoice` | Send Invoice | Records & Billing | Drag from library or click "+" | Delivery channel, Attach PDF statement checkbox | **Built and wired** |
| `send-whatsapp` | Send WhatsApp | Communication | Drag from library or click "+" | WhatsApp template selection, campaign ID, chat notification text | **Built and wired** |
| `send-sms` | Send SMS | Communication | Drag from library or click "+" | SMS text body with variable placeholders | **Built and wired** |
| `send-email` | Send Email | Communication | Drag from library or click "+" | Subject, rich body / HTML body with variable placeholders | **Built and wired** |
| `field-update` | Field Update | Data & Assignment | Drag from library or click "+" | Field update blocks (field key, value source, update value) | **Built and wired** |
| `assign-responsible`| Assign Responsible | Data & Assignment | Drag from library or click "+" | Team member selector dropdown | **Built and wired** |
| `call-transfer` | Transfer Call | Caller Engagement | Drag from library or click "+" | Transfer type (human/agent), phone number, AI agent | **Built and wired** |
| `call-hangup` | Call Hangup | Caller Engagement | Drag from library or click "+" | Hangup message text | **Built and wired** |
| `idle-messages` | Idle Messages | Caller Engagement | Drag from library or click "+" | Idle message text, idle delay seconds, hangup message, hangup delay | **Built and wired** |
| `webhook` | Webhook | Integrations | Drag from library or click "+" | Integration selector, payload fields mapping | **Built and wired** |
| `api` | API | Integrations | Drag from library or click "+" | API integration selector, action type, field parameters | **Built and wired** |

---

## D2. Parallel Branch Component in Detail

*(Source: `src/lib/automationTree.ts:1-80` & `src/lib/ruleEngine.ts:140-155`)*

* **How Added & Branch Count:**
  * Added from "Add next step" &rarr; "Parallel Branches" or dragged from Flow Builder library.
  * Default branch count is **2** (`createParallelStep()`). Minimum is 2, maximum allowed in parameter input is **6** (`Math.min(6, Math.max(2, ...))`).
* **What Can Sit Inside a Branch:**
  * Any action (WhatsApp, SMS, Invoice, Field Update, Document).
  * Wait / Delay steps.
  * Condition steps.
  * Nested parallel branch nodes (supported recursively via `ensureValidBranches`).
* **Start and Join Behavior:**
  * **Start:** All branches fork simultaneously from the parallel node.
  * **Join:** **No asynchronous barrier join in code**. In `ruleEngine.ts:140-155`, the engine calls `flattenRuleSteps`:
    ```typescript
    export function flattenRuleSteps(steps: any[]): any[] {
      const flattened: any[] = [];
      for (const step of steps) {
        flattened.push(step);
        if (Array.isArray(step.branches)) {
          for (const branch of step.branches) {
            flattened.push(...flattenRuleSteps(branch.steps));
          }
        }
      }
      return flattened;
    }
    ```
    At runtime, branches are flattened into a single sequential list and executed branch 1 steps, then branch 2 steps, then downstream steps.
* **Failure in a Branch:**
  * If an action in Branch 1 errors, it catches and continues to the next action in Branch 1, then executes Branch 2.
  * If a Condition step inside Branch 1 evaluates to `false`, it issues a `break`, which breaks out of the execution loop and halts all subsequent branches and downstream steps.
* **Parameters of Parallel Node:**
  * `branchCount`: Number of concurrent paths (default: 2, min: 2, max: 6).
* **Canvas vs. List View Support:**
  * **Canvas:** **Fully supported**. Renders side-by-side branched visual lanes with independent add-buttons.
  * **List View:** **Not supported for editing**. Hides all branched steps from the card sequence. Displays a purple warning banner: *"Parallel branches active — Branched workflows are visual — open Flow Builder canvas to view and edit them."*

---

## D3. Delay / Wait Step

*(Source: `src/app/components/process/StepParametersFields.tsx:3228-3258` & `src/lib/ruleEngine.ts`)*

* **Allowed Units:** `seconds`, `minutes`, `hours`, `days` (dropdown).
* **Min and Max:** Minimum is `1` (`min={1}`). Maximum is not capped in UI input (typically up to 365 days).
* **Storage Format:** Stored under `step.delayValue` (number) and `step.delayUnit` (string), or `step.params.duration` and `step.params.unit`.
* **Resume Behavior at Run Time:** In current frontend mock architecture, delays are simulated synchronously or scheduled in background timers via `setTimeout` in tests; persistent worker resume queue is **Defined, not wired** (no backend server cron queue in client-side bundle).

---

## D4. Step Ordering, Connection, and Numbering

*(Source: `src/lib/automationTree.ts:163-233`)*

* **Step Numbering:** Numbered linearly `1, 2, 3...` in the list view using array index (`idx + 1`).
* **How "Add next step" decides placement:**
  1. If `targetBranchId` is set, inserts into that branch's `steps` array.
  2. If `afterStepId` is specified, finds `afterStepId` in the tree (whether in root sequence or nested in a branch) and inserts at `index + 1`.
  3. If no target or predecessor is set, appends to the end of the root `steps` array.
* **Connection / Predecessor Link:** `connectAfterId` stores the ID of the step that immediately precedes it.

---

## D5. Canvas and List Parity Matrix

| Operation | List View (Drawer) | Canvas View (FlowBuilderTab) | Notes |
| :--- | :---: | :---: | :--- |
| **Add Sequential Action** | Yes | Yes | Parity confirmed |
| **Delete Action** | Yes | Yes | Parity confirmed |
| **Configure Action Parameters** | Yes | Yes | Opens same `StepParametersFields` |
| **Add Parallel Branches** | Adds default 2-branch node | Yes (drag or click) | Parity confirmed |
| **View Steps Inside Parallel Branches** | **No** (hidden) | **Yes** (visual lanes) | **Parity gap** |
| **Add Step Inside a Specific Branch** | **No** | **Yes** (per-branch "+" button) | **Parity gap** |
| **Freeform Drag & Drop Node Layout** | **No** | **Yes** (Bezier curve canvas) | Canvas only |
| **Configure Trigger Parameters** | Limited (dropdowns only) | Full visual trigger config node | **Parity gap** |
| **Synthetic Connectors / Visual Wire** | **No** | **Yes** | Canvas only |

---

## D6. Stored Data Shape of a Complete Automation

*(Exact JSON representation of an automation with trigger, sequential step, condition, and parallel branch)*

```json
{
  "id": "rule-appt-journey-101",
  "orgId": "org-default-1",
  "name": "Consultation Booking Orchestration",
  "description": "Generates invoice, checks insurance coverage, and sends confirmation",
  "scope": "global",
  "enabled": true,
  "status": "active",
  "entityType": "appointment",
  "trigger": {
    "event": "appointment.booked",
    "label": "Appointment booked",
    "params": {
      "triggerConditions": []
    }
  },
  "actions": [
    {
      "id": "step-inv-1",
      "stepKey": "generate_invoice",
      "name": "Generate Invoice",
      "description": "Generate draft invoice for appointment",
      "iconKey": "filetext",
      "executionType": "wait",
      "delayValue": 0,
      "delayUnit": "minutes",
      "params": {
        "billFor": "appointment",
        "dueDays": 14,
        "paymentMode": "Bank Transfer"
      }
    },
    {
      "id": "step-cond-2",
      "stepKey": "condition",
      "name": "Condition Gate",
      "description": "Gate execution based on service price",
      "iconKey": "split",
      "executionType": "wait",
      "params": {
        "conditions": [
          {
            "id": "c-1",
            "field": "service",
            "fieldLabel": "Service Name",
            "fieldSource": "appointment",
            "operator": "Not Equal To",
            "valueType": "static",
            "value": "Free Consultation"
          }
        ]
      }
    },
    {
      "id": "step-par-3",
      "stepKey": "parallel",
      "name": "Parallel Branches",
      "description": "Run multiple branches concurrently",
      "iconKey": "layers",
      "kind": "parallel",
      "branches": [
        {
          "id": "step-par-3-b1",
          "name": "Branch 1",
          "steps": [
            {
              "id": "step-wa-1",
              "stepKey": "whatsapp",
              "name": "WhatsApp",
              "description": "Send pre-configured WhatsApp template message",
              "iconKey": "messagecircle",
              "params": {
                "whatsappTemplate": "appointment_confirmation_v1"
              }
            }
          ]
        },
        {
          "id": "step-par-3-b2",
          "name": "Branch 2",
          "steps": [
            {
              "id": "step-sms-2",
              "stepKey": "sms",
              "name": "SMS",
              "description": "Send SMS text notification",
              "iconKey": "messagesquare",
              "params": {
                "smsMessage": "Hello {client_name}, your appointment is confirmed for {appointment_date}."
              }
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "2026-10-14T08:00:00.000Z",
  "updatedAt": "2026-10-14T08:30:00.000Z"
}
```

---

## D7. Safety Limits

*(Source: `src/lib/ruleEngine.ts:20-22, 282-305` and `src/lib/useAutomationStore.ts:341-356`)*

| Safety Mechanism | Implemented Value | File & Line | Enforcement Behaviour |
| :--- | :---: | :--- | :--- |
| **Maximum Chain Depth** | `10` | `src/lib/ruleEngine.ts:20` | `if (depth >= MAX_CHAIN_DEPTH)` aborts cascade and logs: `Max execution chain depth (10) reached for record... Aborting cascade.` |
| **Execution Loop Guard** | `visitedRules` Set | `src/lib/ruleEngine.ts:283` | `if (visitedRules.has(rule.id))` skips execution with reason: `"Loop guard triggered (re-fire within same execution chain)"`. |
| **Idempotency Execution Key** | `2000` keys cache | `src/lib/ruleEngine.ts:21, 355` | Key: `${event.recordId}:${rule.id}:${event.id}`. If present in set, skips with: `"Idempotent duplicate execution skipped"`. Capped at 2000 entries (FIFO eviction). |
| **Direct Self-Cycle Check** | Static Rule Check | `src/lib/useAutomationStore.ts:341-356` | In `checkRuleCycle`: If trigger is `.entered_stage` and target is the exact same stage, blocks save with: `"Loop detected: A rule cannot move to the exact stage that triggered it."` |

---

# PART E: ENTITY-WISE BEHAVIOUR

## E1. Entity Process Configuration Today

*(Source: `src/lib/useProcessStore.ts:370-450`)*

### 1. Client
* **Process Count:** Arbitrary number of processes (many).
* **Permissions:** Fully editable. Users can create new processes, delete processes, and add, reorder, rename, or delete stages freely.
* **Seeded Stages:** Seeded in default processes like `"Patient Care Journey"`: *Registered*, *Scheduled*, *Checked In*, *In Consultation*, *Completed*.
* **Status in Module:** Client profile shows `stage` and `processes[]`.
* **Triggers Belonging to Client:** `client.created`, `client.updated`, `client.product_assigned`, `client.deleted`, `field.updated`.
* **Actions Allowed on Client:** Field Update, Assign Responsible, WhatsApp, SMS, Email, Generate Document, Move to stage.

### 2. Appointment
* **Process Count:** Exactly **one locked process** (`id: "process-appointment-default"`, Name: `"Appointment Flow"`). Users cannot add or delete appointment processes.
* **Stages:** Exactly **7 stages** locked to module statuses:
  1. *Booked* (`appt-1`, systemCategory: `booked`, required)
  2. *Rescheduled* (`appt-2`, systemCategory: `rescheduled`, required)
  3. *Reminder* (`appt-3`, systemCategory: `reminder`)
  4. *Checked In* (`appt-4`, systemCategory: `checked_in`)
  5. *Completed* (`appt-5`, systemCategory: `completed`, required, final)
  6. *Cancelled* (`appt-6`, systemCategory: `cancelled`, required, final)
  7. *No-show* (`appt-7`, systemCategory: `no_show`, final)
* **Status in Module:** Stage names correspond directly to Appointment status in tables, cards, and detail drawers.
* **Triggers Belonging to Appointment:** `appointment.booked`, `appointment.rescheduled`, `appointment.cancelled`, `appointment.completed`, `appointment.no_show`.
* **Allowed Target Stages:** Any of the 7 stages within `process-appointment-default`.

### 3. Invoice
* **Process Count:** Exactly **one locked process** (`id: "process-invoice-default"`, Name: `"Billing & Invoicing"`). Users cannot add or delete invoice processes.
* **Stages:** Exactly **7 stages** locked to module statuses:
  1. *Draft* (`inv-1`, systemCategory: `draft`, required)
  2. *Sent* (`inv-2`, systemCategory: `sent`)
  3. *Viewed* (`inv-3`, systemCategory: `viewed`)
  4. *Partially Paid* (`inv-4`, systemCategory: `partially_paid`)
  5. *Paid* (`inv-5`, systemCategory: `paid`, required, final)
  6. *Overdue* (`inv-6`, systemCategory: `overdue`)
  7. *Void* (`inv-7`, systemCategory: `void`, required, final)
* **Status in Module:** Stage names correspond directly to Invoice payment status.
* **Triggers Belonging to Invoice:** `invoice.created`, `invoice.sent`, `invoice.viewed`, `invoice.partially_paid`, `invoice.paid`, `invoice.overdue`, `invoice.voided`.
* **Allowed Target Stages:** Any of the 7 stages within `process-invoice-default`.

### 4. Insurance & Claim (Phase 5 — Present in Types/Code, Not in Active PRD)
* In `useProcessStore.ts:425-450`, `DEFAULT_ENTITY_PROCESSES` contains `insurance` (`process-insurance-default`, stages: *Pending*, *Verified*, *Failed*) and `claim` (`process-claim-default`, stages: *Draft*, *Submitted*, *Paid*, *Denied*).
* Status: **Defined, not wired** (Phase 5).

---

## E2. Entity Automation Matrix

| Entity | Primary Triggers | Allowed Actions | Allowed Move-to-Stage Targets | Blocked Combinations |
| :--- | :--- | :--- | :--- | :--- |
| **Client** | `client.created`, `client.updated`, `client.product_assigned`, `field.updated` | Field Update, Assign Responsible, WhatsApp, SMS, Email, Generate Document, Move Client Stage | Any stage in any Client Process | Cannot move to Appointment or Invoice stages directly |
| **Appointment** | `appointment.booked`, `appointment.rescheduled`, `appointment.cancelled`, `appointment.completed`, `appointment.no_show` | Generate Invoice, Send Payment Link, WhatsApp, SMS, Email, Move Appointment Stage | Stages 1–7 of `process-appointment-default` | Cannot move Client or Invoice stages directly *(except special hardcoded care journey checkin exception in `ruleEngine.ts:309`)* |
| **Invoice** | `invoice.created`, `invoice.sent`, `invoice.paid`, `invoice.partially_paid`, `invoice.overdue`, `invoice.voided` | Send Invoice, Send Payment Link, WhatsApp, SMS, Email, Move Invoice Stage | Stages 1–7 of `process-invoice-default` | Cannot move Appointment or Client stages directly |

---

## E3. Step-by-Step UI Selection Order

1. **Open Drawer:** User clicks *"Add Automation"* or *"Create Rule"*. Drawer opens displaying title **"Automation Library"** (or **"Edit Automation"**).
2. **Name & Description:**
   * User enters text into `"Automation Name"` input.
   * User enters optional details into `"Description"` textarea.
3. **Trigger Category:**
   * In Global scope: User chooses from `"Trigger Category"` dropdown (`Client`, `Appointment`, `Invoice`, `Insurance`, `Stage`, `Field Update`).
   * In Stage scope: User chooses from `"Trigger Category"` dropdown (`Stage (Movement)`, `Client`, `Appointment`).
4. **Trigger Event:**
   * User selects the event from the `"Trigger"` dropdown (e.g. `"Appointment booked"` or `"On Stage Enter"`).
5. **Add Actions ("Then do these actions"):**
   * User clicks **"Add next step"**.
   * Popover opens showing categories: `Workflow`, `Records`, `Communication`, `Caller Engagement`, `Data`, `Webhook`.
   * User clicks an action card (e.g. `"Update to stage"` or `"Generate Invoice"`).
6. **Configure Step Parameters:**
   * Step Detail Drawer opens automatically.
   * For `"Update to stage"`:
     * User selects **Choose Entity** (`Processes`, `Appointment`, `Invoice`).
     * User selects **Choose Process** from dropdown.
     * User selects **Choose Stage** from dropdown.
     * User optionally toggles *"End current process before moving"*.
   * User clicks **"Save Changes"**.
7. **Commit Automation:**
   * User clicks **"Save Automation"** (or **"Save Draft"**) in footer.

---

## E4. Where Automations are Configured Today

| Automation Type | Where Configured in Code & UI | Who Can See It | Who Can Edit It |
| :--- | :--- | :--- | :--- |
| **Stage Scope Automations** | Process Page &rarr; Stage Drawer &rarr; Automations Tab (`src/app/components/process/StageAutomationsTab.tsx`) | Clinic Admins and Staff viewing the stage | Users with process edit permissions |
| **Global Scope Automations** | Global Automation Page (`/automation` &rarr; `src/app/pages/Automation.tsx`) | Tenant Administrators | Tenant Administrators |
| **Product / System Rules** | Admin Console (`/admin/automations` &rarr; `src/app/pages/admin/AdminAutomations.tsx`) | Super Admins & Mantra Product Team | Super Admins |
| **Visual Flow Wiring** | 75% width canvas drawer (`src/app/components/process/FlowBuilderDrawer.tsx` / `FlowBuilderTab.tsx`) | Anyone with drawer open | Users with edit permissions |

---

## E5. Rule Matching, Execution Order, and Conflict Resolution

*(Source: `src/lib/ruleEngine.ts:159-450`)*

1. **Event Interception:** When an event is emitted via `eventBus.emit(eventName, recordType, recordId, payload)`, `executeRulesForEvent` is called.
2. **Filtering Candidate Rules:**
   * Normalizes `event.event` and matches against `rule.trigger.event`.
   * Discards rules where `rule.enabled === false`.
   * Checks organization scoping: if the rule has `scopingRules`, it evaluates whether the rule matches the active tenant's category, industry, and location.
3. **Ordering:** Candidate rules execute **sequentially in array order** as stored in `localStorage` (`mantra_global_automation_rules_v1`). There is no user-defined priority weight or sequence index on rules.
4. **Conflict Handling:**
   * If two active rules trigger on the same event and both move the record to different stages, the second rule will overwrite the first rule's stage move.
   * Both stage moves will be logged in `logStageMove`, and the final stage of the record will reflect the last executed rule.
5. **One Process per Client Rule:**
   * In `clientsStore.ts:292-295`, moving a client to a new process **appends** the new process to `client.processes[]` rather than removing the previous process.
   * In `StepParametersFields.tsx:2350-2368`, an explicit toggle **"End current process before moving"** exists. If enabled, `params.stepEndCurrentProcess` is set to `true`, but at run time in `ruleEngine.ts:566-602`, the code calls `moveClientToStage`, which does not terminate earlier processes.

---

# PART F: UI STRUCTURE AND EXACT TEXT

## F1. Automation Drawer (`AddAutomationDrawer.tsx`)

### 1. Header
* **Icon:** Blue squircle containing `GitBranch` (Stage scope) or `Zap` (Global scope).
* **Title:** `"Automation Library"` (when creating new) or `"Edit Automation"` (when editing an existing step/rule) or `"Automation Canvas"` (in canvas mode).
* **Scope Pill:**
  * Stage scope: Pill styled with stage color displaying `[Stage Name] · [Process Name]`.
  * Global scope: Blue pill displaying `"Global"`.
* **Close Button:** Top right `X` icon with title `"Close (Esc)"`.

### 2. Form Fields (Body)
* **Automation Name Label:** `AUTOMATION NAME` (uppercase, bold).
  * Placeholder: `"e.g. Post-Appointment Follow-up & Feedback"`
* **Description Label:** `DESCRIPTION` (uppercase, bold).
  * Placeholder: `"Explain why this automation exists and what it accomplishes..."`
* **Trigger Category Label:** `TRIGGER CATEGORY` (with `LayoutGrid` icon).
  * Helper text (Stage): `"Scoped directly to movements in [stageName]."`
  * Helper text (Global): `"Select a category to filter available trigger events."`
* **Trigger Event Label:** `TRIGGER` (with `Zap` icon).
  * Helper text: `"Fires automatically when a record transitions into [stageName]."` or `"Fires automatically when this event occurs."`
* **Actions Header:** `THEN DO THESE ACTIONS ([count])` (with `ArrowRight` icon).
  * Empty State: Dashed border card with text:
    * `"No sequential actions added yet"`
    * `"Click \"Add next step\" below to start chaining actions."`
  * Action Card Controls: Step index circle (`1`), icon box, Step Name, Output badge (if applicable), Duration badge (if wait), Gear icon button (`Settings2`) with title `"Configure parameters"`, and Delete icon button (`Trash2`) with title `"Remove action"`.

### 3. "Add Next Step" Menu
* **Trigger Button:** Dashed card with `Plus` icon and text `"Add next step..."`.
* **Popover Header:** Search input with placeholder `"Search actions, logic, webhooks..."`.
* **Category Tabs:** `"All"`, `"Workflow"`, `"Records"`, `"Communication"`, `"Caller Engagement"`, `"Data"`, `"Webhook"`.

### 4. Footer
* **Left Button:** `"Open in flow builder"` (with `GitBranch` icon).
* **Right Buttons:**
  * `"Cancel"` (outline button).
  * `"Save Draft"` (outline button).
  * `"Save Automation"` / `"Save Changes"` (primary blue button).

### 5. "Show in Flow Builder" Side Drawer (`FlowBuilderDrawer.tsx`)
* **Width:** Exact CSS `width: "75vw"`, `minWidth: "75vw"`, `maxWidth: "75vw"` with `shadow-2xl`.
* **Header Title:** `"Flow Builder · [stageName]"` with pill `"[processName]"`.
* **Unsaved Changes Banner:**
  * Text: `"Unsaved changes: You modified steps in this stage. Do you want to keep editing or close?"`
  * Buttons: `"Keep Editing"` and `"Discard & Close"`.

---

## F2. Step Detail Drawer (`StepDetailDrawer.tsx`)

* **Width:** `w-[680px] max-w-[90vw]`.
* **Header:**
  * Breadcrumb / Back button: Left chevron with text `"Back to catalog"` (when creating) or step name.
  * Title: Step Name (e.g. `"Generate Invoice"`).
  * "Show in flow builder" link button (with `GitBranch` icon).
* **Sections:**
  * **Trigger Section (hidden when `onlyParameters === true`):** Trigger dropdown, Execution timing button (`"Wait"` vs `"In Parallel"`), Delay value and unit inputs.
  * **Parameters Section (Accordion):** Header `"Parameters"` with dropdown arrow. Expands to render step-specific controls from `StepParametersFields.tsx`.
* **Footer:**
  * Left: `"Back to catalog"` or `"Cancel"`.
  * Right: `"Save Changes"` (primary blue button).

---

## F3. Global Automation Page (`Automation.tsx`)

* **Page Title:** `"Automations"`
* **Subtitle:** `"Visual rule engine connecting lifecycle events directly to pipeline actions."`
* **Action Bar:**
  * Search bar with placeholder `"Search rules by name, trigger, or description..."`
  * Filter dropdown: `"All Statuses"`, `"Active Only"`, `"Paused Only"`.
  * Create Button: `"+ Create Rule"` (opens drawer in Global scope).
* **Table Columns:**
  1. **Rule Name** (`width: "45%"`): Displays bold rule name, Product badge (if product rule), and rule description.
  2. **Trigger Event** (`width: "30%"`): Displays `Zap` icon and trigger event label.
  3. **Status** (`width: "12%"`): Pill toggle button displaying `"Active"` (emerald) or `"Paused"` (gray).
  4. **Last Run** (`width: "13%"`): Timestamp or `"—"`.
* **Row Actions:**
  * `"View / Edit Rule"` (opens drawer with rule preloaded).
  * `"Delete Rule"` (prompts: `"Delete rule \"[name]\"?"`).

---

## F4. Validation and Error Messages (Exact Text)

| Trigger / Condition / Action | Code Location | Exact Validation / Error Message Text |
| :--- | :--- | :--- |
| **Drawer Save Validation** | `AddAutomationDrawer.tsx:766` | Defaults name to `"On [entry/exit]: [stageName]"` or `"Global Automation"` if blank. |
| **Parallel Node Deletion** | `AddAutomationDrawer.tsx:667` | `"Delete this Parallel Branches node and all steps inside its branches?"` |
| **Rule Entity Mismatch** | `useAutomationStore.ts:315` | `"Entity mismatch: [effectiveEntity] rule cannot move records to [targetEntityType] process."` |
| **Target Process Missing** | `useAutomationStore.ts:304` | `"Target process \"[processId]\" not found."` |
| **Target Stage Missing** | `useAutomationStore.ts:330` | `"Target stage \"[stageId]\" not found in process \"[processName]\"."` |
| **Direct Self-Cycle Loop** | `useAutomationStore.ts:352` | `"Loop detected: A rule cannot move to the exact stage that triggered it."` |
| **Max Depth Abort** | `ruleEngine.ts:165` | `"[RuleEngine] Max execution chain depth (10) reached for record [recordId]. Aborting cascade."` |
| **Runtime Loop Guard** | `ruleEngine.ts:284` | `"[RuleEngine] Loop guard prevented rule \"[ruleName]\" ([ruleId]) from re-firing in the same chain."` |
| **Condition Gate Halt** | `ruleEngine.ts:431` | `"[RuleEngine] Condition step \"[stepName]\" evaluated to false. Halting flow for rule \"[ruleName]\"."` |
| **Unsaved Flow Changes** | `FlowBuilderDrawer.tsx:160` | `"Unsaved changes: You modified steps in this stage. Do you want to keep editing or close?"` |

---

# PART G: RELATED CURRENT STATE (REPORT ONLY)

## G1. ID Generation and Storage

* **Process IDs:**
  * Generated via: `src/lib/ids.ts` (`generateId("proc")`) or slug strings.
  * Formats: `proc-1772984000000`, `demo-patient-care-journey`, `process-appointment-default`, `process-invoice-default`.
  * Storage: `localStorage.getItem("process_store_processes")`.
* **Appointment IDs:**
  * Generated in `appointmentService.ts:628`:
    ```typescript
    const nextId = all.length > 0 ? Math.max(...all.map((a) => Number(a.id) || 0)) + 1 : 101;
    ```
  * Numeric ID integer stored in `localStorage.getItem("mantra_appointments_v1")`.
  * Display Format: Formatted with prefix and 4-digit padding: `APT-${Number(id).toString().padStart(4, "0")}` (e.g. `APT-0101`, `APT-0102`).
* **Invoice IDs:**
  * Generated in `invoiceService.ts:627, 650`:
    ```typescript
    const nextNumber = 1050 + all.length;
    id: `INV-CL-${nextNumber}`
    ```
  * Format: `INV-CL-1050`, `INV-CL-1051`, `INV-CL-1052`.
  * Storage: `localStorage.getItem("mantra_invoices_v1")`.

---

## G2. Custom Fields and Sections Support for Appointment and Invoice

* **In Field Registry Architecture:**
  * `FieldRegistryContext.tsx:6-16` includes `"appointment"` and `"invoice"` in `ALL_MODULES`.
  * `FieldManager.tsx:21-23` renders Appointment and Invoice tabs in the field management modal.
  * Users can create custom fields assigned to `"appointment"` and `"invoice"` in the registry.
* **In Active Pages and Drawers:**
  * `AppointmentDetailDrawer.tsx:118` calls `getSectionsForOrg("appointment")` and renders custom sections dynamically via `DraggableOverviewSections`.
  * `InvoiceDetailDrawer.tsx:52` calls `getSectionsForOrg("invoice")` and renders custom sections dynamically via `DraggableOverviewSections`.
  * Custom fields and sections are **Built and wired** for Appointment and Invoice in both drawers.

---

## G3. Appointment and Invoice Detail Drawers: Fields and Statuses

* **Appointment Detail Drawer (`AppointmentDetailDrawer.tsx:75-104`):**
  * **Header Status / Stages:** Renders `ChevronStageRibbon` at top showing all stages of `process-appointment-default` (*Booked*, *Rescheduled*, *Reminder*, *Checked In*, *Completed*, *Cancelled*, *No-show*). Clicking a stage advances the appointment.
  * **Default Sections & Fields (Hardcoded Seed):**
    * Section *"Appointment Details"*: `appointment_date` (Date), `appointment_time` (Time), `duration` (Number), `service` (Select), `provider` (Select), `session_type` (Select: video/in-person), `location` (Text), `rating` (Rating 1-5), `notes` (Textarea).
    * Section *"Client Information"*: `client_name` (Text), `email` (Email), `phone` (Tel).
* **Invoice Detail Drawer (`InvoiceDetailDrawer.tsx:74-110`):**
  * **Header Status / Stages:** Renders `ChevronStageRibbon` at top showing all stages of `process-invoice-default` (*Draft*, *Sent*, *Viewed*, *Partially Paid*, *Paid*, *Overdue*, *Void*). Status action buttons allow marking Paid or Void.
  * **Default Sections & Fields (Hardcoded Seed):**
    * Section *"Invoice Details"*: `invoice_number` (Text), `issue_date` (Date), `due_date` (Date), `payment_mode` (Select).
    * Section *"Product / Line Items"*: `line_items_summary` (Table group), `subtotal` (Money), `tax_amount` (Money), `discount_applied` (Money).
    * Section *"Payment Link"*: `payment_url` (Link).

---

## G4. Enforcement of "One Process at a Time Per Client"

* **Where in Code:** `src/lib/clientsStore.ts:292-295` and `src/lib/clientProcessState.ts:33-38`.
* **Actual Code Behavior:**
  * In `clientsStore.ts:293`:
    ```typescript
    const existingProcesses = Array.isArray(client.processes) ? [...client.processes] : [];
    if (targetProcessName && !existingProcesses.includes(targetProcessName)) {
      existingProcesses.push(targetProcessName);
    }
    ```
  * When a second enrollment is attempted, the code **appends** the new process to `client.processes[]` instead of blocking or removing the previous process.
  * There is **no error thrown and no block executed**; a client accumulates multiple process names in their `processes` array.
  * The single-process restriction is **Not built in storage enforcement**.

---

## G5. Where the "Process" Label Appears Across UI and Navigation

*(Renaming "Process" to "Workflow" will touch the following locations)*

1. **Sidebar Navigation (`src/app/context/SidebarMenuContext.tsx:40, 61`):**
   * Item id `"processes"`, label: `"Process"`, path: `"/deals"` (under `WORKSPACE`).
   * Item id `"workflows"`, label: `"Workflows"`, path: `"/process"` (under `CUSTOMIZATIONS`).
2. **Page Titles and Headers:**
   * `src/app/pages/Process.tsx:112`: Page header title `"Workflows"` / `"Processes"`.
   * `src/app/pages/Deals.tsx:150`: Tab headers and filter bars labeled `"Process"`.
3. **Move to Stage Dropdown (`src/app/components/process/StepParametersFields.tsx:2284, 2293`):**
   * Dropdown option: `<option value="processes">Processes</option>`.
   * Field label: `"Choose Process"`.
4. **Stage Ribbon & Badges:**
   * `AddAutomationDrawer.tsx:916`: Chip text `${stageName} · ${processName}`.
   * `FlowBuilderDrawer.tsx:138`: Header badge `${processName}`.
5. **Client Profile & CRM Fields:**
   * `src/app/pages/ClientProfile.tsx`: Field label `"Process"` / `"Processes"`.
   * `FieldRegistryContext.tsx:1406`: Field key `"processes"`, label `"Processes"`.

---

# PART H: GAPS

## H1. UI Shows That Does Not Actually Work

1. **`endworkflow` Step:** Appears in the "Add next step" catalog as *"End Workflow"*, but has no execution handler in `ruleEngine.ts`.
2. **Trigger Filters in `AddAutomationDrawer.tsx`:** State variables `selectedTriggerProcessId` and `selectedTriggerStageId` exist on lines 436-437, but are never rendered into the drawer form when `scope === "global"`.
3. **"End current process before moving" Toggle:** Renders in `StepParametersFields.tsx:2363`, but `ruleEngine.ts` does not evaluate `stepEndCurrentProcess` at runtime to clear prior processes from `client.processes[]`.
4. **Health Column on Global Automations Table:** `rule.health` and `rule.healthMessage` are updated on failed executions, but `Automation.tsx` table does not render a health badge or failure message column.

---

## H2. Code Supports That is Not Visible in the UI

1. **`appointment.checked_in` and `client.checked_in` Events:** Emitted by appointment services and patient portal, with full rule engine support, but hidden from the trigger catalog picker.
2. **Dynamic Comparison against Nested Keys:** `ruleEngine.ts:33-44` resolves dot-notated fields (e.g. `client.location`) and dynamic field comparisons, but the condition builder UI only allows selecting top-level registry keys.
3. **Trigger Evaluation Idempotency Keys:** Cache eviction and duplicate fire suppression operate in `ruleEngine.ts`, but no UI indicator informs the admin that a duplicate trigger was skipped.

---

## H3. Conflicts Between Code Today and Confirmed Brief

1. **Stage Scope Single-Trigger Rule:**
   * *Brief:* Stage scope has a single trigger (stage movement, entry only).
   * *Code Today:* `AddAutomationDrawer.tsx:1085` provides a dropdown allowing the user to switch category to *"Client"* or *"Appointment"* while in stage scope, and allows selecting *"On Stage Exit"*.
2. **Move-to-Stage Disallowed in Stage Scope:**
   * *Brief:* Stage scope contains no move-to-stage actions.
   * *Code Today:* Filtered out in `AddAutomationDrawer.tsx`, but `FlowBuilderTab.tsx` canvas node library still renders `"Update to stage"` under Logic & Routing.
3. **Module-Level Actions Move Only Their Own Entity:**
   * *Brief:* Module-level actions can only move stages of their own entity.
   * *Code Today:* `ruleEngine.ts:308-312` and lines `543-604` contain an explicit hardcoded exception (`isCheckinCrossMove`) allowing appointment check-in events to transition client stages in `"Patient Care Journey"`.
4. **Client-Process Last-Stage Next-Process Routing:**
   * *Brief:* Routing lives on the Global Automation page.
   * *Code Today:* Stage objects in `useProcessStore.ts:135` still maintain a `nextProcessTransitions` array configured inside stage settings.
5. **One Process at a Time Per Client:**
   * *Brief:* A client can only be in one process at a time.
   * *Code Today:* `clientsStore.ts:294` appends new processes to `client.processes[]`, allowing a client to be enrolled in multiple processes concurrently without error or replacement.

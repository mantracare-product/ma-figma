Here is the detailed prompt for all the updates needed:

---

## Detailed Change Prompt

### 1. Collect Information — Form Template Picker in Step Detail Drawer

In the **Step Detail Drawer** for the `"collectinfo"` step key, replace the current plain button/selector with a **clickable field** labeled `"Select the form to collect caller information"` with a `+ Add` button on the right. When clicked, it opens a **dropdown/popup** that shows the same list as the existing `FORM_TEMPLATES` array (Contact Form, Appointment Booking, Lead Generation, Quote Request, Event Registration) plus a `+ Create New Form` option at the bottom — exactly matching what is shown in Image 2 (the "Choose a form" modal). When a template is selected, the field updates to show the chosen form name with a blue highlighted selected state and a checkmark. This reuses the existing `showTemplateModal` + `savedCollectInfoForms` state flow already in the code.

---

### 2. Schedule an Appointment — Replace Cards with Dropdown + Conditional Fields

In the **Step Detail Drawer** for the `"scheduleappointment"` step key, replace the current three-card grid layout with:

**A labeled dropdown:**
- Label: `"Appointment Booking Method"` (bold, `DM Sans`)
- Subtitle below label: `"Select how you'd like to handle appointment scheduling with your callers"` (small, muted, `Outfit`)
- A `<select>` or custom dropdown with these 4 options:
  1. `""` → placeholder: `"Select a booking method..."`
  2. `"text-link"` → `"Text Booking Link"` with subtitle `"Automatically send your calendar booking link via text message"`
  3. `"collect-request"` → `"Collect Booking Request"` with subtitle `"AI collects caller availability and creates a booking request"`
  4. `"schedule-phone"` → `"Schedule Over Phone"` with subtitle `"AI assistant books appointments directly during the call"`

**Conditional fields shown below the dropdown based on selection:**

- **Text Booking Link** selected → show a single text input labeled `"Booking Link URL"` with placeholder `"https://calendly.com/your-link"` and a helper text `"This link will be sent via SMS to the caller after the call ends."`

- **Collect Booking Request** selected → show:
  - A textarea labeled `"What availability should the AI collect?"` with placeholder `"e.g. Ask the caller for their preferred date and time window"`
  - A text input labeled `"Assigned To"` with a dropdown of team members (reuse `availableEmployees` list)

- **Schedule Over Phone** selected → show:
  - A `<select>` labeled `"Calendar to book on"` with options from `availableEmployees` (reuse existing)
  - A text input labeled `"Appointment Duration (minutes)"` with placeholder `"30"`
  - A helper badge in amber: `"Beta — This feature is in active development"`

Use a new local state variable `appointmentBookingMethod` (string, default `""`) inside the step detail section. All conditional field values can use existing `appointmentUser` and `appointmentDetails` state already in the file.

---

### 3. Smart Call Analysis — Remove "Add Custom" Button + Keep Only "Select Template"

In the **Step Detail Drawer** for the `"smartcallanalysis"` step key:

- **Remove** the `+ Add Custom` button entirely (the one that shows `toast.info("Add Custom scenario feature coming soon")`)
- **Keep** the `"Select Template"` dropdown button with its existing 4 options (Customer Feedback, Sales Data, Call Classification, Call Outcome)
- When a template is selected from the dropdown, it opens the **existing `showAnalysisScenarioModal`** (the "Add Smart Analysis Scenario" modal already in the code) with the template data pre-filled — exactly as the current behavior
- Below the Select Template button, show the `callAnalysisScenarios` list the same way it currently renders (Scenario #1, #2, etc. with Edit and Remove buttons)
- If no scenarios yet, show the same blue-tinted empty state box already in the code

---

### 4. Greeting Phrase Step Detail

In the Step Detail Drawer for `"greetingphrase"` step key, show:
- The **Execution** field (existing, already shown)
- A textarea labeled `"Greeting Phrase"` with placeholder `"Hi, this is Alex from [Your Business], who do I have the pleasure of speaking with today?"` bound to the existing `greetingPhrase` state
- A helper info box (blue background, Info icon): `"This is the opening line your receptionist will use when answering the phone."`
- The **Conditions** section (existing, already shown at bottom)
- NO separate language or edit/cancel toggle — just the textarea directly editable

---

### 5. Transfer Call Step Detail

In the Step Detail Drawer for `"transfercall"` step key, show:
- The **Execution** field (existing)
- Then the full transfer scenario form reused from the existing `transferScenarios` state:
  - `"Scenario Description"` textarea
  - `"Phone Number"` with country code selector + number input
  - `"Extension Digits"` optional text input
  - `"Voice Response"` text input (default value: `"Please hold while I transfer your call"`)
  - `"Call Transfer Type"` radio buttons: Cold Transfer / Hot Transfer
- On Save Changes, push the filled scenario into `savedTransferScenarios` array (same as existing Add Transfer Modal submit logic)
- The **Conditions** section (existing)

---

### 6. Send Text Message Step Detail

In the Step Detail Drawer for `"sendtextmessage"` step key, show:
- The **Execution** field (existing)
- `"Enable Short URLs"` toggle (bound to first textMessageScenario's `enableShortUrls`)
- `"Scenario Description"` textarea
- `"Text Message"` textarea with `"* Max 1000 characters allowed"` note in blue
- `"What should the AI do next?"` textarea
- `"Ask before sending Text SMS"` toggle
- `"Attach Image (Optional)"` file upload zone (same drag-and-drop zone already in Add Text Message Modal)
- On Save Changes, push into `savedTextMessageScenarios` (same logic as existing modal submit)
- The **Conditions** section (existing)

---

### 7. Step Key Additions to `allSteps` Array

Add these 6 entries to the `allSteps` array inside the Workflow Steps drawer body. They must appear after the existing 16 steps, grouped by their category. Add `"incall"` and `"postcall"` as new valid category keys:

```
{ key: "greetingphrase", name: "Greeting Phrase", desc: "Configure the opening line spoken when answering a call.", iconKey: "messagesquare", cats: ["all", "incall"], popular: false },
{ key: "transfercall", name: "Transfer Call", desc: "Teach your AI how to intelligently transfer the call to a person or department.", iconKey: "phonecall", cats: ["all", "incall"], popular: true },
{ key: "sendtextmessage", name: "Send Text Message", desc: "Send an SMS to the caller in real-time during the call with links or info.", iconKey: "messagesquare", cats: ["all", "incall"], popular: true },
{ key: "collectinfo", name: "Collect Information", desc: "Run an intake form after the call to collect caller information.", iconKey: "lightbulb", cats: ["all", "postcall"], popular: false },
{ key: "scheduleappointment", name: "Schedule an Appointment", desc: "Book, collect, or text a scheduling link after the call ends.", iconKey: "calendar", cats: ["all", "postcall"], popular: false },
{ key: "smartcallanalysis", name: "Smart Call Analysis", desc: "Define what data the AI extracts and analyzes from each call automatically.", iconKey: "layoutgrid", cats: ["all", "postcall"], popular: false },
```

---

### 8. Filter Dropdown — Add Two New Categories

In the filter dropdown inside the Workflow Steps drawer (the array of 8 category objects), add these two new entries **after** "Appointment":

```
{ key: "incall", icon: <PhoneCall className="w-4 h-4" />, name: "In Call Actions", desc: "Actions that happen during active calls" },
{ key: "postcall", icon: <ClipboardList className="w-4 h-4" />, name: "Post Call Actions", desc: "Actions that run after a call concludes" },
```

---

### 9. Remove IN CALL ACTIONS and POST CALL ACTIONS Sections from Basic Tab

Remove these two entire collapsible sections from the Basic tab of the Stage view:
- The `inCallActionsExpanded` block (containing Greeting Phrase, Transfer Call, Send Text Message accordions)
- The `postCallActionsExpanded` block (containing Collect Information, Schedule an Appointment, Smart Call Analysis accordions)

Keep all existing state variables (`savedTransferScenarios`, `savedTextMessageScenarios`, `savedCollectInfoForms`, `callAnalysisScenarios`, etc.) since they are still used by the new Step Detail Drawer forms. Only remove the JSX rendering blocks from the Basic tab. The Workflow Steps section with its drawer remains as the single entry point.
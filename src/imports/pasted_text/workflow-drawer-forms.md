**Prompt:**

Update the detail drawer forms for all remaining workflow steps. Each step opens its own fully independent drawer with the structure described below. No data should bleed between any steps.

---

**1. Field Update**
- **Execution** — clickable row → opens Execution Timing modal (Wait / In Parallel)
- **Select Field to Edit** — dropdown with options: Contact Person, Contact Name, Call Status, Call Duration, Country, Sentiment, Intent, Appointment Date, Appointment Time, Appointment With, AI Summary, Call Transcription
- **Update Value** — text input with placeholder "Enter new value..." and an **"Insert Variable"** link (blue, top right of field)
- **Conditions** section with Field + Operator + Value row, AND/OR toggle between multiple conditions, + Add Condition full-width button
- Footer: **Back** (left) + **Save Changes** (left, next to Back)

---

**2. Assign to a Human**
- **Execution** — clickable row → opens Execution Timing modal
- **Assign Responsible** — dropdown with options: Select user..., John Smith, Sarah Johnson, Michael Chen
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**3. Call Action**
- **Execution** — clickable row → opens Execution Timing modal
- **Connect Call** — dropdown with options: Select user..., John Smith, Sarah Johnson, Michael Chen
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**4. WhatsApp**
- **Execution** — clickable row → opens Execution Timing modal
- **Template ID** — text input with placeholder "Enter template ID..." and an **"Insert Variable"** link (blue, top right)
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**5. SMS**
- **Execution** — clickable row → opens Execution Timing modal
- **Template ID** — text input with placeholder "Enter template ID..." and an **"Insert Variable"** link (blue, top right)
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**6. Email**
- **Execution** — clickable row → opens Execution Timing modal
- **Template ID** — text input with placeholder "Enter template ID..." and an **"Insert Variable"** link (blue, top right)
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**7. CRM Update**
- **Execution** — clickable row → opens Execution Timing modal
- **CRM Name** — dropdown with options: Select CRM..., Salesforce, HubSpot, Zoho CRM
- **Select CRM Field to Update** — dropdown with options: Select field..., Status, Priority, Notes
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**8. EHR Update**
- **Execution** — clickable row → opens Execution Timing modal
- **EHR Name** — dropdown with options: Select EHR..., Epic, Cerner, athenahealth
- **Select EHR Field to Update** — dropdown with options: Select field..., Patient Status, Appointment Notes, Medication
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**9. Trigger Webhook**
- **Execution** — clickable row → opens Execution Timing modal
- **Webhook URL** — text input with placeholder "https://api.example.com/webhook" and an **"Insert Variable"** link (blue, top right)
- **Headers** — two side-by-side inputs: Key | Value, with a full-width **+ Add Header** button below
- **Body** — multiline text area with placeholder `{"key": "value"}` and an **"Insert Variable"** link (blue, top right)
- Footer: **Back** + **Save Changes** (bottom left)

---

**10. Trigger API**
- **Execution** — clickable row → opens Execution Timing modal
- **API Endpoint** — text input with placeholder "https://api.example.com/endpoint" and an **"Insert Variable"** link (blue, top right)
- **Method** — dropdown with options: GET, POST, PUT, PATCH, DELETE (default: GET)
- **Authentication** — text input with placeholder "Bearer token or API key" and an **"Insert Variable"** link (blue, top right)
- **Headers** — two side-by-side inputs: Key | Value, with a full-width **+ Add Header** button below
- Footer: **Back** + **Save Changes** (bottom left)

---

**11. Book Appointment**
- **Execution** — clickable row → opens Execution Timing modal
- **User** — dropdown with placeholder "Select from Team Calendar..." with options: John Smith, Sarah Johnson, Michael Chen
- **Appointment Details** — dropdown with options: Select field..., Appointment Date, Appointment Time, Duration (default shows "Appointment Time")
- **Conditions** section with Field + Operator + Value row, AND/OR toggle, + Add Condition full-width button
- Footer: **Back** + **Save Changes** (bottom left)

---

**12. Reschedule Appointment**
- Identical structure to **Book Appointment** above
- Title: "Reschedule Appointment"
- Subtitle: "Reschedule an existing appointment with updated time or user."
- All fields, dropdowns, and options are the same as Book Appointment
- Footer: **Back** + **Save Changes** (bottom left)

---

**Global Rules for ALL steps:**
- Every step drawer is fully **independent** — no state, selections, or data from one step carries over to any other
- All drawers reset to default/blank state when opened
- Conditions Field dropdown options (same across all): Field, Contact Person, Contact Name, Call Status, Call Duration, Country, Sentiment, Intent, Appointment Date, Appointment Time, Appointment With, AI Summary, Call Transcription
- Conditions Operator dropdown options (same across all): Operator, Equals, Not Equals, Contains, Does Not Contain, Starts With, Ends With, Greater Than, Less Than, Is Empty, Is Not Empty
- AND/OR toggle appears **between** every pair of condition rows, defaulting to AND
- **+ Add Condition** button is full width with 16px margin on left and right
- Opens on **single click** of the step row
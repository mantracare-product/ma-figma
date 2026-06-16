Design a modern, production-ready SaaS web application UI for **"MantraAssist"** — a healthcare-focused AI calling + CRM platform.

This must include:
✔ Clean SaaS design
✔ Fully defined interactions (not static UI)
✔ Scalable architecture
✔ Consistent design system
✔ Real-world usability (like Stripe / HubSpot)

---

🎨 DESIGN SYSTEM

* Style: Minimal, clean, calming SaaS

* Colors:
Primary: #4F8EF7
Secondary: #6DD3C7
Background: #F7F9FC
Cards: #FFFFFF
Text: #1F2937
Muted: #6B7280
Border: #E5E7EB

* Border radius: 12px

* Shadows: soft (0px 8px 24px rgba(0,0,0,0.08))

* Spacing: 8px grid system

* Padding: 16–24px

* Table row height: 48–56px

---

🌐 GLOBAL UI

HEADER:

* Organization switcher
* Notification bell
* User profile dropdown (Profile, Settings, Logout)

SIDEBAR (collapsible):
Main:

* Overview
* Clients
* Call Logs
* Process

Management:

* Organizations
* Settings (expandable)

* Custom Fields
* Roles & Permissions
* Industry
* Account

---

🔐 AUTH FLOW

* Login (centered card)
* Signup (multi-step with progress bar)
* OTP verification
* Organization setup
* EHR Integration flow (conditional logic)

Include:

* Validation states
* Disabled buttons
* Error messages

---

📊 OVERVIEW PAGE

* KPI Cards:

* Total Calls
* Completed
* Failed
* Avg Duration

* Charts:

* Line (performance)
* Pie (distribution)
* Bar (conversion)

* AI Insights

* Recent activity

* Quick actions

FILTER:

* 1W / 1M / 3M / Custom
* If Custom → show Start + End date picker

---

👥 CLIENTS PAGE (FULLY FUNCTIONAL)

TOP BAR:

* Search
* Filter
* Customize Columns
* * Add Client
* Upload / Download

ADD CLIENT:

* Modal form
* Validation
* Success toast
* Add row dynamically

FILTER:

* Dropdown panel
* Date (with custom picker)
* Process
* Stage
* Apply + Reset

COLUMN TOGGLE:

* Checkbox-based visibility
* Instant update

TABLE:

* Full columns
* Actions:

* View Profile
* Schedule Call
* Delete

CLIENT PROFILE PAGE:

* Info card
* Timeline
* Notes
* Call history

---

📞 CALL LOGS

* Same structure as Clients

Extra:

* Call Type
* Status
* Recording / Transcript

CALL DETAILS:

* Summary
* Recording
* Transcript
* AI insights

---

🏢 ORGANIZATIONS (FULLY FUNCTIONAL)

* Table:

* Name
* Industry
* Status
* Users
* Created date

* * Add Organization → Modal

* Edit / Delete actions

* Status color coding

---

👤 USER MANAGEMENT

* Table:

* User
* Role
* Credits
* Usage bar
* Status

* Add User modal

* Credit management modal

---

💳 PAYMENTS & PLANS

* Plan cards

* Highlight active plan

* Monthly / Yearly toggle

* Billing Summary:

* Plan rate
* Credits
* Usage
* Estimated cost

* Add Credits modal

---

📊 TRANSACTIONS

* Charts (usage over time)

* Filters:

* Date
* Type
* User

* Table:

* Transaction history

---

⚙️ SETTINGS (TAB-BASED)

Tabs:

1. General
2. Org Call Settings
3. Billing
4. Usage Alerts
5. Roles & Permissions
6. Custom Fields

Each tab:

* Card-based layout
* Forms + toggles

---

🔄 PROCESS PAGE (MAJOR UX — FINAL STRUCTURE)

IMPORTANT:

❌ DO NOT use horizontal stage tabs
✅ USE ACCORDION FOR STAGES
✅ KEEP TABS INSIDE EACH STAGE

---

LEFT PANEL (PROCESS LIST)

* List of processes
* Expandable:

▼ Patient Intake

* Initial Contact
* Insurance Verify
* Schedule Appointment

▶ Follow-up Calls

* * Create Process button

---

RIGHT PANEL (STAGE MANAGEMENT)

When a process is selected:

Show stages as ACCORDION:

▼ Initial Contact
Tabs:

* Configuration
* Webhooks
* Retry & Rules

▶ Insurance Verify
▶ Schedule Appointment

---

STAGE ACCORDION BEHAVIOR

* One open at a time
* Smooth expand/collapse
* Highlight active stage

Each stage header:

* Stage name
* Status indicator
* Drag handle
* Edit / Delete actions

---

STAGE CONFIGURATION (KEEP THIS)

Tabs inside each stage:

1. Configuration:

* AI Prompt (with AI Generate)
* Outbound toggle
* AI Platform dropdown
* Voice Agent ID
* Voice Speed slider

2. Webhooks:

* Enable toggle
* URL input
* Key-value builder
* Delay
* Sample output

3. Retry & Rules:

* Retry attempts
* Delay between retries
* Fallback stage
* Skip off-days toggle

---

➕ ADD STAGE

* Button adds new accordion item
* Auto expand
* Editable immediately

---

🧠 UX ENHANCEMENTS

* Drag & drop stage reordering
* Tooltips for all info icons
* Hover states everywhere
* Toast notifications
* Skeleton loaders
* Empty states

---

🪟 MODALS

* Centered
* Background blur
* Close:

* X
* Outside click
* ESC

---

⚠️ STATES (CRITICAL)

ALL components must include:

Buttons:

* Default
* Hover
* Disabled
* Loading

Errors:

* Inline validation
* Retry option

Empty:

* Illustration + CTA

Loading:

* Skeleton UI

---

📱 RESPONSIVENESS

* Sidebar collapses
* Tables scroll horizontally
* Mobile-friendly layouts

---

🎯 FINAL OUTPUT

Design a high-fidelity SaaS UI that is:

* Clean
* Consistent
* Scalable
* Fully interactive
* Production-ready

Match quality of:
Stripe / HubSpot / Zoho
Looking at all 6 screenshots carefully, including the spec document (Image 4) and the edit routing popup (Image 6). Here's the complete prompt:

---

### Figma Make Prompt: Settings — Numbers Section Complete Overhaul

---

### CHANGE 1 — Horizontal Scrollable Table with Arrow Buttons

Make the Phone Numbers table **horizontally scrollable** with the same arrow button style as the Clients section:

- Table container: `overflow-x: hidden`, content scrolls internally
- **Left `‹` and Right `›` arrow buttons** pinned to left/right edges, vertically centered against table rows
- Button style: circular white, `#1C2B4A` dark navy border, dark navy arrow icon, `box-shadow: 0 2px 8px rgba(0,0,0,0.12)`, 32px diameter — identical to Clients carousel arrows
- Each click scrolls **200px** left/right with smooth animation
- All columns maintain full width — never squeeze

**Full column set (left to right):**

| Column | Width |
|--------|-------|
| Phone Number | 160px |
| Country | 130px |
| Priority | 70px |
| Countries Served | 160px |
| Process | 180px |
| Provider | 100px |
| Cost Incoming | 120px |
| Cost Outgoing | 120px |
| Inbound/Outbound | 130px |
| Status | 80px |
| Verified | 90px |
| Actions | 120px |

**Populate table with this data (from Image 4 spec):**

| Phone Number | Country | Priority | Countries | Process | Provider | Cost In | Cost Out | Status |
|---|---|---|---|---|---|---|---|---|
| +1 (555) 123-4567 | United States | 20 | All | Patient Intake · Appointment Scheduling | VAPI | $0.012/min | $0.015/min | Active |
| +91 200 2020 | India | 30 | India · Bahrain · Spain · Pakistan | Patient Intake | Twilio | $0.018/min | $0.022/min | Active |
| +32 200 2020 | UK | 5 | UK | Follow-up Calls | Zardarma | $0.018/min | $0.022/min | Active |
| +1 200 2020 | UAE | 2 | UK | Follow-up Calls | Zardarma | $0.018/min | $0.022/min | Active |

---

### CHANGE 2 — Process Column: Inline Dropdown Edit (No Popup)

**Remove** the current edit pencil behavior that opens the "Edit Routing Configuration" modal popup.

**Replace with inline editing directly in the row:**

Clicking the **✎ edit icon** in the Actions column:
- That entire row's cells become inline editable
- A **save ✓** and **cancel ✕** icon appear in the Actions cell replacing the edit icon
- **Process cell** becomes a **multi-select dropdown** inline:
  - Dropdown options (checkboxes): Patient Intake · Appointment Scheduling · Follow-up Calls · Billing Support · Insurance Verification
  - Currently selected items shown as blue checked pills inside the cell
  - Dropdown: white bg, 8px radius, `1px solid #E5E7EB` border, shadow
- **Countries Served cell** becomes a multi-select tag input — add/remove country tags
- **Provider cell** becomes a dropdown: VAPI · Twilio · Zardarma · Vonage · Telnyx
- **Status cell** becomes a toggle (keep existing toggle style)
- All other cells (Phone Number, Cost Incoming, Cost Outgoing) become plain text inputs
- Clicking ✓ saves and returns row to display mode
- Clicking ✕ discards changes

---

### CHANGE 3 — Verified Badge for US Numbers

For any row where Country = **United States**:
- Add a `✓ Verified` badge in the **Verified column**:
  - Green `#22C55E` bg, white text `✓ Verified`, 11px, 20px height, 6px radius pill
- For non-US numbers: show `— ` grey dash in the Verified column

---

### CHANGE 4 — Actions Column: Add View Button + Business Profile Popup

In the **Actions column** of every row, show these icon buttons:

| Icon | Action |
|------|--------|
| 👁 Eye | View Business Profile (US numbers only) |
| ✎ Pencil | Inline Edit (all numbers) |
| 🗑 Trash | Delete (all numbers) |

**Eye (View) button — US numbers only:**
- Shows on US rows only, grey `#9CA3AF`, turns blue `#1A73E8` on hover, tooltip `View Business Profile`
- For non-US rows: eye icon is hidden or shown in disabled grey with tooltip `US numbers only`

**Clicking Eye on a US number row** opens a **Business Profile popup modal**:

Modal specs:
- White bg, 12px radius, 680px wide, centered, overlay `rgba(0,0,0,0.4)`
- Header: `Business Profile` in 18px bold + `✎ Edit` blue button top-right + `✕` close
- Blue info banner: `ℹ US numbers only — Business Verification, Spam Tag Prevention (Shaken/STIR), and Named Number (CNAM) are only applicable for US phone numbers.`

**BUSINESS INFORMATION section** (grey caps heading + `1px solid #E5E7EB` divider below):
2-column grid, 24px row gap:
- Business Name: `HealthCare Solutions Inc.`
- Business Type: `Corporation`
- Business Industry: `Healthcare`
- Business Regions of Operations: `National`
- Business Registration ID Type: `EIN (Employer Identification Number)`
- Business Registration Number: `12-3456789`
- Website URL: `https://healthcaresolutions.com`
- Social Media Profile URL: `https://linkedin.com/company/healthcaresolutions`

Each field: label in 12px `#9CA3AF` grey caps above, value in 14px `#111827` dark below, 8px gap between label and value.

---

### CHANGE 5 — Default Number Indicator + Footer Controls

**Below the table**, add two elements (from Image 4 spec):

**1. Checkbox row:**
`☐ Don't make calls to countries not in the above list` — 13px `#374151`, checkbox left

**2. Default number selector row:**
`If not selected → Choose the number from which we should make calls at default` label in 12px `#6B7280` + dropdown (160px wide) showing all phone numbers as options, default = `+1 (555) 123-4567`

**3. Info note:**
`* For Mantra numbers can be used for specific countries only` in 11px italic `#9CA3AF`

These 3 elements sit between the table bottom and the `+ Add Country` button, 12px gap between each.

---

### CHANGE 6 — Add Number Button: Provider Options Dropdown

The `+ Buy Number` button top-right opens a dropdown menu with provider options (matching Image 4 spec):
- Free VAPI Number
- Free VAPI SIP
- Import Twilio
- Import Vonage
- Import Telnyx

Dropdown: white bg, 8px radius, `1px solid #E5E7EB` border, shadow, each item 36px height, 14px `#374151` text, hover `#F9FAFB`.

---

### DO NOT CHANGE
- Business Profile section below the Numbers table (the existing static display)
- Settings sidebar navigation
- Any other settings section (Organization, Team, Billing, Voice Configuration, Custom Fields, Integrations, Audit Logs)

---

**Attach all 6 screenshots** so Figma Make has the current table state, Business Profile content, spec document with all field requirements, and the existing edit popup to understand what to replace with inline editing.
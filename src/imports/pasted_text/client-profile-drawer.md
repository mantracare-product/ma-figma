Here's your complete, copy-paste ready Figma prompt:

---

## FIGMA AI PROMPT — Client Profile Drawer Redesign (MantraAssist)

---

**Context:**
In the Clients section, clicking the eye icon opens a right-side drawer called "Client Profile". It currently has a long scrollable single-column layout causing cognitive overload. Redesign this drawer with the following 4 changes:

---

**CHANGE 1 — Add Tab Navigation Below the Client Header**

Add 4 horizontal tabs immediately below the client avatar + name row:
- **Profile** (default active)
- **Activity**
- **Processes**
- **Notes**

Tab styling: match the tab bar style used in the "Manage Team Member" screen (Calendar | Availability | Days Off | Services | Permissions). Active tab uses primary blue underline or pill. Each tab shows only its own content section. Tabs should be horizontally scrollable on smaller widths.

- Profile tab → name, email, phone, location, company, role, company size, status badge
- Activity tab → call log with filter chips (All, Patient Intake, Follow-up Calls) and call entries (Outbound Completed, Inbound Received, Failed) with timestamps and duration
- Processes tab → Processes list with Edit button
- Notes tab → textarea ("Enter note about this client...") + "Add Note" primary blue CTA button

---

**CHANGE 2 — Replace Edit Popup with Inline Editing**

Currently clicking the pencil/edit icon next to the client name opens a separate modal/popup. Remove that popup entirely.

Instead, when user clicks the pencil icon on the Profile tab:
- All fields switch to inline editable state within the same layout
- Text labels become input fields in place (no layout shift)
- A "Save Changes" (primary blue button) and "Cancel" (ghost text button) appear at the bottom of the Profile section
- On Save or Cancel, fields revert to read-only display mode

---

**CHANGE 3 — Replace Manual Text Fields with Dropdowns**

In inline edit mode on the Profile tab, use dropdown selectors for these fields:

| Field | Options |
|---|---|
| Gender | Male, Female, Non-binary, Prefer not to say |
| Status | Active, Inactive, Prospect, On Hold |
| Company Size | 1–10, 11–50, 51–200, 201–500, 500+ employees |
| Role / Job Title | Dropdown with common titles + "Other (type manually)" |
| Location | Searchable dropdown — type to search city/state |
| Referred by | Searchable dropdown — Optical / Doctor / Third Party Partner / Existing Patient |

Name, Email, and Phone remain free-text inputs.

---

**CHANGE 4 — Add "Select Field" and "Create Field" Options at the Bottom of the Profile Edit Form**

At the bottom of the Profile tab's inline edit form (below all existing fields), add two action links/buttons side by side:

- **"+ Select field"** — clicking this opens a dropdown or popover listing all available standard fields that are not yet added to the profile form (e.g. Date of Birth, Age, Phone Hidden, Referring Employee, etc.). User can pick one to add it to the profile view.
- **"+ Create field"** — clicking this opens an inline input row where the user can type a custom field name, choose its field type (text, dropdown, date, number) from a small type selector, and confirm to add it as a new custom field on the profile.

Both buttons should appear as subtle text links (not primary buttons) using the secondary/muted text color, separated by a small divider. Style them to match the "Select field" and "Create field" links seen in the patient intake form. This allows admins to customize which data fields appear on each client profile without going into a separate settings screen.

---

**Final Drawer Structure:**

```
┌──────────────────────────────────────────┐
│  [X]          Client Profile             │
│ ──────────────────────────────────────── │
│  [SJ Avatar]  Sarah Johnson  [✏]         │
│               🟢 Active                  │
│ ──────────────────────────────────────── │
│  [Profile]  [Activity]  [Processes]  [Notes]  ← TABS
│ ──────────────────────────────────────── │
│                                          │
│  (Profile Tab — Read Mode)               │
│  📧 sarah.j@email.com                   │
│  📞 5551234567                           │
│  📍 New York, NY                         │
│  🏢 TechCorp Inc.   💼 Senior Manager   │
│  👥 101–250 employees                    │
│                                          │
│  (Profile Tab — Edit Mode)               │
│  Name:      [_________________]          │
│  Email:     [_________________]          │
│  Phone:     [_________________]          │
│  Gender:    [▼ Select gender  ]          │
│  Status:    [▼ Select status  ]          │
│  Company:   [_________________]          │
│  Role:      [▼ Select role    ]          │
│  Size:      [▼ Select size    ]          │
│  Location:  [🔍 Search city   ]          │
│  Referred:  [🔍 Search source ]          │
│                                          │
│  + Select field   |   + Create field     │
│                                          │
│        [Cancel]   [Save Changes]         │
└──────────────────────────────────────────┘
```

---

**Design Rules to Follow:**
- No modal popups for editing — everything inline
- Tabs reduce visible complexity (progressive disclosure)
- Dropdowns prevent typos and speed up data entry
- "Select field" and "Create field" allow admin customization without leaving the drawer
- Match existing design system — same fonts, border radius, button styles, colors as the rest of MantraAssist
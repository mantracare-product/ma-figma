Here's the precise prompt:

---

### Figma Make Prompt: Client Profile Drawer — Overview Restructure + Select/Create Field Functionality

---

### CONTEXT — UNDERSTAND THE STRUCTURE FIRST

The Client Profile drawer has 4 tabs: Overview · Activity · Processes · Notes. The Overview tab currently shows basic client fields (Name, Status, Email, Phone, Location, Company, Role, Company Size) with `+ Select field | + Create field` at the bottom. The Processes tab shows assigned processes separately.

---

### CHANGE 1 — Move Processes into Overview Tab

**Remove** the separate Processes tab entirely from the tab bar.

**In the Overview tab**, after the last field row (Company Size), add a new section:

```
─────────────────────────────────
PROCESSES
─────────────────────────────────
```

- Section heading: `PROCESSES` in 11px bold `#9CA3AF` uppercase caps, with a `1px solid #E5E7EB` divider line spanning full width above it, 16px margin top
- Below the heading: show each assigned process as a **blue pill tag** — `#DBEAFE` bg, `#1D4ED8` text, 11px bold, 6px radius, `4px 10px` padding, wrapping in a flex-wrap row with 6px gap
- Example pills: `Patient Intake` · `Follow-up Calls` · `Billing Support`
- If no processes: show `No processes assigned` in 12px `#9CA3AF` italic

**Edit processes in Overview:**
- A small `✎` pencil icon appears to the right of the `PROCESSES` heading on hover
- Clicking it shows a **compact inline multi-select dropdown** (same `ProcessCheckboxDropdown` component used in the Numbers table) listing all available processes:
  - Patient Intake · Appointment Scheduling · Follow-up Calls · Billing Support · Insurance Verification
- Selecting/deselecting updates the pills immediately
- A `Done` button closes the dropdown and saves the selection
- Toast: `Processes updated`

---

### CHANGE 2 — `+ Select field` — Compact Field Picker Modal

When user clicks `+ Select field` at the bottom of the Overview tab, open a **compact modal** anchored inside the drawer (not full-screen):

**Modal specs:**
- White bg, `1px solid #E5E7EB` border, 8px radius, **full drawer width minus 32px padding**, max-height 420px
- Header: `Select fields` in 16px bold `#111827` + search input `[🔍 Find field...]` below it — matching Image 2
- `Deal` filter chip top-right (blue checkmark) — in MantraAssist context label this `Client` instead

**Field groups inside the modal (matching Image 2 layout):**

**Group: About Client** (bold grey section header, 13px):
- 3-column checkbox grid:
  - `☐ Name` · `☐ Status` · `☐ Email`
  - `☐ Phone` · `☐ Location` · `☐ Company`
  - `☐ Role` · `☐ Company Size` · `☐ Process`

**Group: More** (bold grey section header):
- 3-column checkbox grid of any custom fields the user has previously created via `+ Create field`
- Each custom field appears here by its saved name

**Bottom bar:**
- `☐ select all` checkbox left-aligned
- `SELECT` button — cyan `#06B6D4` bg, white text, 80px wide, 36px height, 6px radius
- `CANCEL` — plain text link, `#6B7280`

**On SELECT:**
- Closes modal
- Each selected field that isn't already shown in Overview **appears as a new row** in the details list:
  - Label: field name in `#9CA3AF` 13px left
  - Value: `—` (blank dash) right-aligned in `#111827` 13px
  - A small `✎` pencil icon appears on hover of the value cell
- Clicking the pencil on a selected field row makes the value **inline editable** — plain text input appears in place of the value, user types and presses Enter or clicks ✓ to save

---

### CHANGE 3 — `+ Create field` — New Field Creation Form

When user clicks `+ Create field`, show a **compact inline form panel** expanding at the bottom of the drawer above the footer buttons:

**Form layout (matching Images 4, 5, 6):**

**Row 1 — Field name:**
- Label: `Field name` in 12px `#6B7280` above
- Full-width text input, white bg, `1px solid #E5E7EB` border, 8px radius, 40px height, placeholder `New text`
- Inline validation: if empty on save, show `Field name is required` in red 11px below

**Row 2 — Field type:**
- Label: `Field type` in 12px `#6B7280`
- Clicking opens a **scrollable type picker panel** (280px wide, max-height 380px, white bg, border, shadow) with up `^` / down `v` scroll indicators — matching Images 5 & 6 exactly:

  Full list in order:
  1. **String** — Text fields can contain any information: text, numbers, special characters, etc.
  2. **List** — Allows a user to select one or more list items. The field values can be used in analytical reports.
  3. **Date/Time** — Enables a user to specify date and time using a built-in calendar.
  4. **Date** — Selects a date using a built-in calendar.
  5. **Book a Resource** — Provides facilities to book a resource for a desired duration of time.
  6. **Address** — Stores address information.
  7. **Link** — Specifies web links.
  8. **File** — This field stores images and documents.
  9. **Money** — Specifies amounts of money with optional currency abbreviation.
  10. **Yes/No** — This field can be used in quick polls or when a binary (yes or no) reply is required.
  11. **Number** — Contains numeric data that can be used in analytical reports.
  12. **WhatsApp Link** — (no description)
  13. **Additional fields...** — More field types: integer; bind to user; bind to CRM item etc.
  14. **Create custom field type** — Create a custom field type using REST API

  Each row: type name 14px bold `#111827` + description 12px `#6B7280`, 16px padding, `1px solid #F3F4F6` bottom divider, hover `#F9FAFB`. Clicking a type selects it, closes the picker, shows selected type name in the field type selector.

**Row 3 — Options (checkboxes, matching Image 4):**
- `☐ Required at stage:` + inline dropdown `For all stages and pipelines ▾` (grey pill, 180px)
- `☐ Multiple`
- `☑ Show always` (pre-checked) + `?` grey tooltip icon
- `☐ Enable field tooltip`
- `☐ Make this field visible to selected users only`

**Row 4 — Action buttons:**
- `SAVE` — cyan `#06B6D4` bg, white text uppercase bold, 36px height, 80px width, 4px radius
- `CANCEL` — white bg, `1px solid #E5E7EB` border, `#374151` text uppercase, same size

**On SAVE:**
- Validates field name not empty and type selected
- Saves the new field to the app state as a reusable custom field
- Adds it immediately to the Overview tab as a new row: label = field name, value = `—`
- The new field also appears in the **Select fields modal** (Change 2) under the "More" group for future use
- Toast: `Field created successfully`
- The form dismisses and the footer returns to `+ Select field | + Create field`

**On CANCEL:** dismisses form, no changes saved

---

### CHANGE 4 — Inline Edit for All Overview Field Values

For every field row in the Overview tab (both default and added fields):
- Hovering the value cell shows a `✎` pencil icon to its right
- Clicking pencil turns value into an **inline input** of the appropriate type (text input for String/Name/Email etc., date picker for Date, toggle for Yes/No, dropdown for List/Status)
- Pressing Enter or clicking a `✓` checkmark saves inline
- Pressing Escape or clicking `✗` cancels
- Toast on save: `Field updated`

---

### DO NOT CHANGE
- Drawer header (Client Profile + ✕)
- Tab bar structure (Activity · Notes tabs unchanged)
- Avatar initials circle and client name display
- Status capsule badge (already updated to pill style)
- Any other drawer tab content

---

**Attach all 6 screenshots** so Figma Make can see the current Overview layout, the Bitrix24 Select Fields reference modal with grouped checkboxes, the inline field ID reference, the Create Field form, and both field type picker scrollable panels.
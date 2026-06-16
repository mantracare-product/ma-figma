Here's the precise prompt:

---

### Figma Make Prompt: Client Profile Drawer — Fix Status Badge + Select/Create Field Functionality

---

### CHANGE 1 — Replace Green Dot Status with Capsule Badge

In the Client Profile drawer, inside the Overview tab, the status shown next to the client name currently uses a green dot + "Active" text like `🟢 Active`.

**Remove** the green dot style entirely.

**Replace with** the same status capsule pill used in the Clients table:
- `Active` → green pill: background `#DCFCE7`, text `#16A34A`, 11px bold, 6px border radius, `6px 10px` padding
- `Inactive` → grey pill: background `#F3F4F6`, text `#6B7280`, same sizing
- `Pending` → orange pill: background `#FEF3C7`, text `#B45309`, same sizing

Apply this capsule both in the **header area** (next to the avatar/name) and in the **Status field row** in the details list below.

---

### CHANGE 2 — `+ Select Field` — Opens Field Type Picker

When user clicks `+ Select field` at the bottom of the Overview tab:

Show a **scrollable dropdown panel** anchored above the button, matching Images 3 & 4 exactly:

**Panel styling:**
- White background, `1px solid #E5E7EB` border, 8px radius, 280px wide, max-height 380px, scrollable
- Up arrow `^` indicator at top, down arrow `v` at bottom when scrollable
- Each item: field type name in 14px bold `#111827` + description in 12px `#6B7280` below, 16px padding, `1px solid #F3F4F6` bottom divider, hover `#F9FAFB`

**Field types list (in this order, matching references):**

From Image 4 (top section):
- **String** — Text fields can contain any information: text, numbers, special characters, etc.
- **List** — Allows a user to select one or more list items. The field values can be used in analytical reports.
- **Date/Time** — Enables a user to specify date and time using a built-in calendar.
- **Date** — Selects a date using a built-in calendar.
- **Book a Resource** — Provides facilities to book a resource for a desired duration of time.
- **Address** — Stores address information.
- **Link** — Specifies web links.
- **File** — This field stores images and documents.

From Image 3 (continued):
- **Money** — Specifies amounts of money with optional currency abbreviation.
- **Yes/No** — This field can be used in quick polls or when a binary (yes or no) reply is required.
- **Number** — Contains numeric data that can be used in analytical reports.
- **WhatsApp Link**
- **Additional fields...** — More field types: integer; bind to user; bind to CRM item etc.
- **Create custom field type** — Create a custom field type using REST API

**On clicking any field type from the list:** closes the picker and opens the **Create Field form** (Change 3 below) with that type pre-selected.

---

### CHANGE 3 — `+ Create field` — Opens Create Field Inline Form

When user clicks `+ Create field` (or after selecting a field type from Change 2):

Show an **inline form panel** inside the drawer, below the existing fields, matching Image 2 exactly:

**Form layout:**
- Label: `Field name` in 12px `#6B7280` grey above the input
- Text input: full width, white bg, `1px solid #E5E7EB` border, 8px radius, 40px height, placeholder `New text`
- **4 checkboxes** stacked vertically with 10px gap:
  - `☐ Required at stage:` + dropdown on same line → `For all stages and pipelines ▾` (grey pill dropdown, 180px wide)
  - `☐ Multiple`
  - `☑ Show always` (pre-checked by default) + `?` tooltip icon in grey
  - `☐ Enable field tooltip`
  - `☐ Make this field visible to selected users only`
- **Two buttons** at bottom, left-aligned:
  - `SAVE` — cyan/blue `#06B6D4` bg, white text, 12px bold uppercase, 36px height, 80px width, 4px radius
  - `CANCEL` — white bg, `1px solid #E5E7EB` border, `#374151` text, same size

**On SAVE:**
- Validates that Field name is not empty — if empty shows inline error `Field name is required` in red 11px below the input
- If valid: adds the new field as a new row in the Overview tab details list with label = entered field name, value = `—` (empty placeholder)
- Closes the form
- Shows toast: `Field added successfully`

**On CANCEL:**
- Closes the form without saving
- Returns to normal Overview tab view with `+ Select field | + Create field` footer

---

### CHANGE 4 — `+ Select field` — Existing Field Selection (Image 1)

When user picks an **existing field** from the picker (not creating new), show it as:

- Field ID shown as `:: ID` with value below (e.g. `2176398`) — matching Image 1 drag-handle style
- Below that: `Select field` and `Create field` as dashed underline text links side by side
- The selected field appends to the Overview details list as a new row with its existing value

---

### DO NOT CHANGE
- Drawer header (Client Profile + ✕ close)
- Tab bar (Overview · Activity · Processes · Notes)
- Avatar initials circle
- Client name display
- All existing field rows (Name, Email, Phone, Location, Company, Role, Company Size)
- Any other drawer tab content

---

**Attach all 6 screenshots** so Figma Make can see the current status badge, the field type picker list, the create field form, and the select field reference.
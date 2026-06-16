Here's the precise prompt:

---

### Figma Make Prompt: Client Profile Drawer — Edit Button Fix + Field Type Selection Fix

---

### CHANGE 1 — Remove Standalone Edit Icon from Processes Section

**Delete** the `✎` pencil icon that currently appears to the right of the `PROCESSES` heading (circled in red in the screenshot).

The Processes section has **no individual edit control of its own**. It is part of the Overview and is only editable through the main Overview edit flow (Change 2 below).

---

### CHANGE 2 — Single Edit Button Controls Entire Overview

The `✎` pencil icon that already exists in the **drawer header row** (top-right of the Overview tab, next to the client name) is the **only edit trigger** for the entire Overview tab.

**When this single edit button is clicked**, the entire Overview tab enters edit mode simultaneously:

**Default fields become inline editable:**
- Name → plain text input
- Status → dropdown: `Active · Inactive · Pending`
- Email → email input
- Phone → tel input
- Location → text input
- Company → text input
- Role → text input
- Company Size → dropdown: `1-10 · 11-50 · 51-100 · 101-250 · 251-500 · 500+`

**Processes section becomes editable:**
- The process pills change to a **multi-select checkbox dropdown** (using the existing `ProcessCheckboxDropdown` component)
- Options: Patient Intake · Appointment Scheduling · Follow-up Calls · Billing Support · Insurance Verification
- Currently selected processes are pre-checked
- User can check/uncheck to update

**Added fields (from Select field / Create field) become inline editable:**
- Each added field row's value becomes an input of its appropriate type (text, number, date, yes/no toggle etc.)
- Empty fields show their input with placeholder text

**Edit mode UI:**
- A `Save Changes` button (MantraAssist blue `#1A73E8`, white text, 36px height, 120px width) and `Cancel` button (white bg, grey border) appear **fixed at the bottom** of the drawer, above the `+ Select field | + Create field` footer
- Clicking `Save Changes`: commits all edits, exits edit mode, shows toast `Profile updated`
- Clicking `Cancel`: discards all changes, exits edit mode with no changes

---

### CHANGE 3 — Fix Field Type Dropdown Selection in Create Field Form

**The bug:** When `+ Create field` is clicked and the field type picker opens, clicking a field type from the list closes the dropdown but does NOT update the field type display — the selector stays blank or unchanged.

**The fix:**

The field type selector button must maintain a **controlled state variable** (e.g. `selectedFieldType`) that:

1. **Initializes** as `null` / empty — button shows placeholder text `Select field type ▾` in `#9CA3AF` grey
2. **On clicking a field type item** in the dropdown list:
   - Sets `selectedFieldType` to the clicked type name (e.g. `"String"`, `"Date"`, `"Number"`)
   - **Closes the dropdown immediately**
   - **Updates the selector button text** to show the selected type name in `#111827` dark text, replacing the placeholder
   - The `▾` chevron remains visible on the right
3. **The selector button** must re-render with the new value — ensure it reads from `selectedFieldType` state, not a static string
4. **On form reset** (Cancel or after Save): `selectedFieldType` resets to `null`, button returns to placeholder

**Selector button styling:**
- Full width of form, `1px solid #E5E7EB` border, 8px radius, 40px height, 12px padding
- Left: selected type name (or placeholder) in 13px
- Right: `▾` chevron in `#9CA3AF`
- When dropdown is open: border changes to `#1A73E8` blue, chevron rotates 180°
- Selected item in dropdown: blue left border `3px solid #1A73E8` + `#EFF6FF` bg highlight

**Dropdown remains unchanged** — same scrollable list of 14 field types with name + description, same styling. Only the state binding and the button display update are being fixed.

---

### CHANGE 4 — Field Type Drives Input in Overview Row

After a field is created via `+ Create field` and appears in the Overview as a new row with value `—`:

When the main edit button is clicked (Change 2), that field's inline input must match its saved field type:

| Field Type | Input shown in edit mode |
|------------|--------------------------|
| String | Plain text input |
| Number | Number input |
| Date | Date picker input |
| Date/Time | DateTime picker |
| Yes/No | Toggle switch |
| List | Dropdown select |
| Money | Number input with currency prefix `$` |
| Address | Multiline text area |
| Link | URL text input |
| File | File upload button |
| WhatsApp Link | Text input with `+` prefix |

---

### DO NOT CHANGE
- Drawer header, avatar, client name display
- Status capsule pill styling
- Tab bar (Overview · Activity · Processes · Notes)
- `+ Select field | + Create field` footer
- Select field modal functionality
- Any other drawer tab

---

**Attach the screenshot** showing the current state with the circled edit icon on Processes so Figma Make knows exactly which icon to remove and can verify the header edit button position.
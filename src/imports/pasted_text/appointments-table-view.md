Here's the precise prompt:

---

### Figma Make Prompt: Appointments List View — Convert to Table + Inline Edit/Actions

---

### CHANGE 1 — Convert List View Cards to a Data Table

When the **List icon (☰)** toggle is active, replace the current card-based layout entirely with a **data table** matching the Clients table style (dark navy `#1C2B4A` header row, white rows, alternating subtle hover).

**Table columns (in this order):**

| Column | Width | Content |
|--------|-------|---------|
| ☐ Checkbox | 40px | Row select |
| Client | 160px | Patient name, bold dark |
| Email | 180px | Email address, grey |
| Phone | 130px | Phone number, grey |
| Date & Time | 150px | `May 12, 2026 · 09:00` |
| Provider | 130px | Provider name |
| Service | 180px | Service name |
| Duration | 80px | `60 min` |
| Status | 110px | Status badge pill |
| Actions | 120px | Action icon buttons |

**Header row:** dark navy `#1C2B4A`, white bold uppercase 11px column labels, identical to Clients table header styling.

**Data rows:** white background, `1px solid #F3F4F6` bottom border, 52px row height, all text 13px `#374151`.

**Status badge pills:**
- `scheduled` → blue `#DBEAFE` bg, `#1D4ED8` text
- `completed` → green `#DCFCE7` bg, `#15803D` text
- `pending` → orange `#FEF3C7` bg, `#B45309` text
- `cancelled` → red `#FEE2E2` bg, `#B91C1C` text
- `no-show` → grey `#F3F4F6` bg, `#6B7280` text

**Populate with all existing appointment data:**
- James Wilson · james.w@example.com · +1(555)123-4567 · May 12 09:00 · John Smith · Initial Consultation · 60 min · scheduled
- Emma Brown · May 12 10:30 · Sarah Johnson · Follow-up Visit · 30 min · scheduled
- Oliver Davis · May 13 14:00 · John Smith · X-Ray Imaging · 20 min · scheduled
- Sophia Martinez · May 14 11:00 · Dr. Robert Martinez · Dental Cleaning · 45 min · scheduled

---

### CHANGE 2 — Actions Column (4 Icon Buttons)

In the **Actions column** of each row, show 4 icon buttons in a horizontal row, 16px each, 6px gap, grey by default, colored on hover:

| Icon | Action | Hover Color | Tooltip |
|------|--------|-------------|---------|
| ✓ Checkmark circle | Complete | Green `#22C55E` | "Mark Complete" |
| ⊘ No-show circle | No Show | Orange `#F97316` | "Mark No Show" |
| ✎ Pencil | Edit | Blue `#1A73E8` | "Edit" |
| 🗑 Trash | Cancel/Delete | Red `#EF4444` | "Cancel" |

**Clicking Edit (pencil icon):** opens the existing Edit Appointment modal/popup — same form as currently exists (Client Name, Client Email, Client Phone, Provider dropdown, Service dropdown, Date, Time, Notes, Status). No change to the form itself.

**Clicking Cancel (trash icon):** shows an inline confirmation — the row background turns light red `#FEF2F2`, and two small buttons appear in the actions cell: `Confirm` (red, 11px) and `Undo` (grey, 11px). Clicking Confirm removes the row. Clicking Undo restores normal row state.

**Clicking Complete:** status badge in that row instantly updates to `completed` green pill.

**Clicking No Show:** status badge updates to `no-show` grey pill.

---

### CHANGE 3 — Inline Row Edit (matching Clients table behavior)

When a row's **checkbox is checked**, that row becomes **inline editable** — exactly like the Clients table inline edit shown in screenshots 4 and 5:

- A banner appears above the table: `1 selected` · `Clear selection` · `Cancel` button · `Save` button (blue)
- The checked row's cells become editable inputs:
  - **Client name** → plain text input, white bg, blue border
  - **Email** → plain text input
  - **Phone** → plain text input
  - **Provider** → dropdown with options: John Smith · Sarah Johnson · Emily Davis · Dr. Robert Martinez · Lisa Anderson (same as Image 7)
  - **Service** → dropdown with options: Initial Consultation - 60 min ($150) · Follow-up Visit - 30 min ($75) · Dental Cleaning - 45 min ($120) · X-Ray Imaging - 20 min ($80) (same as Image 6)
  - **Date & Time** → date input + time input side by side
  - **Duration** → auto-populated from Service selection (non-editable, grey)
  - **Status** → dropdown: Scheduled · Completed · Pending · Cancelled · No Show
- Clicking `Save` commits changes, hides the banner, row returns to normal display
- Clicking `Cancel` discards changes, hides banner

---

### CHANGE 4 — Fix Filter Tabs (Upcoming / Done / Pending / All)

**Remove** the current tab bar with `Upcoming 1 · Done 1 · Pending · All 5` from above the table.

**Replace with a filter row** that sits between the search bar row and the table, left-aligned:

- Style: pill-shaped toggle buttons grouped together, white bg, `1px solid #E5E7EB` border wrapping group, 6px radius
- Each filter button: 90px wide, 32px height, 12px text
- Labels with live counts:
  - `Upcoming 4` · `Done 0` · `Pending 0` · `All 4`
- **All selected by default** — `All` tab active (blue fill, white text) on page load
- Inactive tabs: grey text, white bg
- Clicking a filter tab filters the table rows by status:
  - Upcoming = scheduled appointments with future dates
  - Done = completed or no-show
  - Pending = pending status
  - All = show all rows

**Below the filter row, left-aligned:** `Appointments with experts` label in 12px grey + `Total 4` right-aligned — same as current layout.

---

### CHANGE 5 — Checkbox Select-All in Header

The checkbox in the dark navy header row selects/deselects all visible rows. When all are selected, the banner shows `4 selected`. Inline editing applies to all selected rows simultaneously for Provider, Service, and Status fields only (bulk edit).

---

### DO NOT CHANGE
- Calendar view (grid icon toggle)
- Stat pills row
- Search bar, All Employees filter, Book Appointment button
- Edit Appointment modal form fields and layout
- Any other section or page

---

**Attach all 8 screenshots** — list view cards, All tab, Clients table, inline edit row, process dropdown, Edit modal with Service dropdown, Edit modal with Provider dropdown — so Figma Make has full context for table styling, inline edit behavior, dropdown options, and action button placement.
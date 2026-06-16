Here's the detailed precise prompt:

---

## Prompt: Redesign Custom Fields Page to Match Reference UI

---

### Context

The Custom Fields page currently shows a simple table inside the Settings layout. Redesign it to match the reference UI screenshots while keeping it inside the existing Settings page layout (left sidebar + main content area).

---

### Page Header Changes

Replace the current header with:

- **Large bold title:** "Custom Fields" — `font-size: 32px`, `font-weight: 700`, dark near-black color (`#111827` or equivalent from design system) — significantly larger than current
- **Subtitle below:** "Manage custom data structures for clients and call interactions." — `font-size: 14px`, muted gray, wraps to two lines naturally
- **"+ Add Field" button:** move to top-right of the page header area (not inside the table card), styled as a **dark filled pill/capsule button** — dark navy/black background, white text, `+ Add Field` label, `border-radius: 999px` (fully rounded pill shape), `padding: 10px 20px`, `font-size: 14px`
- Remove the current "▷ How it works" button from beside Add Field — it goes away

---

### Tab Switcher — Add Clients / Call Logs Tabs

Directly below the page header, add a **tab toggle group** with two options:

- **"Clients"** tab (default active)
- **"Call Logs"** tab

Tab style: both tabs inside a single pill-shaped container with a light gray background (`#F3F4F6`), `border-radius: 999px`, `padding: 4px`. The active tab is white with a subtle shadow, `border-radius: 999px`, `padding: 6px 20px`. Inactive tab has no background. `font-size: 14px`, `font-weight: 500`. This is a segmented control style, not underline tabs.

---

### Table Redesign

The table sits below the tab switcher inside a white rounded card with subtle border. Full width of the content area.

**Table header row:**
- Background: very light gray (`#F8F9FA` or `#F1F5F9`)
- Column headers in uppercase, `font-size: 11px`, `font-weight: 600`, muted gray, `letter-spacing: 0.05em`
- Columns: **LABEL | KEY | TYPE | REQUIRED | ACTIONS**
- Columns are evenly spaced with ACTIONS right-aligned
- No border on header, just the background color differentiates it

**Table rows:**
- White background, subtle bottom border between rows (`1px solid #F0F0F0`)
- Row height: ~56px with comfortable vertical padding
- **LABEL column:** bold text, `font-size: 14px`, `font-weight: 600`, dark color (e.g. "Budget", "Patient ID")
- **KEY column:** monospace or regular text, `font-size: 13px`, muted gray (e.g. "budget")
- **TYPE column:** a small rounded pill/chip badge — light gray background, dark text, `font-size: 12px`, `padding: 3px 10px`, `border-radius: 999px` — text in uppercase (e.g. "TEXT", "DATE", "DROPDOWN")
- **REQUIRED column:** a small rounded pill/chip badge — if required: green background (`#DCFCE7`), green text (`#16A34A`), label "REQUIRED" in uppercase `font-size: 11px` — if not required: light gray badge, gray text, "OPTIONAL"
- **ACTIONS column:** pencil/edit icon + trash/delete icon, right-aligned, muted gray color, `font-size: 16px`, `gap: 12px` between icons

**Empty state** (when no rows):
- Centered in the table body area
- Text: "No custom fields found for this entity." — `font-size: 14px`, muted gray
- No icon needed

**Horizontal scrollbar** at bottom of table if content overflows — keep the existing scroll behavior

---

### Pre-populate with Sample Data Rows

Show these three rows by default to demonstrate the design (same as reference image):

| Label | Key | Type | Required |
|---|---|---|---|
| Patient ID | patient_id | TEXT | REQUIRED |
| Insurance Provider | insurance_provider | DROPDOWN | OPTIONAL |
| Appointment Date | appointment_date | DATE | REQUIRED |

---

### "Add Field" Modal — Redesign to Match Reference

When "+ Add Field" is clicked, open a centered modal matching the reference screenshots exactly:

**Modal dimensions:** `max-width: 560px`, `height: auto` (fits content), centered on screen, white background, `border-radius: 16px`, subtle drop shadow, dark backdrop

**Modal header:**
- Title: **"Create Custom Field"** — `font-size: 20px`, `font-weight: 700`
- Subtitle: *"Define a new custom field for your organization"* — `font-size: 13px`, muted gray
- NO close × button visible in reference — omit or place subtly top-right

**Section label inside modal:**
- A small icon (list/form icon) + text **"FIELD CONFIGURATION"** in uppercase — `font-size: 11px`, `font-weight: 600`, muted gray, `letter-spacing: 0.08em`
- Full-width divider line below it

**Form fields:**

1. **Label** (required, full width)
   - Red asterisk `*` after label text
   - Text input, placeholder: *"e.g. Budget"*
   - Standard rounded input, `border: 1px solid #E5E7EB`, `border-radius: 8px`, `padding: 10px 14px`, `font-size: 14px`

2. **Key + Type** (side by side, 50/50)
   - **Key** (required): text input, placeholder: *"e.g. budget"*, helper text below in blue/muted: *"Unique identifier for API usage (auto-generated)."* — `font-size: 11px`
   - **Type** (required): dropdown select, default value "Text", same input styling with a chevron `▾` on the right

   **Type dropdown options** (shown when opened, matching reference):
   - Text (default)
   - Number ← highlighted blue when hovered
   - Boolean (Yes/No)
   - Date
   - Select (Dropdown)

   Dropdown option list: white background, `border-radius: 8px`, subtle shadow, each option `padding: 10px 14px`, `font-size: 14px`, hover state: blue background + white text

3. **"Mark as required field"** checkbox row:
   - Standard checkbox (unchecked by default), square with rounded corners
   - Label: "Mark as required field" — `font-size: 14px`, dark text
   - Full width, below the Key+Type row

**Modal footer:**
- Two buttons right-aligned: **"Cancel"** (ghost/text button, gray text) + **"Create Field"** (dark filled pill button, same style as page header Add Field button — dark navy, white text, `border-radius: 999px`)
- `gap: 12px` between buttons
- Thin top divider separating footer from form

---

### Design Consistency Rules

- Use only existing color tokens — the dark button color must match whatever dark color the design system uses (likely `#111827` or `#1E293B`)
- All `border-radius`, `font-family`, `shadow` values from existing Figma design system
- The tab switcher, table card, and modal must all use the same border-radius and shadow style as other cards in the Settings page
- Do not change the Settings page sidebar, header ("Settings" title, "Healthcare Org" dropdown), or any other section
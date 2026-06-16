Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Update "Manage Team Member" — Tab Bar Width Fix + Redesign Calendar/Availability/Days Off Sections

**Location:** Settings → Team → **"Manage Team Member"** page

---

## CHANGE 1 — Tab Bar Width: Start from Right Edge of Sidebar

**Current problem:** Tab bar starts from the left edge of the full page

**Fix:**
- Tab bar must start exactly where the left sidebar ends
- Left edge of tab bar = right edge of the collapsed sidebar (same x-position as the main content area)
- Tab bar spans: **from sidebar right edge → full right of page**
- It does NOT overlap or sit on top of the sidebar
- This matches the main content area width exactly — same left margin as the page header and content below

---

## CHANGE 2 — "Calendar" Tab: Redesign Calendar Integration Section

**Reference: Images 5 & 6**

**Remove** the current Calendar Integration card (simple green bordered card with Google Calendar + Connected badge + Disconnect button)

**Replace with this full layout:**

### Top area — Hero row:
- Left: Calendar illustration — a stylized calendar icon/card, rounded corners, blue gradient background (`#1D4ED8` to `#3B82F6`), white calendar grid icon, size ~100×100px
- Right of illustration: text block
  - Heading: **"Sync with your Calendar"** — font size 20px, font-weight 700, color `#111827`
  - Subtext: *"Connect your calendar accounts to automatically sync appointments and prevent double bookings across all your platforms."* — font size 13px, color `#6B7280`, max-width 380px

---

### "Connected Accounts" section:

- Section label: **"Connected Accounts"** — font size 14px, font-weight 600, color `#111827`, margin-bottom 12px

**Connected account row (Google — already connected):**
- Card: border `1px #E5E7EB`, border-radius 10px, padding 14px 16px, full width
- Left: circle avatar 36×36px, fill `#2563EB`, white letter **"G"**, font size 16px, font-weight 700, border-radius 50%
- Center:
  - **"Google"** — font size 14px, font-weight 600, color `#111827`
  - `john.smith@healthcare.com` — font size 12px, color `#6B7280`
- Right: **"Disconnect"** text button — color `#EF4444`, font size 13px, font-weight 500, no border

**Connected account row (Outlook — already connected):**
- Same card style
- Circle: fill `#0078D4` (Microsoft blue), letter **"O"**
- **"Outlook"** + `john.smith@outlook.com`
- Right: **"Disconnect"** red text button

---

### "Connect New Account" section:

- Divider: `1px #F3F4F6`, margin 16px 0
- Label: **"Connect New Account"** — font size 13px, color `#9CA3AF`, centered, margin-bottom 12px

**Two buttons side by side (50/50 split):**

Left button — Microsoft:
- Border `1px #E5E7EB`, border-radius 10px, background white, padding 12px 16px
- Microsoft Windows logo icon (colored 4-square) 20px + **"Microsoft"** text — font size 14px, color `#111827`, font-weight 500
- Hover: background `#F9FAFB`

Right button — Apple iCloud:
- Same style
- Apple logo icon (black  ) 20px + **"Apple iCloud"** — font size 14px, color `#111827`

---

### Privacy notice (bottom):
- Card: background `#EFF6FF`, border `1px #BFDBFE`, border-radius 10px, padding 14px 16px
- Left: lock icon 🔒 in blue circle 32×32px, fill `#EFF6FF`, icon `#2563EB`
- Text:
  - **"Your Privacy is Protected"** — font size 13px, font-weight 600, color `#1D4ED8`
  - *"We only sync appointment availability. Your personal calendar events and data remain completely private and secure."* — font size 12px, color `#374151`

---

## CHANGE 3 — "Availability" Tab: Redesign Weekly Availability Section

**Reference: Images 2 & 3**

**Remove** the current availability layout (checkbox rows with inline time inputs)

**Replace with this layout:**

### Day sections — one per active day, stacked vertically:

Each day block:
- Day name heading: **"Monday"**, **"Tuesday"** etc. — font size 15px, font-weight 600, color `#111827`
- Below heading: one or more time slot pills + trash icon per slot
- Bottom separator: `1px #E5E7EB` after each day block

**Time slot pill:**
- Background `#EFF6FF` (light blue), border-radius 20px, padding 6px 14px
- Left: clock icon `#2563EB`, 14px
- Text: e.g. **"9:00 AM - 5:00 PM"** — font size 13px, color `#2563EB`, font-weight 500
- Right (outside pill): trash delete icon `#EF4444`, 14px — on hover only

**Multiple slots per day** (e.g. Wednesday has two slots, Friday has four) — slots stack vertically with 8px gap

**Sample data:**
- Monday: `9:00 AM - 5:00 PM`
- Tuesday: `9:00 AM - 5:00 PM`
- Wednesday: `3:00 PM - 4:00 PM` + `9:00 AM - 10:00 AM`
- Thursday: `9:00 AM - 8:00 PM`
- Friday: `10:15 AM - 11:15 AM` + `12:00 PM - 1:00 PM` + `9:00 AM - 10:00 AM` + `8:15 AM - 9:15 AM`
- Saturday: `9:00 AM - 5:00 PM`
- Sunday: *(no slots — omit or show "Unavailable" in gray)*

**"Add Time Slots" button (bottom, full width):**
- Fill: `#2563EB`, white text, **"Add Time Slots"**
- Font size 14px, font-weight 600, border-radius 10px, height 48px, full width
- Margin-top 20px

---

## CHANGE 4 — "Days Off" Tab: Redesign Days Off Section

**Reference: Image 4**

**Remove** the current Days Off layout (date picker + orange card rows)

**Replace with this table layout:**

### Table header row:
- Background white, border-bottom `1px #E5E7EB`
- 3 columns:
  - **"Date"** — `#2563EB`, font size 13px, font-weight 600, width ~40%
  - **"Duration"** — `#2563EB`, font size 13px, font-weight 600, width ~40%
  - **"Repeat"** — `#2563EB`, font size 13px, font-weight 600, width ~20%

### Table data rows (separated by `1px #E5E7EB`):

**Row 1:**
- Date: **"Oct 25, 2023"** — `#2563EB`, font size 13px, font-weight 500
- Duration: **"Full Day"** pill — border `1px #D1D5DB`, border-radius 20px, padding 3px 12px, font size 12px, color `#374151`
- Repeat: empty
- Right: trash icon `#EF4444`, 14px

**Row 2:**
- Date: **"Sep 25, 2023"** — `#2563EB`
- Duration: `02:00 - 04:00` on line 1 + `15:00 - 04:00` on line 2 — font size 12px, color `#374151`
- Repeat: green filled checkmark circle `#10B981`, 20×20px
- Right: trash icon

**Row 3:**
- Date: **"Feb 25, 2023"** — `#2563EB`
- Duration: `06:00 - 07:30` — font size 12px, color `#374151`
- Repeat: empty
- Right: trash icon

**"Add Day Off" button (bottom, full width):**
- Fill: `#2563EB`, white text, **"Add Day Off"**
- Font size 14px, font-weight 600, border-radius 10px, height 48px, full width
- Margin-top 20px

---

## NO CHANGES TO:

- Left sidebar (icons only, collapsed) — untouched
- Page header row (`← Manage Team Member` + Cancel + Save Changes) — untouched
- Services tab content — untouched
- Permissions tab content — untouched
- Profile card (left column: avatar, John Smith, email, status badges) — untouched

---

## Summary of All Changes:

| # | Change | Details |
|---|---|---|
| 1 | Tab bar left edge | Starts at sidebar right edge, not page left edge |
| 2 | Calendar tab content | Hero + Connected Accounts + Connect New + Privacy notice |
| 3 | Availability tab content | Day sections with pill slots + Add Time Slots button |
| 4 | Days Off tab content | 3-column table (Date/Duration/Repeat) + Add Day Off button |
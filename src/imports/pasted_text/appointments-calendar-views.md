Looking at all 4 screenshots — the Day, Week, Schedule views exist in your reference (Bitrix24 calendar) and you have the Edit Appointment form data. Here's the precise prompt:

---

### Figma Make Prompt: Appointments Calendar — Implement Day, Week & Schedule View Functionality

---

### CONTEXT

The Appointments calendar currently only has a working Month view. The `Day`, `Week`, and `Schedule` tab buttons exist in the tab bar but show "View not yet implemented" placeholders. Implement all 3 views using the existing appointment data. The tab bar, header, search bar, stat pills, and sidebar remain unchanged.

**Existing appointment data to use across all views:**
- James Wilson · 09:00 · 12-05-2026 · Initial Consultation 60min · John Smith · james.w@example.com · +1(555)123-4567 · Notes: First-time patient
- Oliver Davis · 14:00 · 13-05-2026
- Sophia Martinez · 11:00 · 14-05-2026
- (May 18 = today, no appointments)

---

### CHANGE 1 — DAY VIEW

When user clicks **Day** tab, show a single-day time-grid layout:

**Header row:**
- Left: Full date `May 18, 2026` in 20px bold + `Monday` in 13px grey below it
- Right: `Day ▾` view label + `‹ Today ›` navigation — same as reference Image 1

**Time grid:**
- Left column: hourly time labels `09:00 · 10:00 · 11:00...` through `18:00` in 11px `#9CA3AF` grey, right-aligned, 40px wide
- Right column: single day column, full remaining width, white background
- Horizontal grid lines at each hour: `1px solid #F3F4F6`
- Current time indicator: red horizontal line `#EF4444`, 1px, full width, with current time label `11:56` in red on the left — positioned at the correct hour slot
- Today's column background: very light blue tint `#EFF6FF`

**Appointment block rendering (for days that have appointments):**
- Each appointment as a filled block:
  - Background: `#DBEAFE` light blue, left border `3px solid #1A73E8`
  - Height proportional to duration (60min = 60px height)
  - Content inside block: time range `09:00 – 10:00` in 11px grey + patient name in 13px bold dark
  - 4px border radius, 8px padding inside

**Empty day (today May 18):** show time grid with red current time line only, no appointment blocks

---

### CHANGE 2 — WEEK VIEW

When user clicks **Week** tab, show a 7-column time-grid layout:

**Header row:**
- Left: Month name `May` in 16px bold
- Right: `Week ▾` label + `‹ Today ›` navigation
- Below header: 7 column headers `Sun 17 · Mon 18 · Tue 19 · Wed 20 · Thu 21 · Fri 22 · Sat 23`
  - Today (Mon 18): date number in filled cyan circle `#06B6D4`, white text — matching reference Image 2
  - Other dates: plain dark text

**Time grid:**
- Same hourly row structure as Day view
- 7 equal-width columns, one per day
- Horizontal lines every hour across all 7 columns: `1px solid #F3F4F6`
- Vertical column dividers: `1px solid #F3F4F6`
- Today column (Mon 18): light blue tint background `#EFF6FF`
- Red current time indicator line spanning all 7 columns

**Appointment blocks:**
- Same styling as Day view blocks (blue bg, blue left border, time range + name)
- Place James Wilson block on Tue 12 column at 09:00 slot (60px tall)
- Place Oliver Davis block on Wed 13 at 14:00 slot
- Place Sophia Martinez on Thu 14 at 11:00 slot
- Week shown = May 17–23 (current week), so May 12–14 appointments are in the previous week — when navigating `‹` back one week, those blocks appear correctly

---

### CHANGE 3 — SCHEDULE VIEW

When user clicks **Schedule** tab, show a **list-style agenda view**:

**Header:**
- Left: `May, 2026` in 20px bold
- Right: `Schedule ▾` + `‹ Today ›` navigation
- Right panel: mini month calendar widget (same as reference Image 3) — 200px wide, positioned top-right of the schedule content area, showing May 2026 with today (18) highlighted in cyan circle

**Schedule list (left area, remaining width):**
- Group appointments by date, each date as a section:

```
──── May 12, Monday ────────────────
  09:00 – 10:00   James Wilson
                  Initial Consultation · John Smith

──── May 13, Tuesday ───────────────
  14:00 – 15:00   Oliver Davis

──── May 14, Wednesday ─────────────
  11:00 – 12:00   Sophia Martinez
```

- Date section header: `1px solid #E5E7EB` line left + right, date text `May 12, Monday` in 12px `#6B7280` grey centered in line
- Each appointment row: `56px` height, white bg, `1px solid #F3F4F6` bottom border
  - Time column (80px): `09:00 – 10:00` in 12px `#6B7280`
  - Color dot (8px circle, `#1A73E8`) 
  - Patient name in 14px bold `#111827`
  - Sub-line: service name + provider in 12px `#9CA3AF`
- Hover state on appointment row: `#F9FAFB` background

**Empty state (no appointments in visible range):**
- Centered illustration placeholder + `There are no appointments` in 16px grey bold + `Book Appointment` button in MantraAssist blue below it

---

### CHANGE 4 — Tab Switching Behaviour

- Clicking each tab switches the entire calendar content area below the search bar row to the corresponding view
- Active tab stays highlighted (filled blue pill or blue underline — match existing Month tab active style)
- The `‹ Today ›` navigation in each view moves by 1 day (Day view), 1 week (Week view), or 1 month (Schedule view) per click
- Current month/date shown in the view header updates accordingly on navigation

---

### DO NOT CHANGE

- Month view (already working)
- Sidebar, page title, stat pills, search bar, All Employees filter, Calendar/List toggle, Book Appointment button
- Edit Appointment form/drawer
- Any other section of the design

---

**Attach all 4 screenshots** — Day view reference, Week view reference, Schedule view reference, and the Edit Appointment form — so Figma Make has the exact layout pattern and data structure for each view.
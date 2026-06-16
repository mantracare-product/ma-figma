Here's the precise prompt:

---

### Figma Make Prompt: Appointments List View — Redesign as Reference Card Grid

---

### CONTEXT
Replace the current table-based list view entirely with a **2-column card grid layout** matching the MantraCare reference design (Image 1). This applies when the **List (☰) toggle** is active. Keep all existing data.

---

### CHANGE 1 — Overall Layout

- Replace the table with a **2-column card grid**, 12px gap between columns, 16px gap between rows
- Cards fill the full content width equally — each card ~50% width minus gap
- Grid sits below the existing filter tabs (`All · Upcoming · Pending · Done`) and `Appointments with experts · Total N` label row — keep those unchanged
- Content area background: light grey `#F9FAFB`

---

### CHANGE 2 — Appointment Card Design

Each appointment = one card. White background, `1px solid #E5E7EB` border, 12px border radius, 16px padding, subtle shadow `0 2px 8px rgba(0,0,0,0.06)`.

**Card layout (top to bottom):**

**Row 1 — Provider info + status indicator:**
- Left: circular image placeholder (48px diameter, grey `#E5E7EB` circle with person silhouette icon — no real images, placeholder only) 
- Right of image: provider name in 15px bold `#111827` + service/type in 13px MantraAssist blue `#1A73E8` below name
- Bottom-left of image: small circular chat/video icon badge (16px, blue bg, white icon)
- Far right: status dot — blue filled circle `#1A73E8` for upcoming/pending, green checkmark circle `#22C55E` for completed/done

**Row 2 — Date & Duration:**
- Calendar icon `📅` + date `May 12, 2026 at 09:00` in 12px `#6B7280` grey
- Clock icon `🕐` + duration `60 min` in 12px `#6B7280` grey
- Both on same line, 16px gap between them

**Row 3 — Star rating (done/completed cards only):**
- 5 star icons — filled stars `#F59E0B` amber for rating count, empty stars `#D1D5DB` grey for remainder
- `Session rated` label in 12px `#6B7280` beside stars
- Hide this row entirely for upcoming/pending cards

**Row 4 — Action buttons:**

For **upcoming cards needing confirmation** (status = pending accept):
- Full-width blue button `✓ Accept` — `#1A73E8` bg, white text, 36px height, 8px radius
- Full-width white button `✕ Cancel` — white bg, `1px solid #E5E7EB` border, `#374151` text, same size
- Small italic note below: `*Provider requested appointment accept to confirm` in 11px `#9CA3AF` grey

For **upcoming confirmed cards** (status = scheduled):
- Two equal-width buttons side by side:
  - `📅 Reschedule` — white bg, `1px solid #E5E7EB` border, 36px height, dark text
  - `✕ Cancel` — white bg, `1px solid #E5E7EB` border, same size

For **completed/done cards:**
- No action buttons — just show star rating row

---

### CHANGE 3 — Data Mapping to Cards

Map existing appointments to cards with correct action states:

| Patient | Provider | Service | Date | Duration | Status | Actions |
|---------|----------|---------|------|----------|--------|---------|
| James Wilson | John Smith | Initial Consultation | May 12, 2026 · 09:00 | 60 min | Pending Accept | Accept + Cancel + note |
| Emma Brown | Sarah Johnson | Follow-up Visit | May 12, 2026 · 10:30 | 30 min | Scheduled | Reschedule + Cancel |
| Oliver Davis | John Smith | X-Ray Imaging | May 13, 2026 · 14:00 | 20 min | Scheduled | Reschedule + Cancel |
| Sophia Martinez | Dr. Robert Martinez | Dental Cleaning | May 14, 2026 · 11:00 | 45 min | Scheduled | Reschedule + Cancel |

---

### CHANGE 4 — Filter Modal on "All Employees" Click

When clicking the **All Employees** dropdown/filter button in the top bar, open a **modal popup** matching Image 2 exactly:

**Modal:**
- White background, 12px border radius, 480px width, centered on screen
- Background overlay: `rgba(0,0,0,0.4)`
- Header: `Filter Appointments` in 18px bold + ✕ close button top-right

**3 filter fields stacked vertically, 16px gap:**

1. **Date** — dropdown, default: `Week`
   - Options: Today · Week · Month · Custom Range

2. **Provider Name** — dropdown, default: `All Providers`
   - Options: All Providers · John Smith · Sarah Johnson · Dr. Robert Martinez · Emily Davis

3. **Session Status** — dropdown, default: `All`
   - Options: All · Scheduled · Pending · Completed · Cancelled

**Each dropdown:**
- White bg, `1px solid #CBD5E1` border, 48px height, 8px radius
- Label text `#374151` 14px, chevron `▾` right-aligned in `#1A73E8`

**Bottom:**
- Full-width `Apply Filters` button — cyan/blue gradient `#06B6D4` to `#1A73E8`, white text 15px bold, 48px height, 8px radius

---

### CHANGE 5 — Tab Filter Counts Update

When filter tabs are clicked:
- **All** → show all 4 cards
- **Upcoming** → show cards with Reschedule+Cancel buttons (Emma Brown, Oliver Davis, Sophia Martinez) = 3
- **Pending** → show cards with Accept+Cancel buttons (James Wilson) = 1
- **Done** → show empty state: centered calendar icon + `No completed appointments yet` in 14px grey

---

### DO NOT CHANGE
- Calendar view (grid icon toggle)
- Stat pills row
- Search bar, Book Appointment button
- Sidebar navigation
- Any other section or page

---

**Attach both reference screenshots** (card grid view + filter modal) so Figma Make has the exact visual target for card layout, button styles, modal design, and color scheme.
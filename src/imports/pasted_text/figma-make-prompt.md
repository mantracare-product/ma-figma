Here's the precise Figma Make prompt:

---

### Figma Make Prompt: Kanban & List View Fixes

---

### CHANGE 1 — Kanban: Expand to All Individual Stages (15 Columns)

**Delete** the current 5 category columns (Patient Intake, Follow-up Calls, etc.) and replace with **15 individual stage columns** in this exact order, left to right:

1. Initial Contact *(Patient Intake)*
2. Insurance Verify *(Patient Intake)*
3. Schedule Appointment *(Patient Intake)*
4. Post-Visit Check *(Follow-up Calls)*
5. Medication Reminder *(Follow-up Calls)*
6. Initial Contact *(Billing Support)*
7. Billing Inquiry *(Billing Support)*
8. Issue Resolution *(Billing Support)*
9. Payment Reminder *(Billing Support)*
10. Initial Contact *(Appointment Scheduling)*
11. Slot Selection *(Appointment Scheduling)*
12. Confirmation *(Appointment Scheduling)*
13. Initial Contact *(Insurance Verification)*
14. Document Check *(Insurance Verification)*
15. Verification *(Insurance Verification)*

To differentiate duplicate "Initial Contact" column names, append the parent category in small grey subtext **below** the column header title:
- e.g., **"Initial Contact"** (bold white, 14px) with `Patient Intake` in 10px grey/cyan text beneath it inside the same dark navy header bar

Column width: **220px**. Gap between columns: **12px**. Board is **horizontally scrollable**.

---

### CHANGE 2 — Kanban Card Redesign

Remove the sub-stage label line from cards (no category heading text on card). Replace with these labeled fields:

**Card layout (top to bottom):**

**Row 1 — Call direction icon + Client name:**
- Incoming: green phone with inward arrow | Outgoing: blue phone with outward arrow
- Bold client name 13px dark navy

**Row 2 — Status badge** (Completed = green, Pending = orange, Failed = red pill)

**Row 3 — Two labeled data fields side by side:**
- `Call Duration` label in 10px grey caps + value in 12px dark (e.g., `4:32`)
- `Last Call` label in 10px grey caps + value in 12px dark (e.g., `2024-04-13 14:30`)
- If no duration, show `—`

**Row 4 — Quick action icons (right-aligned, 16px, horizontal row):**
- 👁 Eye — View
- 📞 Phone (green on hover) — Call Now
- ⏹ Stop circle (red on hover) — Stop Call

**Remove the calendar/schedule icon entirely from all cards.**

Card: white bg, 8px radius, 12px padding, `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`, 12px gap between cards in a column.

---

### CHANGE 3 — Kanban: Replace Scroll with Client-List Style Arrow Buttons

Remove the current horizontal browser scrollbar at the bottom of the Kanban board. Replace with:
- A **left arrow button** `‹` pinned to the left edge of the board
- A **right arrow button** `›` pinned to the right edge of the board
- Same style as used in the Clients section carousel: circular white buttons, `#1C2B4A` border, dark navy icon, subtle drop shadow
- Buttons sit vertically centered against the column cards area
- Clicking scrolls the board **one column width (220px)** left or right

---

### CHANGE 4 — List View: Stage Dropdown — Show Only Selected Stage Name in Segment Box

Currently the stage dropdown shows the full grouped list as a long open panel. Fix this:

**The progress bar segment boxes are clickable** — clicking any segment in the bar highlights that segment's stage as selected and **closes the dropdown** showing only that stage name as a single label above the bar.

**Dropdown behaviour fix:**
- The dropdown must be a **compact floating popover**, not a full-height panel
- Popover width: 220px, white bg, 8px border radius, subtle shadow
- Inside popover: grouped list with **bold category header** (e.g., "Patient Intake") and sub-items indented beneath in 12px grey text
- Currently active stage is highlighted with blue left border + light blue bg on that row
- Hovering a stage highlights it in `#F0F4FF`
- Clicking a stage: closes popover, updates the progress bar fill to that stage's position, updates the stage label text above the bar
- The stage label above the bar shows **only the sub-stage name** (e.g., "Initial Contact", not "Patient Intake: Initial Contact")
- The progress bar segments fill up to and including the selected stage's position out of 15

---

### CHANGE 5 — Move View Toggle to Top Bar Left of Search

**Remove** the current view toggle from its position inside the card/content area. **Place it in the top bar row**, directly to the **left of the search bar**, in the same horizontal line.

- Toggle group: `☰ List View` | `⊞ Kanban` — same styling as before (active = MantraAssist blue fill, inactive = white with grey border)
- The search bar shrinks slightly to accommodate, remaining right-aligned in the bar
- Top bar row layout left to right: `[List View] [Kanban]` → `[Search bar ————————]`

---

### CHANGE 6 — Incoming/Outgoing Call Icons

Replace all current call direction icons throughout List View and Kanban with:

**Incoming:** Phosphor-style `PhoneIncoming` icon — green `#22C55E`, arrow curves inward toward handset bottom-left
**Outgoing:** Phosphor-style `PhoneOutgoing` icon — blue `#1A73E8`, arrow curves outward away from handset top-right

Size: 16×16px in cards, 14×14px in list view rows. Vertically centered with client name text. 6px right margin before the name.

---

**Attach all 4 screenshots as reference** — Figma Make needs to see the current Kanban card layout, the scrollbar, the broken stage dropdown, and the top bar position to apply all 6 changes correctly.
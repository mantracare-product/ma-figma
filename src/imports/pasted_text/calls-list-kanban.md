Here's a detailed, precise prompt for Figma Make:

---

## Figma Make Prompt: Calls Section — List View + Kanban View with Stage Pipeline

---

### CONTEXT

You are updating the **Calls section** of the MantraAssist healthcare dashboard. The current design shows a simple table. You need to add two views: **List View** (default) and **Kanban View**, with a toggle in the top bar.

---

### CHANGE 1 — Add View Toggle to the Top Bar

In the top bar above the calls table (where the search bar currently sits), add a **View Toggle button group** on the left side of the search bar row.

- Two buttons side by side: **"List View"** (icon: ☰) and **"Kanban View"** (icon: ⊞)
- Default active state: **List View** — highlighted with the MantraAssist blue (`#1A73E8`) background, white text
- Inactive state: white background, grey border, grey text
- Button size: 36px height, 110px width each, 8px border radius
- Place this toggle group on the **left side** of the search bar row, before the search input

---

### CHANGE 2 — List View (Default) — Add Stage Progress Bar Column

In the existing calls table, update the **STAGE column** to show a **visual pipeline progress bar**, exactly like the CRM list view in the reference.

Each row's Stage cell should contain:

**Top line:** Stage label text (e.g., "Patient Intake: Initial Contact") in small 11px grey text

**Bottom line:** A horizontal segmented progress bar made of **equal-width pill/rectangle segments** in a single row. Total segments = **15** (total number of stages across all categories). Fill segments from left to right based on stage position. Filled segments = MantraAssist blue (`#1A73E8`). Unfilled segments = light grey (`#E0E0E0`). Each segment: 12px wide, 4px height, 2px gap between, 2px border radius.

**Stage order for progress calculation (left = earliest, right = latest):**
1. Patient Intake: Initial Contact
2. Patient Intake: Insurance Verify
3. Patient Intake: Schedule Appointment
4. Follow-up Calls: Post-Visit Check
5. Follow-up Calls: Medication Reminder
6. Billing Support: Initial Contact
7. Billing Support: Billing Inquiry
8. Billing Support: Issue Resolution
9. Billing Support: Payment Reminder
10. Appointment Scheduling: Initial Contact
11. Appointment Scheduling: Slot Selection
12. Appointment Scheduling: Confirmation
13. Insurance Verification: Initial Contact
14. Insurance Verification: Document Check
15. Insurance Verification: Verification

**Clicking any row's stage cell** opens an inline dropdown showing all 15 stages grouped by category with bold category headers (Patient Intake, Follow-up Calls, Billing Support, Appointment Scheduling, Insurance Verification). Admin selects a new stage to update it. The progress bar updates immediately on selection.

---

### CHANGE 3 — Kanban View

When the user clicks **"Kanban View"** toggle, the table disappears and a **horizontal scrollable Kanban board** appears below the top bar.

**Column structure:** One column per stage group category (5 columns total):
- Patient Intake
- Follow-up Calls
- Billing Support
- Appointment Scheduling
- Insurance Verification

**Column header styling:**
- Dark navy background (`#1C2B4A`), white bold text, 14px
- Show count badge (number of cards) in a cyan pill on the right of the header
- Show total (e.g., count of calls) below header
- Column width: 260px, with 16px gap between columns
- Columns are horizontally scrollable

**Each patient card inside a column contains:**
- Client name (bold, 13px, dark)
- Sub-stage label (e.g., "Initial Contact") in small grey text, 11px
- Status badge: "Completed" (green pill), "Pending" (orange pill) — same styling as existing table
- Date & time in grey, 11px
- Duration in grey, 11px
- Two action icons at bottom right: 👁 (view) and 📞 (call) — same as existing table
- Card: white background, 8px border radius, 12px padding, subtle box shadow `0 2px 8px rgba(0,0,0,0.08)`

**Drag and Drop:**
Cards are **draggable between columns**. When dragging:
- Card gets a slight rotation (3deg) and drop shadow increase
- Target column highlights with a blue dashed border
- On drop, card moves to the new column and its stage updates to the first sub-stage of that category
- Show a small toast notification: "Stage updated to [Category Name]"

**"+ Quick Add"** button at the bottom of each column in light grey dashed style.

---

### STYLE CONSISTENCY

- Keep the existing MantraAssist sidebar, logo, and nav unchanged
- Top bar with search and new view toggle remains the same height
- All fonts, colors, and icon styles must match the existing design (MantraAssist blue `#1A73E8`, navy `#1C2B4A`, white cards, grey text)
- Do not change any other section (Overview, Clients, Appointments, etc.)

---

This prompt covers all the changes concisely. A few tips when running it in Figma Make:

- Run **Change 1 first** (view toggle), confirm it renders, then run Changes 2 and 3 separately to stay within credit limits
- If Figma Make has a token/credit limit, split into two prompts: one for List View changes, one for Kanban View
- Attach **all 4 reference images** when submitting so it has visual context for both the existing design and the target CRM-style layout
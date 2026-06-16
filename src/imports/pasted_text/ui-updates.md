Here is a detailed implementation prompt for all the changes:

---

## UI Update Prompt: Web Forms — Targeted Changes

### 1. KPI Stat Cards → Thin Capsule Style

Replace the current boxy stat cards with **thin horizontal capsule/pill cards**:

- Each card should be a single horizontal row, not a tall box
- Use a pill/capsule shape: `rounded-full` or `rounded-2xl` with very little vertical padding (e.g. `py-2 px-5`)
- Layout inside each capsule: label on the left (small, uppercase, muted) → big bold number in the middle → subtext on the right (muted, small)
- **Remove the progress bar entirely** from all four cards
- Keep the same 4-column grid layout but each card is now slim/horizontal
- Example capsule structure:
```
[SUBMISSIONS — 7D]  47  vs prior 7d: 31
```
- Use `bg-white border border-border shadow-sm` styling, consistent with the rest of the app

---

### 2. Forms Table — Add "Actions" Column Header

In the Forms sub-tab table (`formsSubTab === "forms"`), the last column currently has a `...` menu button with **no header text**. Add the column header label **"Actions"** to that `<th>` cell, styled identically to the other column headers (same `text-xs font-semibold uppercase tracking-wide` with `color: #64748B`).

---

### 3. Form Click → Side Drawer (replaces full-page detail view)

When the user clicks a form name or "View details" from the `...` menu, instead of navigating to a separate full-page `FormDetailView`, open a **right-side drawer** that slides in over the current page.

**Drawer structure:**

- Fixed right panel, `max-w-[560px]`, full viewport height, white background, `shadow-2xl`, z-index above page content
- Semi-transparent dark backdrop (`bg-black/40`) behind it; clicking backdrop closes the drawer
- **Top bar** of the drawer:
  - Form name (bold, `DM Sans`)
  - `StatusBadge` (Live/Draft pill)
  - "Last edited [date]" in muted small text
  - `X` close button on the far right
- **Two tabs** below the top bar:
  - **Overview** (default active)
  - **Preview**
- Tab styling: same secondary sub-tab style as Forms/Intake Flows tabs (thin underline, `text-xs`, less padding)

**Overview Tab content:**

Structured in clean `div` sections (not cards within cards — use a flat hierarchy with dividers between sections):

Section 1 — Basic Info:
- Form description text
- "Form Fields: N" badge
- Created by (avatar initials + name)
- Created at date

Section 2 — Share & Embed (replaces the current green/amber banner logic):
- If Live: show a **green-tinted section** with:
  - "Your form is live" heading + subtext
  - URL row: `https://app.myaifrontdesk.com/forms/form-{id}` with a **Copy link** button
  - Embed code block (monospace, gray bg) with **Copy embed code** button
  - **Email to developer** text link
  - **"My form is embedded"** checkbox
  - The Create → Publish step indicators
- If Draft: show an **amber-tinted section** with "This form is a draft" and a **Publish form** button
- Use proper `div` hierarchy: outer wrapper → header row → URL row → code block row. Each as its own clearly separated sub-section inside the green/amber tinted container. No nested card-in-card look. Blue links, green accents for live state, proper spacing.

**Preview Tab content:**

- Render the form fields interactively using the existing field rendering logic (same inputs, textareas, selects as in `FormDetailView`'s field list but as actual interactive inputs inside the drawer)
- Show form title at top
- Show all fields in order with labels, placeholders, required asterisks
- Non-submitting (no submit button or a disabled one)
- **"Edit" button** in the top-right of the Preview tab (or as a persistent button in the drawer header) — clicking it calls the same `handleEdit(form)` function that the `...` menu's Edit option calls, navigating to `/web-forms/builder`

Remove the old `view === "detail"` branch that renders `FormDetailView` as a full page. The `FormDetailView` component can remain for now but should no longer be the primary navigation target when clicking a form row.

---

### 4. Intake Flows — Remove "Groups" Everywhere

Remove all Groups-related UI from the Intake Flows feature:

- **Flows list table**: remove the `Groups` column header and cell entirely from the flows table
- **Flow detail view** (`activeFlow !== null`): remove the entire "Associated Groups" card/section
- **Create Flow modal**: remove the "Which group(s) should use this flow?" checkbox section entirely
- Keep the `groups` field on the `IntakeFlow` data type and in `INITIAL_FLOWS` data (no data model changes needed), just remove all UI that displays or edits it
- After removing the Groups column from the flows table, the columns should be: `Name` · `Forms` · `Created On` · actions (`...`)

---

### 5. Preview Overlay — Move "Next" Button to Top Bar

In the full-screen preview overlay (`previewOpen && activeFlow`), currently:
- Top bar has: `Back` (left) · step counter (center) · `Close Preview` (right)
- Bottom bar has: `Next` / `Finish Preview` button

**Change:**
- Remove the bottom bar entirely
- Move the `Next` / `Finish Preview` button into the **top bar**, placed **before** (to the left of) the `Close Preview` button
- Top bar layout becomes: `Back` (left) · step counter (center) · `[Next/Finish Preview]` `[Close Preview X]` (right side, in a flex row with a small gap)
- The `Next`/`Finish Preview` button keeps all its existing logic (disabled state, click handler)
- The `Back` button stays on the left, disabled on step 0
- No bottom bar / footer remains in the preview overlay
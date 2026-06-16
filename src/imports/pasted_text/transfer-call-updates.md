Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Transfer Call — 4 Updates

---

## UPDATE 1 — Advanced Settings (Expanded State)

**Reference: Image 1**

**Location:** Inside the "Add Call Transferring Workflow" modal → below Voice Response field → **"Advanced Settings"** row

### Current state:
"Advanced Settings" is a collapsed text link with a `▶` right arrow — clicking does nothing visually.

### Change:
Make "Advanced Settings" a fully functional **accordion/expand row.**

**Collapsed state:**
- Row: **"Advanced Settings"** text in `#2563EB`, font size 13px, font-weight 600
- Right side: **chevron-down `▼`** icon in `#2563EB` (NOT a right arrow)
- Top border: `1px #E5E7EB` above this row

**Expanded state (on click):**
- Chevron rotates to **`▲`** (pointing up)
- Below the row, reveal the **"Call Transfer Type"** section:

**Call Transfer Type field:**
- Label: **"Call Transfer Type"** — color `#9CA3AF` (gray), font size 12px, font-weight 500, uppercase or regular, NOT blue
- Two radio button options side by side:
  - **● Cold Transfer** — radio filled blue `#2563EB` (selected by default) + `ⓘ` info icon after label
  - **○ Hot Transfer** — radio unfilled/outline + `ⓘ` info icon after label
- Radio button size: 16×16px, selected fill `#2563EB`
- Label text: font size 13px, color `#374151`
- Spacing between options: 24px gap
- This content sits inside the same Scenario card, padded 16px from left

---

## UPDATE 2 — Toggle OFF State: Collapsed/Wrapped Card

**Reference: Image 2**

**Location:** Scenario card displayed after submit → On/Off toggle

### Current ON state (already built):
Toggle is blue `#2563EB` pill, label `On`, full card body expanded showing all fields.

### New OFF state (when toggle is switched off):

**Toggle visual change:**
- Toggle pill changes to **red `#EF4444`**, knob moves to left, label changes to **`Off`** in white text inside the pill
- Exact style: red filled pill, white `Off` text, same size as ON toggle

**Card body collapses:**
- The full field details (Scenario Description value, Phone Number, Voice Response, Call Whisper Settings) **hide/collapse**
- Only show a **compact summary row** instead:

**Collapsed card layout (OFF state):**
```
┌─────────────────────────────────────────────────────┐
│  Scenario 1          NETNHO4T          View details ›│
│  [Off toggle] [Copy] [Delete] [Edit] [Availability]  │
└─────────────────────────────────────────────────────┘
```
- **"Scenario 1"** in blue `#2563EB`, font-weight 700, font size 15px — top-left
- **Scenario description value** (e.g. `NETNHO4T`) in `#6B7280`, font size 13px — directly below name
- **"View details ›"** text link — right-aligned, `#2563EB`, font size 13px, chevron `›` after text
- Below this summary: the action buttons row (Off toggle + Copy + Delete + Edit + Availability) — same as ON state but toggle is now red `Off`
- Card height shrinks — no field sections visible
- Card border: `1px #E5E7EB`, border-radius 10px

**ON state restores full expanded card** with all fields visible (existing behavior).

---

## UPDATE 3 — Responsive Fix: Move Extension `#` Below Number

**Reference: Image 4 (current broken layout) → fix to match Image 1**

### Current broken layout (Image 4):
- Number input and Extension input are side by side on the same row
- At smaller widths the Extension label gets cut off (`Extension (Optional):` truncated)
- `#` symbol floats awkwardly between them

### Fix — New stacked layout:

**Replace the two-column row with a single-column stacked layout:**

**Row 1 — Number:**
- Label: `Number:` — gray, font size 12px above
- Full-width input: flag selector dropdown (🇺🇸 `US +1 ▼`) + number text field
- Border `1px #D1D5DB`, border-radius 8px, height 40px, full modal width

**Row 2 — Extension (below, not beside):**
- Label: `Extension (Optional): ⓘ` — gray, font size 12px above
- Input row: **`#`** symbol as a prefix inside or just before the input box
  - `#` in `#374151`, font size 14px, left-padded inside the input or as a leading adornment
- Full-width input, placeholder: `e.g: 302`
- Border `1px #D1D5DB`, border-radius 8px, height 40px, full modal width

**Spacing between rows:** 12px vertical gap

**Remove:** the horizontal `#` separator between the two columns — it no longer exists as a standalone element.

---

## UPDATE 4 — Limit Reached Banner (MantraAssist UI Style)

**Reference: Image 3 (Frontdesk version) → adapt to MantraAssist design system**

**Triggered when:** User has reached their maximum number of Transfer Call workflows (e.g. plan allows 1, and 1 already exists)

**Location:** Inside the Transfer Call expanded section — appears **above the Scenario cards**, below the audio preview card

### Limit Banner Component:

**Container:**
- Background: `#FFF7ED` (very light orange/peach)
- Border: `1px #FED7AA` (soft orange)
- Border-radius: 10px
- Padding: 16px 20px
- Full width of the content area

**Left side — Icon:**
- Orange triangle warning icon `⚠` — color `#F97316`, size 22px
- Vertically centered with heading

**Heading:**
- **"Limit Reached"** — font size 16px, font-weight 700, color `#F97316`
- Same row as icon, 10px gap from icon

**Subtext (below heading):**
- *"You've reached your limit of 1 call transfer workflow. You can still view and edit existing items, but cannot create new ones."*
- Font size 13px, color `#374151`
- Margin-top: 6px

**Bottom row (inside banner):**
- Left: usage pill — **"1 of 1 used"** — background `#FEF3C7`, border `1px #FCD34D`, text `#92400E`, font size 12px, border-radius 20px, padding 3px 10px
- Right: **"Upgrade"** button — fill `#2563EB`, white text, font size 13px, font-weight 600, border-radius 8px, padding 8px 20px

**Behavior:**
- When limit is reached, the **"+ Add"** button becomes **disabled** — opacity 50%, cursor not-allowed, non-clickable
- Banner appears automatically once the limit is hit
- Banner disappears if the user upgrades or deletes an existing workflow

---

## Summary of All 4 Updates:

| # | Update | Location |
|---|---|---|
| 1 | Advanced Settings expand with Cold/Hot Transfer radio buttons | Add Workflow modal → bottom of Scenario card |
| 2 | Toggle OFF collapses card to compact summary row, red toggle | Submitted Scenario card |
| 3 | Extension `#` field moves below Number field (stacked layout) | Add Workflow modal → Phone Number section |
| 4 | Limit Reached banner in MantraAssist style | Transfer Call section → above scenario cards |
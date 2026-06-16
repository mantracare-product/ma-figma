Here's the precise Figma Make prompt:

---

### Figma Make Prompt: Call Details Drawer — Add Tabbed Navigation

---

### CONTEXT

The Call Details drawer (slides in from the right, header shows "Call Details" + `#CALL-010` badge + ✕ close) currently shows all content in a single scrollable panel. Restructure it into **4 tabs** to reduce cognitive load. The drawer width, header, and close button remain unchanged.

---

### STEP 1 — Add Tab Bar Below the Drawer Header

Immediately below the "Call Details / #CALL-010" header row, insert a **horizontal tab bar** spanning the full drawer width:

**4 tabs in this order:**
| Tab | Icon | Label |
|-----|------|-------|
| 1 | 📋 | Summary |
| 2 | 📊 | Analytics |
| 3 | 🎯 | Call Review |
| 4 | 🧠 | Smart QA |

**Tab bar styling:**
- Full width, white background, `1px solid #E5E7EB` bottom border
- Each tab: equal width, 44px height, centered icon + label
- Icon: 14px, label: 13px medium weight, `#6B7280` grey when inactive
- **Active tab:** `#1A73E8` blue text + icon, `2px solid #1A73E8` bottom border indicator, white background
- Default active tab on open: **Summary**
- Tab hover state: light blue bg `#F0F4FF`
- No dividers between tabs, just the shared bottom border line

---

### STEP 2 — Tab 1: Summary (Current Content, Reorganized)

Move all existing drawer content into this tab:

**Section 1 — Summary card** (keep existing white card exactly as-is):
- Client, Call Time, Type (`Outbound` blue pill), Current Stage
- Call Status (`Failed` red pill), Duration
- Card: white, 8px radius, 16px padding, subtle shadow

**Section 2 — AI Summary card** (keep existing):
- "AI Summary" heading
- Call Overview paragraph
- Key Points section below

No layout changes to these — just confirm they live inside Tab 1.

---

### STEP 3 — Tab 2: Analytics

New content panel. White background, 16px padding. Show these components stacked vertically with 16px gap:

**Card A — Call Performance Metrics** (grey header bar, white card body):
- 4 metric tiles in a 2×2 grid:
  - `Talk Time` → value e.g. `0:00`
  - `Hold Time` → `0:00`
  - `Response Rate` → `—`
  - `Call Score` → `—`
- Each tile: label in 10px grey caps, value in 20px bold dark navy

**Card B — Call Timeline** (white card, light border):
- Horizontal timeline bar showing call phases: `Ringing → Connected → Ended`
- Each phase as a colored segment: Ringing = grey, Connected = green, Ended = red
- Duration label under each segment in 10px grey

**Card C — Stage History** (white card):
- Heading: "Stage Progression"
- Vertical list of stage changes with timestamp:
  - `●  Initial Contact` · `2024-04-12 13:00` (current = blue dot, past = grey dot)
- If no history, show: "No stage changes recorded" in grey italic 12px

---

### STEP 4 — Tab 3: Call Review

New content panel. White background, 16px padding. Stack vertically:

**Card A — Recording Player** (white card, light border):
- Label: "Call Recording" in 13px bold
- Simulated audio player bar: play ▶ button (blue), scrubber bar (grey track, blue fill to 0%), timestamp `0:00 / 0:00`
- Below: speed selector `1x` dropdown + download icon button right-aligned

**Card B — Transcript** (white card):
- Heading: "Call Transcript" with a `Copy` icon button top-right
- Two-sided transcript format:
  - **Agent** (left-aligned, blue label): "Hello, this is MantraCare AI assistant..."
  - **Client** (right-aligned, grey label): "Hi..."
- If no transcript: "Transcript not available for this call." in grey italic centered
- Scrollable area, max height 280px

**Card C — Notes** (white card):
- Heading: "Call Notes"
- Editable textarea: placeholder "Add notes about this call..." — 4 rows tall, grey border, 8px radius
- `Save Note` button bottom-right: MantraAssist blue, 32px height, 80px width

---

### STEP 5 — Tab 4: Smart QA

New content panel. White background, 16px padding. Stack vertically:

**Card A — QA Scorecard** (white card):
- Heading: "Quality Assessment" with overall score badge top-right: e.g. `72/100` in blue pill
- 5 criteria rows, each with:
  - Criterion name (13px dark) left
  - Score bar (thin 6px height, blue fill, grey track, 120px wide) center
  - Score number (12px grey) right
  - Criteria: `Greeting`, `Empathy`, `Resolution`, `Compliance`, `Closing`
  - Placeholder scores: 80, 65, 0, 90, 70

**Card B — AI Flags** (white card):
- Heading: "Smart Flags" with a small 🧠 icon
- List of flagged moments with colored left-border pills:
  - 🔴 `Compliance Risk` — "No consent confirmation recorded"
  - 🟡 `Follow-up Needed` — "Client requested callback"
  - 🟢 `Positive Signal` — "Client expressed satisfaction"
- If no flags: "No issues detected in this call." in grey italic

**Card C — Recommendations** (white card):
- Heading: "Suggested Next Steps"
- Bulleted list:
  - `→ Schedule follow-up call within 48 hours`
  - `→ Verify insurance documents before next contact`
  - `→ Update stage to Insurance Verify`
- Each item: 12px dark text, `#1A73E8` arrow prefix, 8px row gap

---

### STYLE RULES

- All cards inside tabs: white bg, `1px solid #E5E7EB` border, 8px border radius, 16px padding, 12px gap between cards
- Tab content area is **independently scrollable**, not the full drawer
- Drawer header (title + badge + close) is always **sticky / fixed** at top
- Tab bar is **sticky** just below the header — stays visible while tab content scrolls
- All fonts, colors, shadows match existing MantraAssist design system

---

**Attach the current Call Details drawer screenshot as reference** so Figma Make knows the exact starting structure, header layout, and existing Summary + AI Summary content to preserve in Tab 1.
Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Redesign Permissions Section in "Add User" Modal — Table Format with Dropdowns

**Location:** Settings → Team → **"Add User"** modal → PERMISSIONS section

---

## REMOVE ENTIRELY:

The current permissions layout:
- Section labels (Core, Operations, System) with subtitles
- Radio button pairs (View / Write) stacked vertically under each section
- All vertical spacing between these groups

---

## REPLACE WITH: Permissions Table

### Table Container:
- Full width of modal content area
- Border: `1px solid #E5E7EB`, border-radius 10px
- Overflow: hidden (so border-radius clips the table edges cleanly)
- No external margin except 16px top from the `PERMISSIONS` heading

### Table Header Row:
- Background: `#F9FAFB`
- Height: 36px
- Border-bottom: `1px solid #E5E7EB`
- 3 columns:

| Column | Width | Content |
|---|---|---|
| Permission | ~40% | Header label **"Permission"** |
| Modules | ~35% | Header label **"Modules"** |
| Access Level | ~25% | Header label **"Access Level"** |

- All header labels: font size 11px, font-weight 600, color `#6B7280`, uppercase, letter-spacing 0.5px
- Padding: 0px 14px, vertically centered

---

### Table Body — 3 Data Rows:

Each row:
- Height: 52px
- Border-bottom: `1px solid #F3F4F6` (light separator, not on last row)
- Hover background: `#FAFAFA`
- Padding: 0px 14px
- Vertical align: center

---

**Row 1 — Core:**

| Column | Content |
|---|---|
| Permission | **"Core"** — font size 14px, font-weight 600, color `#111827` |
| Modules | *"Dashboard, Clients, Calls"* — font size 12px, color `#6B7280` |
| Access Level | Dropdown (see specs below) |

---

**Row 2 — Operations:**

| Column | Content |
|---|---|
| Permission | **"Operations"** — font size 14px, font-weight 600, color `#111827` |
| Modules | *"Processes, Numbers"* — font size 12px, color `#6B7280` |
| Access Level | Dropdown |

---

**Row 3 — System:**

| Column | Content |
|---|---|
| Permission | **"System"** — font size 14px, font-weight 600, color `#111827` |
| Modules | *"Billing, Webhooks, Settings"* — font size 12px, color `#6B7280` |
| Access Level | Dropdown |

---

### Access Level Dropdown Specs (one per row):

**Trigger (closed state):**
- Width: 100% of the Access Level column (~120px)
- Height: 34px
- Border: `1px solid #D1D5DB`, border-radius 6px, background white
- Default/placeholder value: **"No Access"** — color `#9CA3AF`, font size 13px
- Right: chevron `▼` icon, color `#6B7280`, 11px
- Padding: 0px 10px
- Focus border: `1.5px #2563EB`

**Dropdown menu (opens downward):**
- White card, border `1px #E5E7EB`, border-radius 6px
- Box shadow: `0px 4px 12px rgba(0,0,0,0.08)`
- Width: match trigger width
- 3 options stacked:

**Option 1 — No Access:**
- Text: **"No Access"** — font size 13px, color `#374151`
- Left indicator dot: `#9CA3AF` gray, 6×6px circle
- Padding: 9px 12px
- Selected state: background `#F9FAFB`, checkmark `✓` right side `#9CA3AF`

**Option 2 — View:**
- Text: **"View"** — font size 13px, color `#374151`
- Left indicator dot: `#2563EB` blue
- Padding: 9px 12px
- Selected state: background `#EFF6FF`, checkmark `✓` `#2563EB`

**Option 3 — Write:**
- Text: **"Write"** — font size 13px, color `#374151`
- Left indicator dot: `#10B981` green
- Subtext below: *"Includes view access"* — font size 11px, color `#9CA3AF`
- Padding: 9px 12px
- Selected state: background `#F0FDF4`, checkmark `✓` `#10B981`

Separator `1px #F3F4F6` between each option.

---

### Dropdown Selected State — Trigger Updates:

When an option is selected, the trigger reflects the choice:

**No Access selected:**
- Gray dot `#9CA3AF` + text **"No Access"** `#374151`

**View selected:**
- Blue dot `#2563EB` + text **"View"** `#2563EB`, font-weight 600
- Border: `1px #2563EB`

**Write selected:**
- Green dot `#10B981` + text **"Write"** `#10B981`, font-weight 600
- Border: `1px #10B981`

---

### PERMISSIONS Section Heading (above table):

Keep the **"PERMISSIONS"** label as-is:
- Font size 11px, font-weight 600, color `#6B7280`, uppercase, letter-spacing 0.5px
- Margin-bottom: 10px

---

## FINAL MODAL LAYOUT (top to bottom):

```
┌─ Modal Header ─────────────────────────────┐
│  Add User                              ×   │
├────────────────────────────────────────────┤
│  [scrollable body]                         │
│                                            │
│  ... (name, email, role fields above)      │
│                                            │
│  PERMISSIONS                               │
│                                            │
│  ┌──────────────┬──────────────┬─────────┐ │
│  │ Permission   │ Modules      │ Access  │ │
│  ├──────────────┼──────────────┼─────────┤ │
│  │ Core         │ Dashboard,   │ [▼ dd]  │ │
│  │              │ Clients,Calls│         │ │
│  ├──────────────┼──────────────┼─────────┤ │
│  │ Operations   │ Processes,   │ [▼ dd]  │ │
│  │              │ Numbers      │         │ │
│  ├──────────────┼──────────────┼─────────┤ │
│  │ System       │ Billing,     │ [▼ dd]  │ │
│  │              │ Webhooks,    │         │ │
│  │              │ Settings     │         │ │
│  └──────────────┴──────────────┴─────────┘ │
│                                            │
├────────────────────────────────────────────┤
│              [Cancel]  [+ Add User]        │
└────────────────────────────────────────────┘
```

---

## Summary of Changes:

| Before | After |
|---|---|
| 3 stacked vertical groups | Single clean table with 3 rows |
| Radio buttons (View/Write) | Dropdown per row (No Access / View / Write) |
| Static labels only | Color-coded selection states on dropdown |
| Verbose layout taking lots of vertical space | Compact 3-row table, ~160px total height |
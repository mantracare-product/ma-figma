Here's the fully self-contained, detailed prompt with zero dependency on reference images:

---

# MantraAssist — Processes/Deals Page Update Prompt

---

## CONTEXT & CURRENT STATE

MantraAssist is a healthcare CRM web app. The **Processes page** (also called `/deals`) shows a **list view** of client deals/cases. It has:
- A **left sidebar** with navigation
- A **main content area** with a data table
- Table columns: **Checkbox → Gear icon → Client Name → Process → Stage → Status → Created Date**
- A top filter bar with **List / Kanban / Process** tab switchers

---

## CHANGE 1 — Stage Column: Fixed Ladder-Style Progress Bar

### Current Problem:
The Stage column currently shows a **freeform colored bar** that varies in width per row depending on the stage. This looks inconsistent and unclear.

### What to Build:
Replace it with a **fixed-width segmented step indicator** that looks like this:

```
[■][■][□][□][□]   ← Follow-up Later (3rd stage filled)
[■][□][□][□][□]   ← New (1st stage filled)
[■][■][■][■][□]   ← Interested (4th stage filled)
```

**Specifications:**
- **5 equal rectangular blocks** placed horizontally side by side
- Each block: fixed width ~18px, height ~8px, border-radius ~2px
- Gap between blocks: 3px
- Filled blocks: brand blue `#1565C0` or `#1E88E5`
- Unfilled blocks: light grey `#E0E0E0`
- The number of filled blocks = current stage number (1 through 5)
- Stages in order:
  1. New
  2. Can't Contact
  3. Follow-up Later
  4. Interested
  5. Close Deal
- All rows have **identical total bar width** — no row should look wider or narrower than another
- Add a **tooltip on hover** showing the stage name (e.g. "Follow-up Later")
- No text label inside the bar — just the blocks

---

## CHANGE 2 — Three-Dot Menu Per Row

### What to Build:
Add a **vertical three-dot icon (⋮)** in each row, placed **in the same column as the gear icon**, right before the Client Name.

**Behavior:**
- On **click**, a small floating dropdown popup appears anchored to the dot icon
- Popup contains exactly 3 options:

```
┌─────────────┐
│ 👁  View    │
│ ✏️  Edit    │
│ 🗑  Delete  │
└─────────────┘
```

**Popup Design:**
- White background
- Subtle drop shadow: `box-shadow: 0 4px 12px rgba(0,0,0,0.12)`
- Border radius: 8px
- Each option: 36px tall, 140px wide, 14px font
- Hover state: light blue-grey background `#F0F4FF`
- Delete option text color: red `#D32F2F`
- Clicking outside closes the popup
- Only one popup open at a time

---

## CHANGE 3 — "View" Opens a Bottom Drawer

### Trigger:
When user clicks **View** from the three-dot menu

### Drawer Behavior:
- Slides up smoothly from the **bottom of the viewport**
- Animation: `transform: translateY(100%) → translateY(0)`, duration 300ms, ease-out
- Does **NOT** take full screen width — it is **centered** and takes up **65% of screen width**
- Horizontally centered with `margin: 0 auto`
- Height: **85% of viewport height**
- Has rounded top corners: `border-radius: 20px 20px 0 0`
- Background: white
- A **dark overlay/backdrop** covers the rest of the screen behind the drawer
- Clicking the backdrop closes the drawer

**Drawer Header (very top):**
- A small **grey drag handle bar** centered at the very top (40px wide, 4px tall, rounded, `#BDBDBD`)
- Below that: the **Client Name** as the drawer title in bold 18px dark text
- An **X close button** on the top right corner

---

### SECTION A — Stage Pipeline (inside drawer, below header)

Show a **horizontal stage stepper** across the full drawer width with 5 stages:

```
  ①──────②──────③──────④──────⑤
 New   Can't  Follow  Inter  Close
       Cont.   -up    ested   Deal
```

**Design:**
- Each stage is a **circle (32px diameter)** connected by a **horizontal line**
- Active stage circle: filled blue `#1E88E5`, white number inside
- Completed stages: filled blue with a **✓ checkmark**
- Future stages: grey outlined circle `#E0E0E0`, grey number
- Connecting lines: blue for completed segments, grey for future
- Stage label below each circle in 11px grey text
- Current active stage label in bold blue text
- This sits in a light grey bar `#F5F7FA`, padding 16px, full drawer width

---

### SECTION B — Two Tabs Below the Stage Pipeline

Two tab buttons sit below the stage pipeline:

```
[ General Information ]  [ History ]
```

- Active tab: blue underline border, blue text `#1E88E5`
- Inactive tab: grey text, no underline
- Tab content area is **scrollable** vertically

---

#### TAB 1: General Information

Show all deal fields **EXCEPT** pricing, payment amount, products, and delivery info.

Layout: **Two-column label + value rows**, full width of drawer

```
┌─────────────────────┬──────────────────────────┐
│ Client Name         │ Navodya                  │
│ Responsible         │ 👤 Navodya Jain           │
│                     │ Product Management Intern │
│ Deal Type           │ Organic                  │
│ Source              │ eyemantra.in             │
│ Start Date          │ May 18, 2026             │
│ End Date            │ May 25, 2026             │
│ Email ID            │ navodya@mantra.care      │
│ Country Code        │ +91                      │
│ Country             │ India                    │
│ Time Slot           │ 8AM – 8PM                │
│ Hypertension        │ No                       │
│ Diabetes            │ No                       │
│ UTM Parameters      │ None                     │
│ Comment             │ [clickable link]         │
│ Available to All    │ No                       │
│ Random              │ 1                        │
└─────────────────────┴──────────────────────────┘
```

**Design Rules:**
- Label: 13px, `#757575` grey, left column ~35% width
- Value: 14px, `#212121` dark, left column ~65% width
- Alternating row background: white and `#FAFAFA`
- Row height: 44px
- Divider line between rows: `1px solid #F0F0F0`
- Responsible person row shows a **small circular avatar** + name + title stacked
- Comment field shows the URL as a **blue hyperlink**, truncated if too long
- All fields are **read-only** in View mode

---

#### TAB 2: History

Show a **log table** of all activity on this deal.

**Table columns:**
```
[ ] | Date & Time       | Created By    | Event Type        | Description
```

**Column Details:**
- **Checkbox** column: 40px wide
- **Date & Time**: format `DD.MM.YYYY HH:MM`, 140px wide, grey `#757575`
- **Created By**: person's name with small avatar icon, 160px wide
- **Event Type**: plain text label, 160px wide. Possible values:
  - `View` — grey text
  - `Stage changed` — blue text
  - `Activity created` — green text
- **Description**: remaining width. Examples:
  - "New → Can't Contact"
  - "Contact customer: Call for update"
  - *(empty for View events)*

**Table Design:**
- Header row: dark navy background `#1A2B4A`, white text, 13px uppercase, 44px tall
- Data rows: white background, 40px tall
- Hover state: `#F5F8FF` light blue
- Alternating rows: subtle `#FAFAFA` on even rows
- A **search/filter input** in the top right above the table, placeholder "Filter..."
- 16px padding inside cells
- Horizontal dividers between rows: `1px solid #EEEEEE`
- Most recent events at the **top** (descending date order)
- If no history: show centered empty state "No history available yet" in grey italic

---

## OVERALL DESIGN CONSTRAINTS

- **Font:** Same as existing app (likely Inter or similar sans-serif)
- **Primary blue:** `#1E88E5`
- **Dark navy (headers):** `#1A2B4A`
- **Background:** `#FFFFFF` white cards on `#F4F6F9` page background
- **Border radius standard:** 8px for cards, 4px for inputs
- **All interactions** must have smooth transitions (200–300ms)
- **No page reload** on any of these interactions — all client-side
- The drawer must be accessible: closeable via Escape key, focus-trapped while open
- Works on **desktop viewport** (1280px+) as primary target
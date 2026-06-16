Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Add Top Navigation Tab Bar to "Manage Team Member" Page

**Location:** Settings → Team → **"Manage Team Member"** page (currently shows all sections stacked vertically on scroll)

**Reference for tab bar style:** Image 6 (Bitrix24 profile page top bar — General, Tasks, Calendar, Drive, Feed, Analytics, etc.)

---

## CHANGE 1 — Add Horizontal Tab Bar Below Page Header

**Position:** Between the page header row (`← Manage Team Member / Cancel / Save Changes`) and the content area

**Tab bar container:**
- Full width of content area
- Height: 44px
- Background: white
- Border-bottom: `2px solid #E5E7EB`
- No top border
- Margin-bottom: 0px — content starts immediately below

**5 Tab Items (left to right):**

1. **Calendar**
2. **Availability**
3. **Days Off**
4. **Services**
5. **Permissions**

**Each tab item:**
- Padding: 0px 18px
- Height: 44px (full bar height)
- Font size: 14px, font-weight 500, color `#6B7280`
- Cursor: pointer
- Hover state: color `#111827`, background `rgba(0,0,0,0.03)`

**Active/selected tab:**
- Font-weight: 600, color `#2563EB`
- Bottom border: `2px solid #2563EB` (sits on the bar's bottom border, overlapping it)
- Background: none

**Default active tab on page load: "Calendar"**

---

## CHANGE 2 — Show Only Selected Section's Content

**Remove** the current behavior where ALL sections are stacked and visible on scroll.

**Replace with:** Only the content of the currently selected tab is visible in the right content panel. Switching tabs swaps the content — no scrolling through all sections.

---

## TAB 1 — "Calendar" (default active)

**Shows:** The Calendar Integration section — exactly as currently built (Image 1)

Content:
- **Calendar Integration** card:
  - Header: calendar icon + **"Calendar Integration"** bold + subtitle *"Connect calendar to sync availability"*
  - Google Calendar connected card: green border `#D1FAE5`, background `#F0FDF4`, calendar icon + **"Google Calendar"** + **"Connected"** green badge + email `john.smith@healthcare.com` + **"Disconnect"** button
  - Info row: green `✓` + *"Events from this calendar will be used to determine availability automatically."*

---

## TAB 2 — "Availability"

**Shows:** The Weekly Availability section — exactly as currently built (Image 2)

Content:
- **Weekly Availability** card:
  - Header: clock icon + **"Weekly Availability"** + subtitle *"Set working hours for each day"*
  - 7 day rows (Mon–Sun), each row:
    - Checkbox (checked = active day)
    - Day name
    - Start time input `09:00` + clock icon
    - **"to"** label
    - End time input `17:00` + clock icon
    - Saturday/Sunday: unchecked, shows **"Unavailable"** in gray

---

## TAB 3 — "Days Off"

**Shows:** The Days Off section — exactly as currently built (Image 3)

Content:
- **Days Off** card:
  - Header: calendar-x icon (orange) + **"Days Off"** + subtitle *"Manage specific dates when unavailable"*
  - Date input: `dd-mm-yyyy` date picker + **"+ Add"** button
  - Listed days off rows (orange background `#FFF7ED`, orange border `#FED7AA`):
    - Each row: orange calendar icon + date text (e.g. `Fri, May 15, 2026`) + trash delete icon right
  - Sample entries: `Fri, May 15, 2026` · `Sat, May 16, 2026` · `Mon, Jun 1, 2026`

---

## TAB 4 — "Services"

**Shows:** The Assigned Services section — exactly as currently built (Image 4)

Content:
- **Assigned Services** card:
  - Header: box/cube icon (blue) + **"Assigned Services"** + subtitle *"Select services this team member can provide"* + right badge **"3 / 4 selected"** in `#2563EB`
  - Service rows — each row: checkbox circle left + service name + category tag + price right + duration below price
  - Selected rows: border `1.5px #2563EB`, background `#EFF6FF`, filled blue checkmark circle
  - Unselected rows: border `1px #E5E7EB`, empty circle
  - Sample services:
    - ✓ **Initial Consultation** · Consultation tag · $150 · 60 min
    - ✓ **Follow-up Visit** · Consultation tag · $75 · 30 min
    - ○ **Dental Cleaning** · Dental tag · $120 · 45 min
    - ✓ **X-Ray Imaging** · Diagnostic tag · $80 · 20 min

---

## TAB 5 — "Permissions"

**Shows:** The Permissions section — exactly as currently built (Image 5)

Content:
- **Permissions** card:
  - Header: shield icon (purple) + **"Permissions"** + subtitle *"Manage access levels across the platform"*
  - 3 permission groups: Core, Operations, System
  - Each group has:
    - Group header row: group name bold + modules subtitle + **"View"** outlined button + **"Write"** filled blue button (bulk set for group)
    - Sub-rows for each module with individual View/Write radio buttons:
      - **Core:** Dashboard, Clients, Calls
      - **Operations:** Processes, Numbers
      - **System:** Billing, Webhooks, Settings
    - Each sub-row: module name left + `○ View` + `◉ Write` radio pair right

---

## LEFT SIDEBAR — No Changes

The left sidebar (Overview, Clients, Appointments, Calls, Process, Web Forms, Services, Settings) remains **exactly as-is** — no modifications.

---

## PAGE HEADER ROW — No Changes

The header row remains exactly as-is:
- `←` back arrow + **"Manage Team Member"** title + subtitle *"Configure settings for John Smith"*
- Right side: **"Cancel"** + **"Save Changes"** buttons

The tab bar inserts **between** this header row and the content area.

---

## REMOVE:

- All section-to-section scroll connectors
- The Quick Stats card on the left (this was part of the old scrollable layout — the left panel with avatar + John Smith + Email verified + Active member + Calendar connected + Quick Stats)

**Keep the left profile panel** (avatar card with name, email, status badges) — it remains visible on all tabs as a persistent left column.

**Only the RIGHT content area** swaps content based on active tab.

---

## FINAL LAYOUT STRUCTURE:

```
┌─ Page Header ────────────────────────────────────────────┐
│  ← Manage Team Member          [Cancel] [Save Changes]   │
│  Configure settings for John Smith                        │
├─────────────────────────────────────────────────────────┤
│  [Calendar] [Availability] [Days Off] [Services] [Permissions] │
│  ──────────────────── tab bar ──────────────────────────  │
├────────────────────┬────────────────────────────────────┤
│                    │                                     │
│  Profile Card      │   ACTIVE TAB CONTENT ONLY          │
│  (always visible)  │   (swaps per tab selection)        │
│                    │                                     │
│  John Smith        │                                     │
│  email             │                                     │
│  ✓ Email verified  │                                     │
│  ✓ Active member   │                                     │
│  ✓ Calendar        │                                     │
│    connected       │                                     │
│                    │                                     │
└────────────────────┴────────────────────────────────────┘
```
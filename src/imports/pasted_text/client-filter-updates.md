Fix and update the filter system in the MantraAssist Clients 
screen. Reference current state: filter panel opens on search 
bar click, has STATUS/PROCESS/RESPONSIBLE/LAST CONTACT/
CREATED ON dropdowns, tags appear in search bar, 
Add field opens a popup.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FIX 1: FILTER TAGS — SINGLE ROW HORIZONTAL SCROLL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEM: Tags are stacking vertically and expanding the 
search bar height.

FIX:
- Search bar stays FIXED at its original single-line height 
  (44px) — never grows taller
- All applied filter tags sit on ONE horizontal row 
  inside the search bar
- If tags exceed the bar width → they SCROLL HORIZONTALLY 
  inside the bar (overflow-x: auto, scrollbar hidden)
- 🔍 icon stays pinned LEFT, never scrolls
- ✕ Clear all stays pinned RIGHT, never scrolls  
- Only the tags area between them scrolls horizontally
- Tags: pill style, 13px, single line, no wrapping ever

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FIX 2: REMOVE "APPLY" BUTTON FROM EACH DROPDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEM: Each filter dropdown has its own "Apply" button 
which is redundant — the panel already has Search/Save.

FIX:
- Delete the "Apply" button from ALL filter dropdowns
  (Status, Process, Responsible, Last Contact, Created On)
- Dropdown behavior: user checks/unchecks options, 
  dropdown closes automatically when clicking outside it
- Selection is registered immediately on checkbox click
- Tag updates live in search bar as soon as option is checked
- Final application happens only when "Search" button 
  in the filter panel is clicked

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FIX 3: FILTER PANEL — DEFAULT VISIBLE FIELDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When search bar is clicked and filter panel opens, 
show these PRIMARY fields by default (most useful for 
quick client search):

Row 1:
[ NAME ▼ ]          [ STATUS ▼ ]        [ PROCESS ▼ ]

Row 2:
[ RESPONSIBLE ▼ ]   [ LAST CONTACT ▼ ]  [ + Add field ]

NAME filter dropdown:
- Text input to type a name fragment
- Live matches shown as checkboxes below input
- Placeholder: "Search by name..."

STATUS dropdown (unchanged):
☐ Active  ☐ Inactive  ☐ Pending

PROCESS dropdown (unchanged):
☐ Patient Intake  ☐ Appointment Scheduling
☐ Follow-up Calls  ☐ Billing Support
☐ Insurance Verification

RESPONSIBLE dropdown (unchanged):
Search input + team member checklist

LAST CONTACT dropdown:
☐ Any date (default)
☐ Today
☐ Yesterday
☐ Last 7 days
☐ Last 30 days
☐ Custom range → inline date picker

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FIX 4: "+ ADD FIELD" POPUP — COMPLETE REBUILD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEM: Current popup is broken — title "Filter field 
settings" overlaps content, checkboxes missing, layout broken.

REBUILD the popup as a proper centered modal:

┌─────────────────────────────────────────────┐
│  Filter field settings                  ✕  │  
│  ─────────────────────────────────────────  │
│  [ 🔍 Find field...                     ]  │
│                                             │
│  [ Client ✓ ]  [ Process ✓ ]  [ Activity ✓]│  ← pill tabs
│  ─────────────────────────────────────────  │
│                                             │
│  CLIENT INFO                                │  ← section label
│  ☐ Name        ☐ Email       ☐ Phone        │
│  ☐ Status      ☐ Location    ☐ Company      │
│  ☐ Role        ☐ Company Size               │
│                                             │
│  PROCESS & ACTIVITY                         │  ← section label
│  ☐ Process     ☐ Responsible ☐ Created On  │
│                                             │
│  SMART TIME FILTERS                         │  ← section label
│  ☐ Last Contact: Today                      │
│  ☐ Last Contact: Yesterday                  │
│  ☐ Last Contact: Last 7 days                │
│  ☐ Last Contact: Last 30 days               │
│  ☐ Last Call: Last 24 hours                 │
│  ☐ Last Call: Last 7 days                   │
│  ☐ No activity in 7 days                    │
│  ☐ No activity in 30 days                   │
│  ☐ Created: Today                           │
│  ☐ Created: This week                       │
│  ☐ Created: This month                      │
│  ☐ Overdue follow-up                        │
│                                             │
│  ─────────────────────────────────────────  │
│  ☐ select all    [ APPLY ]  [ CANCEL ]  ↺  │
└─────────────────────────────────────────────┘

Popup specs:
- Width: 560px, centered on screen
- Max height: 70vh, content area scrollable
- White background, border-radius 12px
- Box-shadow: 0 8px 32px rgba(0,0,0,0.16)
- Dark scrim behind popup: rgba(0,0,0,0.4)
- Header: 18px bold, border-bottom 1px #E2E8F0
- Section labels: 11px uppercase, #9CA3AF, 
  letter-spacing 0.08em, margin-top 16px
- Checkboxes: 16x16px, 3px radius, blue checked state
- Checkbox labels: 14px #374151, 8px gap from checkbox
- Grid: 3 columns for CLIENT INFO section
- Smart Time Filters: 1 column (full width), 
  each row 36px height
- Pill tabs: border-radius 20px, blue border + checkmark 
  when active
- "Find field" search: filters all items in real time

Bottom bar (fixed):
- ☐ select all — left
- [ APPLY ] — primary blue fill, white text, 40px, radius 6px
- [ CANCEL ] — ghost button
- ↺ default — text link, resets to default fields

On APPLY:
- Selected fields are added as new dropdowns in filter panel
- Smart time filter selections are added directly as 
  active tags in the search bar immediately
- Popup closes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### DO NOT CHANGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Filter panel layout structure (rows of dropdowns)
- Search / Reset / Save filter buttons at bottom of panel
- Table, columns, row data
- Sidebar navigation
- Any other screens
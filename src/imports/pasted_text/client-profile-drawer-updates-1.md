Update the "Client Profile" side drawer in MantraAssist with the 
following changes. The drawer slides in from the right over the 
clients table. Current state has: Overview / Activity / Notes tabs, 
avatar, name, status badge, and read-only fields (Name, Status, 
Email, Phone, Location, Company, Role).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### CHANGE 1: DEFAULT INLINE EDIT MODE (No edit button needed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Remove the ✏ edit icon/button from the drawer header entirely
- All fields are ALWAYS in editable state by default on open
- Each field row becomes an inline input:

  Label (grey, 12px, uppercase)    [  Editable input field  ]

  • Name        → single-line text input
  • Status      → dropdown select (Active / Inactive / Pending)
  • Email       → email input
  • Phone       → tel input  
  • Location    → text input
  • Company     → text input
  • Role        → text input

- Input style: 
  • Background: #F8FAFC (very light grey)
  • Border: 1px solid #E2E8F0
  • Border-radius: 6px
  • Padding: 6px 10px
  • Font: 14px, #1B2E3C
  • On focus: border color #2A9D8F (teal), subtle box-shadow
  • Full width within the drawer content area

- Add a "Save Changes" teal button (#2A9D8F) fixed at the 
  bottom of the drawer, full width, 44px height, 16px bold white text
- Next to it a "Discard" ghost button (border only, grey text)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### CHANGE 2: ADD PROCESSES SECTION IN OVERVIEW TAB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Below the existing fields, add a section titled "Processes"
- Section header: "PROCESSES" label (grey, 11px, uppercase, 
  letter-spacing 0.08em) with a teal "+ Add Process" button 
  (text link style) aligned to the right of the header

- Each assigned process renders as a pill/tag:
  • Background: #EBF5FB, border: 1px solid #2A9D8F
  • Text: 13px teal (#2A9D8F), padding 4px 10px, border-radius 20px
  • A small × icon on the right of each pill to DELETE that process
  • On × click: pill is removed immediately with a fade-out animation

- "+ Add Process" click → opens an inline dropdown below the 
  button (not a new page) showing available processes as a 
  checklist (Patient Intake, Appointment Scheduling, Follow-up Calls, 
  Billing Support, Insurance Verification)
  • Dropdown style: white card, 8px radius, shadow, max-height 200px, 
    scrollable, each item has checkbox + label, 14px
  • Selecting adds the pill instantly to the process list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### CHANGE 3: "CREATE FIELD" OPENS AS POPUP INSIDE THE DRAWER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- At the bottom of the Overview fields list, keep a 
  "+ Create Field" text link (14px, teal, with a + icon left)

- On click → a POPUP appears OVERLAID within the drawer bounds only
  (NOT a full-screen modal, NOT a new page)
  
  Popup specs:
  • Width: 100% of drawer width minus 24px margin each side
  • Position: centered vertically in the drawer, z-index above content
  • Background: white, border-radius: 12px, 
    box-shadow: 0 8px 32px rgba(0,0,0,0.18)
  • Dark overlay behind popup but ONLY within the drawer 
    (rgba(0,0,0,0.4) scrim covering just the drawer content area)
  
  Popup content:
  ┌─────────────────────────────────┐
  │  Create Custom Field        ✕  │  ← header, close icon top-right
  ├─────────────────────────────────┤
  │  Field Name                     │
  │  [ text input, placeholder:     │
  │    "e.g. Insurance ID" ]        │
  │                                 │
  │  Field Type                     │
  │  [ Dropdown SELECT — required ] │
  │    Options:                     │
  │    • Text                       │
  │    • Number                     │
  │    • Date                       │
  │    • Dropdown / Select          │
  │    • Checkbox                   │
  │    • Phone                      │
  │    • Email                      │
  │    • URL                        │
  │                                 │
  │  (If "Dropdown" selected →      │
  │   show "+ Add Option" repeater  │
  │   field below Field Type)       │
  │                                 │
  │  [ Cancel ]  [ Create Field ]   │
  └─────────────────────────────────┘

  - Field Type dropdown: 
    • Style: full-width, 40px height, border 1px #E2E8F0, 
      radius 6px, chevron icon right
    • MUST be interactive/selectable (not just visual)
    • On selection → label updates to show chosen type icon + name
  
  - "Create Field" button: teal fill, white text, 14px bold
  - "Cancel" button: ghost style, closes popup
  - On successful create → popup closes, new field appears 
    at bottom of the field list in the drawer in edit mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### GENERAL DRAWER SPECS (maintain)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Drawer width: 420px, fixed right
- Header: "Client Profile" title (20px bold) + ✕ close icon
- Tabs: Overview | Activity | Notes (unchanged)
- Avatar: initials circle, teal background, 56px, unchanged
- Name below avatar: 22px bold, #1B2E3C
- Status badge: unchanged (green Active pill)
- Scrollable content area between header and fixed Save button
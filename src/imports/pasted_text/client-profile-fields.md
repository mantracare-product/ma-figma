Update the "+ Create Field" flow in the Client Profile drawer 
of MantraAssist. Reference the current state: a "+ Create Field" 
text link at the bottom of the Overview tab that opens a 
"Create Custom Field" popup with Field Name input, Field Type 
dropdown, Cancel and Create Field buttons.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### CHANGE 1: REPLACE "+ Create Field" WITH TWO LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Remove the single "+ Create Field" text link
- Replace with TWO side-by-side text links at the same position:

  [Select field]     [Create field]
  
  • Both 14px, teal (#2A9D8F), underline-dashed border bottom 
    (like the reference screenshots showing "Select field" and 
    "Create field" as dashed underline links)
  • Separated by 16px gap
  • Left-aligned below the Processes section

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### CHANGE 2: "SELECT FIELD" POPUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On clicking "Select field" → a scrollable popup appears 
overlaid within the drawer bounds (same positioning as the 
Create Custom Field popup):

Popup header: "Select Field" (18px bold) + ✕ close icon

Content: a vertically scrollable list of pre-created 
field types, each as a two-line row:

  ┌─────────────────────────────────────┐
  │  String                             │
  │  Text fields can contain any        │
  │  information: text, numbers,        │
  │  special characters, etc.           │
  ├─────────────────────────────────────┤
  │  List                               │
  │  Allows a user to select one or     │
  │  more list items. Field values can  │
  │  be used in analytical reports.     │
  ├─────────────────────────────────────┤
  │  Date/Time                          │
  │  Enables a user to specify date     │
  │  and time using a built-in calendar │
  ├─────────────────────────────────────┤
  │  Date                               │
  │  Selects a date using a built-in    │
  │  calendar.                          │
  ├─────────────────────────────────────┤
  │  Book a Resource                    │
  │  Provides facilities to book a      │
  │  resource for a desired duration.   │
  ├─────────────────────────────────────┤
  │  Address                            │
  │  Stores address information.        │
  ├─────────────────────────────────────┤
  │  Link                               │
  │  Specifies web links.               │
  ├─────────────────────────────────────┤
  │  File                               │
  │  This field stores images and       │
  │  documents.                         │
  ├─────────────────────────────────────┤
  │  Money                              │
  │  Specifies amounts with optional    │
  │  currency abbreviation.             │
  ├─────────────────────────────────────┤
  │  Yes/No                             │
  │  Binary yes or no reply field.      │
  ├─────────────────────────────────────┤
  │  Number                             │
  │  Contains numeric data for          │
  │  analytical reports.                │
  ├─────────────────────────────────────┤
  │  WhatsApp Link                      │
  ├─────────────────────────────────────┤
  │  Additional fields...               │
  │  More field types: integer; bind    │
  │  to user; bind to CRM item etc.     │
  ├─────────────────────────────────────┤
  │  Create custom field type           │
  │  Create a custom field type using   │
  │  REST API                           │
  └─────────────────────────────────────┘

  Row styles:
  • Each row: 48px min-height, padding 12px 16px
  • Field name: 14px, #1B2E3C, font-weight 600
  • Description: 12px, #6B7280, line-height 1.4
  • Divider: 1px solid #F1F5F9 between rows
  • On hover: background #F0FDF9 (light teal tint)
  • On click: row gets teal left border (3px solid #2A9D8F), 
    selected state, popup closes and field is added to profile
  • Scrollbar: thin, right side, visible when list overflows
  
  Popup footer (fixed at bottom of popup):
  • "↑ Scroll for more types" — 11px grey hint text, centered
  • Up/down chevron arrows at top and bottom of scroll area

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### CHANGE 3: ENHANCED "CREATE FIELD" POPUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Update the existing "Create Custom Field" popup to add 
configuration checkboxes and stage dropdown below Field Type:

Full updated popup layout:

  ┌──────────────────────────────────────┐
  │  Create Custom Field             ✕  │
  ├──────────────────────────────────────┤
  │  Field Name                          │
  │  [ e.g. Insurance ID           ]     │
  │                                      │
  │  Field Type                          │
  │  [ Select field type          ▼ ]    │
  │    (all types from Select Field      │
  │     list above as dropdown options)  │
  │                                      │
  │  ────────────────────────────────    │
  │                                      │
  │  ☐  Required at stage:               │
  │         [ For all stages        ▼ ]  │
  │                                      │
  │  ☐  Multiple                         │
  │                                      │
  │  ☑  Show always  ⓘ                  │
  │                                      │
  │  ☐  Enable field tooltip             │
  │                                      │
  │  ☐  Make this field visible to       │
  │     selected users only              │
  │                                      │
  │  ────────────────────────────────    │
  │                                      │
  │  [ Cancel ]      [ Create Field ]    │
  └──────────────────────────────────────┘

  Checkbox styles:
  • Size: 16x16px, border: 1.5px solid #CBD5E1, radius: 3px
  • Checked fill: teal #2A9D8F with white checkmark
  • Label: 14px, #374151, next to checkbox with 8px gap
  • Default checked: "Show always" only

  "Required at stage" row:
  • Checkbox on the LEFT of the label text
  • When checkbox is UNCHECKED → the stage dropdown is hidden/greyed
  • When checkbox is CHECKED → dropdown appears inline to the right:
    [ For all stages and pipelines  ▼ ]
    Dropdown width: 220px, right-aligned in the popup
    
    Dropdown options (full list):
    ─────────────────────────────
    For all stages and pipelines  ← default selected
    ─── PIPELINE: Patient Intake ───
    • New Lead
    • Initial Consultation
    • Intake Form Sent
    • Intake Completed
    ─── PIPELINE: Appointment Scheduling ───
    • Appointment Requested
    • Confirmed
    • Reminder Sent
    • Completed
    ─── PIPELINE: Follow-up Calls ───
    • Call Scheduled
    • In Progress
    • Follow-up Done
    ─── PIPELINE: Billing Support ───
    • Invoice Sent
    • Payment Pending
    • Payment Received
    ─── PIPELINE: Insurance Verification ───
    • Verification Requested
    • In Review
    • Verified
    • Rejected
    ─────────────────────────────
    
    Dropdown style:
    • White card, 8px radius, shadow
    • Group headers: 11px uppercase grey, not selectable
    • Stage items: 13px #1B2E3C, 36px height, 
      teal highlight on hover, teal check on selected
    • Max height: 200px, scrollable

  ⓘ tooltip on "Show always":
  • Small grey circle info icon
  • On hover: tooltip "Field will always appear in the 
    profile regardless of stage"

  "Create Field" button:
  • Teal fill #2A9D8F, white bold text, full right half width
  • Disabled state (grey) until both Field Name and 
    Field Type are filled
  
  "Cancel": ghost button, left half, grey border

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### POPUP SHARED SPECS (both popups)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Appear overlaid within drawer bounds only
- White background, border-radius 12px
- Box-shadow: 0 8px 32px rgba(0,0,0,0.18)
- Scrim: rgba(0,0,0,0.35) covering drawer content behind popup
- ✕ close icon top-right: 20px, grey #6B7280, 
  hover turns #1B2E3C
- Drawer behind popup is scrolling-locked while popup is open
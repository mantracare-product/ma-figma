Add a full Bitrix24-style filter and search system to the 
MantraAssist Clients screen. Reference the existing toolbar 
which has: Search bar | Filter funnel icon | ⚙ gear | + | 
Upload | Download buttons.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 1. SMART SEARCH BAR (upgraded)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Replace the current plain search input with a smart 
filter-aware search bar:

- Full width, same position as current search bar
- Left side: 🔍 search icon
- Placeholder: "Search clients..."
- User can type freely to search by name/email/phone (live)

When filters are ACTIVE:
- Applied filters appear as TAGS inside the search bar 
  (left side, before the cursor), exactly like Bitrix24:
  
  [ 🔍 | Process: Patient Intake ✕ | Status: Active ✕ | _cursor_ ]

  Tag style:
  • Background: project primary blue (light tint, e.g. #E8F0FE)
  • Border: 1px solid project primary blue
  • Text: 13px, primary blue, "Field: Value"
  • ✕ icon right of each tag to remove that filter
  • Border-radius: 20px, padding: 3px 10px
  • Multiple tags wrap or scroll horizontally within the bar

- Right side of search bar when filters active:
  • ✕ Clear all button (grey text, 13px) to remove all filters
  • 🔍 Search icon (to trigger search)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 2. FILTER PANEL (on clicking funnel icon)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Clicking the existing filter funnel (▽) icon opens a 
dropdown filter panel directly BELOW the toolbar, 
full width of the content area:

Panel style:
- White background, border: 1px solid #E2E8F0
- Border-radius: 0 0 8px 8px (rounded bottom only)
- Padding: 16px
- Box-shadow: 0 4px 12px rgba(0,0,0,0.08)
- Appears with a smooth slide-down animation (200ms ease)

Panel layout — LEFT SECTION (filter options):

  Row 1:
  [ Status         ▼ ]   [ Process         ▼ ]   [ Responsible    ▼ ]

  Row 2:
  [ Last Contact   ▼ ]   [ Created on      ▼ ]   [ + Add field       ]

  Each filter field:
  • Label above: 11px grey uppercase
  • Input: 40px height, border 1px #E2E8F0, radius 6px, 
    chevron right, 13px text
  • Width: equal thirds of panel width with 12px gap

  "+ Add field" button:
  • Dashed border, teal text, 13px
  • On click → opens "Filter field settings" popup (see section 4)

Panel BOTTOM:
  [ select all checkbox ]    [ Search 🔍 ]  [ Reset ]  [ Save filter ]

  • "Search" button: primary blue fill, white text, 36px, radius 6px
  • "Reset": ghost button, grey border
  • "Save filter": text link, teal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 3. FILTER DROPDOWN BEHAVIOR (each field)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On clicking any filter dropdown:

STATUS dropdown options:
  ☐ Active
  ☐ Inactive  
  ☐ Pending

PROCESS dropdown options:
  ☐ Patient Intake
  ☐ Appointment Scheduling
  ☐ Follow-up Calls
  ☐ Billing Support
  ☐ Insurance Verification

RESPONSIBLE dropdown:
  Search input at top of dropdown
  Then list of team members as checkboxes

LAST CONTACT / CREATED ON dropdown:
  • Any date (default)
  • Today
  • Yesterday  
  • This week
  • Last 7 days
  • This month
  • Custom range → shows date picker inline

All dropdowns:
  • White card, 8px radius, shadow
  • Each option: checkbox left + label, 36px height
  • Checked: primary blue checkbox fill
  • Hover: #F0F9FF background
  • "Select all" at top of list
  • Confirm with "Apply" teal button at bottom of dropdown
  • On Apply → dropdown closes, tag appears in search bar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 4. "FILTER FIELD SETTINGS" POPUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Triggered by "+ Add field" in filter panel.
Full modal (not drawer-bound), centered on screen:

Header: "Filter field settings"  ✕

Top: search input "Find field..." + category tabs:
  [ Client ✓ ]  [ Process ✓ ]  [ Activity ✓ ]
  (tabs with blue checkmark when active, 
   pill-style, border-radius 20px)

Content: scrollable checkbox grid (4 columns):

  CLIENT section header (grey uppercase label):
  ☐ ID            ☐ Name          ☐ Email         ☐ Phone
  ☐ Status        ☐ Location      ☐ Company       ☐ Role
  ☐ Process       ☐ Responsible   ☐ Last Contact  ☐ Created On
  ☐ Company Size  ☐ Notes

  PROCESS section header:
  ☐ Patient Intake      ☐ Appointment Scheduling
  ☐ Follow-up Calls     ☐ Billing Support
  ☐ Insurance Verif.

  Each checkbox row: 36px height, 13px label, 
  blue checked state, hover tint

Bottom bar (fixed):
  [ ☐ select all ]    [ APPLY ]  [ CANCEL ]  [ ↺ default ]

  • APPLY: primary blue fill, white text, 40px, radius 6px
  • On Apply → selected fields appear as new filter 
    dropdowns in the filter panel
  • "default" link restores original filter fields

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### 5. ACTIVE FILTER STATE — TABLE HEADER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When filters are applied and Search is clicked:
- Filter panel collapses back up
- Applied filter tags appear in the smart search bar
- Table updates to show filtered results
- Funnel icon gets a filled/active state 
  (primary blue fill on the icon, or a blue dot badge)
- A subtle "X results found" count appears 
  below the search bar in 12px grey text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### COLOR & STYLE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- All interactive elements use the project's existing 
  primary blue and teal colors only
- Do not introduce any new colors
- Match font sizes, border-radius, and spacing to 
  existing MantraAssist component styles
- Filter panel and popups should feel native to the 
  existing design system
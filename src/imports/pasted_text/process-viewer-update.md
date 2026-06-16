MantraAssist — Process Viewer Drawer & List View Update Prompt

CONTEXT
MantraAssist is a healthcare CRM. The Process Viewer is a drawer/modal that opens when a user clicks View on any deal row in the Processes list page. It shows client deal details with a stage pipeline, two tabs (General Information & History), and scrollable content. The Figma already contains existing profile drawer components and process-specific stage logic — all of that must be respected and wired up.

CHANGE 1 — Drawer Size & Position
Current Problem:
The drawer opens too low on the screen, leaving too much dead space above it.
Fix:

The drawer must start from 20% from the top of the viewport (i.e. top: 20vh)
Height: 80vh
It should be centered horizontally, width: 70% of viewport, max-width 900px
Rounded corners on all four sides: border-radius: 16px
White background, subtle shadow: box-shadow: 0 -8px 40px rgba(0,0,0,0.18)
Dark semi-transparent overlay behind it: rgba(0,0,0,0.45)
The drawer is not a bottom sheet anymore — it is a centered floating modal panel that animates in from bottom but rests at top: 20vh
Closeable via X button (top right) or Escape key or clicking the backdrop
Grey drag handle bar at the very top center: 40px × 4px, border-radius: 4px, color #BDBDBD


CHANGE 2 — Remove These Fields from General Information Tab
Permanently remove the following fields from the General Information tab. Do not show them anywhere in the drawer:

Available to All
Random
Hypertension
Diabetes
UTM Parameters

Remaining fields to show (in this order):

Client Name
Responsible
Deal Type
Source
Start Date
End Date
Email ID
Country Code
Country
Time Slot
Comment


CHANGE 3 — All Fields Inline Editable by Default
Every field in the General Information tab must be directly editable inline — no separate Edit mode or Edit button needed.
Rules per field type:
Text fields (Client Name, Email ID, Comment):

Show as plain text by default
On hover: show a subtle underline or light background #F0F4FF to indicate editability
On click: transform into an <input type="text"> in place, auto-focused
On blur or Enter: save the value, revert to display mode

Date fields (Start Date, End Date):

On click: open a date picker dropdown inline
Show selected date in DD MMM YYYY format

Dropdown fields — use a styled select dropdown for:

Deal Type: options — Organic, Paid, Referral, Web
Responsible: searchable dropdown showing all team members with their avatar + name (this is also clickable — see Change 5)
Country: searchable country dropdown
Country Code: dropdown with dial codes (+91, +1, +44, etc.)
Time Slot: dropdown with time range options (8AM–8PM, 9AM–5PM, etc.)

All dropdowns:

Styled to match app design: white background, blue focus border #1E88E5, border-radius: 8px
Show a subtle chevron ▾ icon on the right
Searchable where list is long (Country, Responsible)

Auto-save behavior:

Every field saves immediately on change (blur/select)
Show a brief green checkmark toast bottom-right: "Saved ✓" for 2 seconds
On save failure: show red toast "Failed to save, try again"


CHANGE 4 — Stage Pipeline: Replace Circles with Rectangles
Current:
Circles connected by lines
New Design:
Horizontal row of rectangular stage chips/tabs, touching or with 4px gap, spanning full drawer width
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│   New    │Can't Con │Follow-up │Interested│Close Deal│
└──────────┴──────────┴──────────┴──────────┴──────────┘
Visual States:

Completed stages (before current): solid blue #1E88E5, white text, with a ✓ prefix
Current active stage: solid dark navy #1A2B4A, white bold text
Future stages: light grey #E8ECF0 background, grey text #9E9E9E

Dimensions:

Each rectangle: equal width (divide total width by number of stages), height 40px
First rectangle: border-radius: 8px 0 0 8px
Last rectangle: border-radius: 0 8px 8px 0
Middle ones: border-radius: 0
Font: 13px medium weight

Clickable Stage Update:

Every rectangle is clickable
On click: immediately update the active stage to the clicked one
Visually re-render all rectangles with updated completed/active/future states
Send an API update call to save the new stage
Show a toast: "Stage updated to [Stage Name] ✓"
Important: Each Process type has its own set of stages defined in Figma. The stage rectangles must render only the stages relevant to that specific process — not a hardcoded 5-stage list. Pull the correct stage list from the process's configuration/data


CHANGE 5 — Clickable Client Name & Responsible Person
Client Name:

Displayed as a blue hyperlink-style text (underline on hover)
On click: open the existing Client Profile Drawer that already exists in Figma
The client profile drawer should slide in from the right side (standard profile panel behavior)
Do not rebuild this drawer — wire up the click to trigger the existing component

Responsible Person:

Displayed as avatar + name, styled as a clickable dropdown
Single click on the name/avatar: opens the existing Responsible Person Profile Drawer from the right (already in Figma)
Click on the chevron ▾ beside the name: opens a searchable dropdown to reassign the responsible person
Dropdown shows: avatar + full name + role for each team member
On selecting a new person: save immediately, update display, show toast "Responsible updated ✓"


CHANGE 6 — Stage Update Also Applies in List View
The stage column in the main Processes list table must also be directly updatable:

The segmented rectangular progress bar in each row is clickable
On clicking any segment/stage block in the row: a small floating dropdown appears above/below that row showing all stages for that process as clickable options
On selecting a stage: update the row's stage bar immediately and save via API
The stage blocks shown must match the process-specific stages from Figma config — not a generic 5-stage list
Show a brief toast confirming the update


CHANGE 7 — History Tab Filtering
The Filter input at the top right of the History tab must be fully functional:
Filter behavior:

Real-time filtering as the user types (no submit button needed)
Filters across ALL columns simultaneously: Date & Time, Created By, Event Type, Description
Case-insensitive matching
Matching text in rows is highlighted in yellow #FFF176 background
Non-matching rows are hidden instantly
If no rows match: show centered message "No results found for '[query]'" in grey italic 14px
Clearing the input restores all rows

Additional filter chips above the table (optional enhancement):

All | Stage changed | Activity created | View
Clicking a chip filters by that event type
Active chip: blue background #1E88E5, white text
Combined with text filter (both apply simultaneously)


GENERAL DESIGN & BEHAVIOR RULES

Font: Inter or existing app font — consistent throughout
Primary blue: #1E88E5
Dark navy: #1A2B4A
Success green toast: #2E7D32 background, white text
Error red toast: #C62828 background, white text
Toast position: bottom-right, border-radius: 8px, auto-dismiss after 2 seconds
All transitions: 200–300ms ease
Drawer content area is independently scrollable (stage + tabs stay fixed, only tab content scrolls)
Stage pipeline and tab bar are sticky inside the drawer — they don't scroll away
All changes must be non-destructive — if an API call fails, revert the UI to its previous state and show error toast
The drawer must respect Figma's existing component logic — do not hardcode data, pull from the existing data/config layer
Keyboard accessible: Tab through fields, Escape closes drawer, Enter confirms edits
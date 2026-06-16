Here's the complete, detailed prompt for all these fixes and updates:

MantraAssist — Process Drawer & List View Fixes Prompt

CONTEXT
MantraAssist is a healthcare CRM built in Figma Make. The Processes page (/deals) has a list view table and a Process Viewer drawer/modal. Several bugs and missing features need to be fixed. All existing Figma components (Client Profile drawer, Team Member Profile drawer) must be reused — do not rebuild them.

FIX 1 — Client Profile Drawer Opens in Background (Z-Index Bug)
Current Problem:
When the user clicks the Client Name (blue hyperlink) inside the Process Viewer drawer, the Client Profile drawer opens but renders behind the Process Viewer drawer, making it invisible or partially hidden.
Fix:

The Client Profile drawer must always render on the highest z-index layer in the entire app
Set the Client Profile drawer's z-index to z-index: 9999 or higher than the Process Viewer drawer (z-index: 1000)
The stacking order must be:

  Page background         → z-index: 0
  Page overlay/backdrop   → z-index: 100
  Process Viewer drawer   → z-index: 500
  Process drawer backdrop → z-index: 499
  Client Profile drawer   → z-index: 9999  ← always on top
  Client backdrop overlay → z-index: 9998

When the Client Profile drawer is open, the Process Viewer drawer must still be visible underneath it but non-interactive (pointer-events: none on the process drawer while client profile is open)
Closing the Client Profile drawer must return full interactivity to the Process Viewer drawer beneath it


FIX 2 — Responsible Person Click Opens Team Member Profile Drawer
Current Problem:
Clicking the Responsible person's name/avatar in the General Information tab shows a placeholder tooltip "Profile coming soon" instead of opening the actual drawer.
Fix:

Remove the "Profile coming soon" placeholder entirely
The Responsible person field has two distinct click zones:

Zone A — Click on the avatar or name text:

Opens the existing Team Member Profile Drawer that already exists in Figma
This drawer slides in from the right side of the screen
Apply same z-index rules as Fix 1 — it must render above the Process Viewer drawer
Z-index: 9999

Zone B — Click on the chevron ▾ icon beside the name:

Opens a searchable dropdown to reassign the responsible person
Dropdown shows: circular avatar + full name + role for each team member
On selecting: save immediately, update display, show toast "Responsible updated ✓"
The two zones must be visually distinguishable — name/avatar is a clickable link style, chevron is a separate button


FIX 3 — Stage Click Must Visually Update the Stage Bar
Current Problem:
Clicking a stage in the popup updates the selection but the rectangular stage bar does not visually update — it stays the same color and does not reflect the new active stage.
Fix:

When a stage is clicked and confirmed, the stage bar must immediately re-render with the new state:

Rectangle visual states:

Completed stages (all stages before the active one): solid blue #1E88E5, white text, ✓ prefix
Current active stage: solid dark navy #1A2B4A, white bold text
Future stages: light grey #E8ECF0, grey text #9E9E9E
The update must be optimistic — update the UI immediately before the API response returns
If the API call fails: revert to the previous stage and show error toast "Failed to update stage, try again"
If successful: show toast "Stage updated to [Stage Name] ✓" in green
The stage bar in the list view row for the same deal must also update simultaneously to stay in sync


FIX 4 — Select Field & Create Field Options in Process Drawer
What to Build:
At the bottom of the General Information tab field list, add two action rows just like the Client Profile drawer already has:
Row 1 — Select Fields:

Label: ⚙ Select fields
On click: open a "Select Fields" panel (a floating card/popover) with:

Search input at top: placeholder "Find field..."
Section heading: "About Deal"
Grid of checkboxes (3 columns) showing all available fields:

Client Name, Responsible, Deal Type, Source, Start Date, End Date, Email ID, Country Code, Country, Time Slot, Comment, Status, Process


Bottom row: ☐ select all on left, CANCEL and SELECT buttons on right
SELECT button: blue #1E88E5, white text, saves visible field selection
Checking/unchecking controls which fields appear in General Information tab



Row 2 — Create Custom Field:

Label: + Create field
On click: open a "Create Custom Field" modal on top of everything with:
Fields in the modal:

Field Name: text input, placeholder "e.g. Insurance ID"
Field Type: dropdown with these exact options:

String
List
Date/Time
Date
Book a Resource
Address
Link
File
Money
Yes/No
Number
WhatsApp Link


Checkboxes:

☐ Multiple
☑ Show always (checked by default) with an ⓘ info icon tooltip: "This field will always be visible regardless of field selection"
☐ Enable field tooltip
☐ Make this field visible to selected users only


Footer buttons: Cancel (grey outlined) and Create Field (blue, disabled until Field Name and Field Type are filled)

Modal design:

White background, border-radius: 12px
Shadow: 0 8px 32px rgba(0,0,0,0.2)
Width: 480px, centered on screen
Z-index: 10000 (above everything)
Close via X button top-right or Cancel button



Styling of both action rows:

Light grey text #9E9E9E, 13px
Hover: text turns blue #1E88E5
Placed below the last field with a 1px solid #F0F0F0 divider above them
padding: 12px 0


FIX 5 — List View Stage Column: Remove Popup, Use Hover Tooltip + Click Update
Current Problem:
Clicking the stage bar in the list view opens the same popup as the Process drawer, which feels redundant and cluttered.
New Behavior:
Hover behavior:

When hovering over any individual stage block/segment in a row, show a small tooltip above that block with the stage name
Tooltip style: dark background #1A2B4A, white text, 12px, border-radius: 4px, padding: 4px 8px
Tooltip appears after 300ms hover delay, disappears immediately on mouse leave
No popup, no dropdown — just the tooltip

Click behavior:

Clicking directly on a stage block immediately updates that deal's stage to the clicked stage
No confirmation popup or intermediate step
The clicked block and all preceding blocks turn blue #1E88E5
The clicked block itself turns dark navy #1A2B4A (active state)
All following blocks turn grey #E8ECF0
Show a brief toast bottom-right: "Stage updated to [Stage Name] ✓"
Save via API in the background
On API failure: revert the visual state and show error toast


FIX 6 — History Tab Filter: Advanced Filter Popup
Current Problem:
The filter input in the History tab is a simple text search. It needs to be replaced with an advanced filter panel matching the reference design.
New Behavior:
Filter input appearance:

Keep the "Filter..." input field as-is visually
On clicking the filter input, open an advanced filter popup/popover anchored below-left of the input

Filter popup layout:
┌─────────────────────────────────────────┐
│  Filter                                  │
│                                          │
│  ┌──────────────────┐                   │
│  │ Created by me    │ ← quick filter    │
│  │ Created Today    │                   │
│  │ Created Yesterday│                   │
│  └──────────────────┘                   │
│                                          │
│  Type                                    │
│  ┌─────────────────────────────── ▾ ┐   │
│  │ Not specified                     │   │
│  └───────────────────────────────────┘   │
│                                          │
│  Event Type                              │
│  ┌─────────────────────────────── ▾ ┐   │
│  │ Not specified                     │   │
│  └───────────────────────────────────┘   │
│                                          │
│  Created By                              │
│  ┌───────────────────────────────────┐   │
│  │ [text input]                      │   │
│  └───────────────────────────────────┘   │
│                                          │
│  Date                                    │
│  ┌─────────────────────────────── ▾ ┐   │
│  │ Any date                          │   │
│  └───────────────────────────────────┘   │
│                                          │
│  + Add field    Restore default fields   │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │   🔍 Search  │  │     Reset       │  │
│  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
Popup specifications:

Quick filters (top left column, stacked): "Created by me", "Created Today", "Created Yesterday" — clicking any applies that filter instantly and highlights it blue
Type dropdown: options — Not specified, Activity, Stage Change, View, System
Event Type dropdown: options — Not specified, View, Stage changed, Activity created
Created By: free text input, filters by person name
Date dropdown: options — Any date, Today, Yesterday, Last 7 days, Last 30 days, Custom range (shows date picker if selected)
+ Add field: opens a sub-menu to add more filter criteria
Restore default fields: resets the filter panel back to its default state
Search button: blue #1E88E5, applies all selected filters to the history table
Reset button: grey outlined, clears all filters and shows all history rows

Popup design:

White background, border-radius: 12px
Shadow: 0 8px 24px rgba(0,0,0,0.15)
Width: 420px
Z-index: above the drawer content but below the drawer header
Close by clicking outside the popup
All dropdowns use the standard app dropdown style

How filtering applies to the table:

On clicking Search: filter the history rows using AND logic across all filled criteria
Matching rows remain visible, non-matching rows are hidden
If no rows match: show "No results found" centered in grey italic
The filter input field shows a blue dot indicator when filters are active
Clicking Reset or clearing all fields restores the full history list


GENERAL RULES FOR ALL FIXES

No page reloads — all changes are client-side reactive
Optimistic UI — update visuals immediately, sync to backend async
Error recovery — always revert on API failure with red error toast
Toast position: bottom-right, auto-dismiss after 2 seconds
Z-index hierarchy (strict):

  Page                    → 0
  Sidebar                 → 100
  Page overlays           → 200
  Process Viewer drawer   → 500
  Filter popup            → 600
  Client/Team drawers     → 9999
  Create Field modal      → 10000

Escape key closes the topmost open layer only — not everything at once
All existing Figma components must be reused as-is — do not recreate Client Profile or Team Member Profile drawers
Font, colors, spacing must stay consistent with existing MantraAssist design system throughout
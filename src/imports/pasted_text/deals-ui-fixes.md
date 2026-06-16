These are targeted fixes to the Process Viewer drawer, list view stage bar, History tab toolbar, and the Responsible Person profile drawer IN /DEALS . The Settings → Teams section already has a Team Member Profile drawer — that exact component must be reused.

FIX 1 — Stage Bar: Clicked Block Must Turn Blue Immediately
Current Problem:
Clicking a stage block in the stage bar does not visually change the block color. The stage updates in data but the UI does not reflect it.
Fix — Exact Color Behavior:
When a stage is clicked, immediately re-render all blocks using this exact logic:
Stage 1 (New)           → always the leftmost block
Stage N (clicked/active) → the currently selected stage
Color rules:

All blocks to the LEFT of active (completed stages): background #1E88E5 (solid blue), white text, prefix ✓
The ACTIVE block (currently selected stage): background #1A2B4A (dark navy), white bold text, no prefix
All blocks to the RIGHT of active (future stages): background #E8ECF0 (light grey), text #9E9E9E (grey)

This must apply in BOTH:

The Process Viewer drawer stage bar
The list view Stage column segment blocks

Implementation requirement:

The color change must be instantaneous on click — do not wait for API response
Use optimistic UI: update visually first, then sync to backend
On API failure: revert colors to previous state, show error toast "Failed to update stage"
On success: show toast "Stage updated to [Stage Name] ✓" in green


FIX 2 — Move "Create field" Into Same Row as "Select fields"
Current Layout (wrong):
⚙ Select fields        ← row 1
+ Create field          ← row 2
New Layout (correct):
⚙ Select fields    + Create field     ← single row, side by side
Specifications:

Both items sit on the same horizontal row at the bottom of the General Information tab
⚙ Select fields on the left
+ Create field on the right, same line
Separator between them: a vertical divider | in grey #E0E0E0, or just spacing of 24px
Both are grey text #9E9E9E, 13px
Both turn blue #1E88E5 on hover
Row height: 44px, with 1px solid #F0F0F0 divider above the row
No change to the functionality of either — just the layout


FIX 3 — History Tab: Separate Date and Time Columns + Search Bar + Filter Icon
Current Problem:
The History table has a single "Date & Time" column, no visible search bar, and a text "Filter..." placeholder.
Changes:
A — Split Date & Time into Two Separate Columns:
Replace the single "DATE & TIME" column with two columns:
┌──────────────┬──────────┬─────────────┬──────────────┬─────────────────────┐
│  DATE        │  TIME    │  CREATED BY │  EVENT TYPE  │  DESCRIPTION        │
├──────────────┼──────────┼─────────────┼──────────────┼─────────────────────┤
│  26.05.2024  │  14:32   │  J John S.  │ Stage changed│ New → Close Deal    │
│  25.05.2024  │  10:15   │  J John S.  │ Activity...  │ Contact customer... │
└──────────────┴──────────┴─────────────┴──────────────┴─────────────────────┘
Column widths:

DATE: 110px
TIME: 70px
CREATED BY: 150px
EVENT TYPE: 150px
DESCRIPTION: remaining width (flex)

B — Replace Text Filter with Search Bar + Filter Icon:
Remove the plain "Filter..." text placeholder. Replace with a two-element toolbar row above the table:
┌─────────────────────────────────────────┬──────┐
│  🔍  Search history...                  │  ⚙   │
└─────────────────────────────────────────┴──────┘
Search bar (left, ~85% width):

Full-width input with a magnifying glass 🔍 icon on the left inside the input
Placeholder text: "Search history..."
Real-time filtering across all columns as user types
Rounded corners: border-radius: 8px
Border: 1px solid #E0E0E0, focus border #1E88E5
Height: 36px
Background: white

Filter icon button (right, ~15% width):

Show a filter/funnel icon only — no text label at all
Use a standard filter funnel icon (e.g. from Lucide: SlidersHorizontal or Filter)
Icon size: 18px, color #757575
Button: 36px × 36px, border-radius: 8px, border 1px solid #E0E0E0
Hover: background #F0F4FF, icon color #1E88E5
When filters are active (any filter applied): show a small blue dot 8px in the top-right corner of the icon button as an indicator
On click: opens the advanced filter popup (same as previously specified — Type, Event Type, Created By, Date dropdowns with Search and Reset buttons)


FIX 4 — Responsible Person Click Opens Settings → Teams Profile Drawer
Current Problem:
Clicking the Responsible person's name in the Process Viewer opens the wrong component or a placeholder.
Fix:
The Settings → Teams section already has a Team Member Profile drawer with:

Person's avatar (large, circular)
Name + email
Status badges: "Email verified", "Active member", "Calendar connected"
Tabs: Personal Info | Calendar | Availability | Days Off | Services
Calendar tab shows: Day/Week/Month/Schedule toggle, + Create button, and a monthly calendar view
A full-width "Save Changes" button at the bottom

Requirements:

On clicking the Responsible person's name or avatar in the General Information tab: open this exact same drawer — pull the existing component, do not rebuild it
The drawer must open on the right side of the screen, sliding in from the right
It must render at z-index: 9999 — above the Process Viewer drawer
The drawer must show the correct team member's data matching the responsible person of that deal
The Process Viewer drawer must remain visible but non-interactive underneath (pointer-events: none, no dimming needed)
Closing the Team Member drawer (via X button or Escape) returns full interactivity to the Process Viewer drawer

Two distinct click zones on the Responsible field (unchanged from before):
Click targetActionAvatar + Name textOpens Team Member Profile drawer (Settings → Teams version)Chevron ▾ iconOpens reassign dropdown to change responsible person
The chevron dropdown behavior:

Searchable list of team members: avatar + name + role
On selecting: update immediately, show toast "Responsible updated ✓"
The name displayed in the field updates to the newly selected person


GENERAL RULES

No page reloads for any of these changes
Optimistic UI on all stage updates — update visually first
Z-index hierarchy remains:

  Page                    → 0
  Process Viewer drawer   → 500
  Team Member drawer      → 9999
  Create Field modal      → 10000

Escape key closes only the topmost layer
All toast notifications: bottom-right, border-radius: 8px, auto-dismiss 2 seconds
Success toast: green #2E7D32 background
Error toast: red #C62828 background
Reuse existing Figma components — do not recreate anything that already exists in the design system

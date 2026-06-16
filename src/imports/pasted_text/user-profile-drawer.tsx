In the Figma file "Mantra-assist-25may (Copy)", the Settings → Team page at funnel-style-39656852.figma.site/settings now has a working slide-in drawer from the right showing John Smith's profile. The drawer currently has: avatar, name, email, three status badges (Email verified, Active member, Calendar connected), and a Calendar tab with Connected Accounts section.
Make the following updates to this drawer only. Do not touch anything else.

CHANGE 1 — Remove the Edit button, make drawer fully inline-editable by default:

Remove the "Edit" button from the top of the drawer entirely
All fields inside the drawer must be inline-editable by default from the moment the drawer opens — no button needed to enable editing
Fields that have a fixed set of options (like Gender, Role, Language, Country, Timezone) must use a dropdown select instead of a plain text input
Fields that are free text (like Name, Email, Phone) use a standard text input
At the top of the drawer, show "Save Changes" and "Cancel" buttons permanently (since editing is always active)
Clicking Save commits all changes; Cancel reverts all fields to their last saved values


CHANGE 2 — Add a Personal Information section at the top of the drawer (before the tabs):
Below the avatar, name, email, and three status badge pills — and above the tab row — add a Personal Information section with the following fields laid out in a clean 2-column grid:

Full Name (text input)
Email (text input)
Phone (text input)
Gender (dropdown: Male, Female, Other, Prefer not to say)
Date of Birth (date picker input)
Role (dropdown: Admin, Manager, Agent, Supervisor)
Language (dropdown: English, Hindi, and other common languages)
Country (dropdown: India, USA, UK, and other countries)
Timezone (dropdown: Asia/Kolkata, UTC, and other timezones)
Status (toggle: Active / Inactive)

Each field must have a small label above it. All fields are inline-editable by default (no edit button needed). Use dropdowns wherever options are available.
Below the standard fields, add two special interactive field types exactly as follows:

"Select Field" — a button or row labeled "+ Select Field" that when clicked opens a dropdown list of additional optional fields the user can choose to add to the profile (e.g. Address, Department, Notes, Custom Tag). Selecting one adds it as a new editable field in the Personal Information section
"Create Field" — a button or row labeled "+ Create Field" that when clicked opens a small inline form to define a brand new custom field: the user types a field name, selects a field type (Text, Number, Date, Dropdown), and confirms to add it to the profile section

Both "+ Select Field" and "+ Create Field" must appear at the bottom of the Personal Information section as clearly styled action rows, not as modal popups — they expand inline within the drawer.

CHANGE 3 — Update the Calendar tab with full calendar functionality:
The Calendar tab must now have the following layout from top to bottom:
Section A — Sync with your Calendar (keep existing):

Blue calendar icon + heading "Sync with your Calendar" + subtitle "Connect your calendar accounts to automatically sync appointments and prevent double bookings across all your platforms."
Keep this section exactly as it is

Section B — Full Calendar View (NEW, add below Section A):

Show a full interactive calendar for the team member
At the top of the calendar show view toggle buttons: Day | Week | Month — clicking each switches the calendar view
Show a "+ Create" button (blue, prominent) at the top right of the calendar section — clicking it opens a "New Event" creation form inline or as a small panel with the following fields:

Event name (text input)
Event date and time (date + time picker for start)
Event end date and time (date + time picker for end)
All day checkbox
Calendar (dropdown showing the team member's calendar name)
Repeat (dropdown: Don't repeat, Daily, Weekly, Monthly)
Location (dropdown or text: Select a meeting room)
Attendees (multi-select input with "+ Add" option)
Save and Cancel buttons at the bottom of the form


The calendar itself must show a time-slot grid for Day/Week view, and a date grid for Month view
Any created events must appear as colored blocks on the calendar at their scheduled time
On the right side of the calendar show a mini month calendar (small date picker grid) for quick date navigation

Section C — Account Settings drawer/accordion (NEW, add below Section B):

Show a section labeled "Account Settings" with a subtle divider above it
Inside Account Settings, show two collapsible accordion/FAQ-style dropdowns (collapsed by default, clicking the header expands them):
Accordion 1 — "Connected Accounts":
When expanded shows:

Google row: Google logo (blue circle with G) + "Google" label + "john.smith@healthcare.com" + red "Disconnect" text button on the right
Outlook row: Outlook logo (orange circle with O) + "Outlook" label + "john.smith@outlook.com" + red "Disconnect" text button on the right

Accordion 2 — "Connect New Account":
When expanded shows four provider tiles in a 2x2 grid:

Microsoft (blue tile with Microsoft logo)
Apple iCloud (black tile with Apple logo)
Google (white tile with Google logo)
Outlook (blue tile with Outlook logo)
Each tile is clickable to initiate connecting that calendar account



Both accordions have a chevron (▼/▲) icon on the right that rotates when expanded/collapsed.

SUMMARY OF TAB CONTENT ORDER (Calendar tab, top to bottom):

Sync with your Calendar hero section (existing, keep)
Full interactive calendar with Day/Week/Month views, Create Event button, mini month navigator
Account Settings section with two collapsible accordions: Connected Accounts and Connect New Account


All other tabs (Availability, Days Off, Services, Permissions) remain completely unchanged.
Apply all changes only inside the team member profile drawer in Settings → Team (Organization section, above Billing). Do not modify any other page, route, or component.
After all changes are made, save and re-publish the Figma site and confirm all changes are visible on the live URL funnel-style-39656852.figma.site/settings before marking done.
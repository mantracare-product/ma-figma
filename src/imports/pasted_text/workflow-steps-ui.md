Add a "Workflow Steps" section below the POST CALL ACTIONS accordion on the Stage Basic tab panel. Apply to every stage detail panel across all processes.

PART 1: Workflow Steps Accordion Container

Wrap in a single bordered container — same border, border-radius, padding, background, and styling as Caller Pitch, IN CALL ACTIONS, and POST CALL ACTIONS accordions
Header row:

Left: "Workflow Steps" label — same font color (dark/black), size, and weight as other accordion headers
Right: chevron icon — rotates 180° when expanded, points down when collapsed


Expanded by default
Grey subtitle below header: Configure the automated steps that run for this stage.


PART 2: Empty State
When no steps exist, show inside the expanded container:

Grey centered message: No workflow steps added yet.
+ Add Step blue button at the bottom — same blue (#2563EB or the app's primary blue) as all other primary buttons in the app


PART 3: Side Drawer — Full Detailed Spec
Clicking + Add Step opens a right-side sliding drawer. The drawer overlays the page from the right edge. No background color changes — use only the app's single primary blue color (#2563EB or equivalent) for all active/selected/highlighted states. No other accent colors anywhere in the drawer.
Drawer Overall Layout:

Full viewport height, fixed width (~420px)
White background
Subtle left border or box shadow to separate from page
Two sections side by side inside: left category panel (~40%) and right steps list panel (~60%)
Closes via X button in the top-right corner of the drawer

Drawer Header (top of drawer, full width):

Title: Add Workflow Step — large, bold, dark text
Subtitle below title: Choose and configure the step before adding it to this stage. — small grey text
X close button — top right corner, grey icon

Search Bar (below header, full width):

Full-width text input
Left-aligned search icon (magnifying glass) inside the input
Placeholder text: Search workflow steps...
Border: light grey, rounded corners
No color fill — white background

Left Category Panel:

White background with a subtle right border separating it from the steps list
Vertically stacked list of category items, each row contains:

Icon on the left (use blue color — same primary blue — for all category icons)
Category name in dark bold text
Category description in small grey text below the name


Categories (in this exact order):

Icon: sparkle/all-steps icon — All Steps / Browse all available workflow steps
Icon: workflow/branch icon — Workflow Logic / Control flow and timing
Icon: element/grid icon — Element Management / Manage stages, processes, and fields
Icon: phone icon — Telephony / Phone call management
Icon: message/chat icon — Communication / Send messages and notifications
Icon: database icon — CRM / EHR / Customer and health records
Icon: webhook/link icon — Webhook / API / External integrations
Icon: calendar icon — Appointment / Schedule and manage appointments


Active/selected category row: blue background (primary blue) with white text and white icon — same pill or full-row highlight style used elsewhere in the app
Inactive rows: no background, dark text, blue icons
Scrollable if content overflows

Right Steps List Panel:

White background
Vertically stacked list of step cards, one per row
Each step card contains:

Left: colored icon container — blue background square/circle with white icon inside (use only primary blue — no orange, green, purple, or other colors for any icon backgrounds)
Middle: text block

Step name in dark bold text (e.g. Wait / Delay)
Step description in small grey text below (e.g. Pause the workflow for a specific time before continuing to the next step.)


Right: > chevron arrow in grey


Card hover state: light blue background tint on the card row
Selected/active card: blue border outline around the card
Cards are separated by subtle dividers or spacing
Panel is scrollable

Full Step List (ALL STEPS view, in this exact order):

Wait / Delay — Pause the workflow for a specific time before continuing to the next step.
End Workflow — Terminate the workflow and mark the contact as complete.
Stage Movement — Move the contact to a different stage within the same or another process.
Process Movement — Move the contact to a different process and select the target stage.
Field Update — Update a specific field value for the contact or record.
Assign to a Human — Assign a human team member to review or handle this contact.
Call Action — Initiate, transfer, or manage phone calls with contacts.
WhatsApp (with Popular badge in blue pill next to name) — Send WhatsApp messages to contacts using pre-configured templates.
SMS — Send SMS text messages to contacts using pre-configured templates.
Email — Send email notifications to contacts using pre-configured templates.
CRM Update — Update or create records in your connected CRM system.
EHR Update — Update or sync patient data with your connected EHR system.
Trigger Webhook — Send data to external systems using webhooks with custom variables.
Trigger API — Make HTTP API calls to external services with custom headers and body.
Book Appointment — Check team availability and book appointments with calendar integration.
Reschedule Appointment — Reschedule existing appointments to a new date and time.

The Popular badge on WhatsApp is a small blue pill with white text — primary blue only, no other color.
Category Filtering:

Clicking a category on the left filters the right panel to show only relevant steps
Workflow Logic shows: Wait / Delay, End Workflow, Stage Movement, Process Movement
Element Management shows: Field Update, Assign to a Human
Telephony shows: Call Action
Communication shows: WhatsApp, SMS, Email
CRM / EHR shows: CRM Update, EHR Update
Webhook / API shows: Trigger Webhook, Trigger API
Appointment shows: Book Appointment, Reschedule Appointment
All Steps shows all 16 items


PART 4: Step Added — Card Inside Workflow Steps Container
When a step is selected from the drawer, it is added to the Workflow Steps list and the drawer closes. Each added step renders as a card:

Far left: drag handle icon (⠿ six dots) in grey — for drag-to-reorder
Next: step icon in a blue square/circle (primary blue background, white icon) — same icon as shown in the drawer
Text block:

Step name in bold dark text
→ Sequential tag in grey below the name
Click to configure grey text link below that


Bottom of card: Click to edit settings > grey text link
Far right: three icon buttons in a row:

Duplicate icon (grey)
Settings/edit icon (grey)
Delete/trash icon (red)


Cards stack vertically in order added, drag-reorderable
+ Add Step button always visible at the bottom of the container below all cards


Apply everything above to every stage detail panel across all processes.
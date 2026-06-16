In the Figma file "Mantra-assist-25may (TEAM-M)" at memo-dime-73148558.figma.site/settings, go to Settings → Numbers page. Make the following precise changes:

CHANGE 1 — Replace Actions column with 3-dot burger menu:

Remove the Actions column entirely from the phone numbers table
Add a 3-dot vertical ellipsis (⋮) icon at the very left of each row, before the Phone Number column
The ⋮ icon must be always visible by default on every row — not only on hover
Clicking the ⋮ icon opens a small dropdown with the following action options:

Edit
Delete
Any other actions that were previously in the Actions column


The dropdown must close when clicking outside it


CHANGE 2 — Edit mode: restrict which fields are editable:

When the user clicks "Edit" from the 3-dot dropdown, the row enters inline edit mode
The following fields must be read-only and NOT editable in edit mode — they must remain as plain non-interactive text:

Phone Number
Country
Priority
Provider
Cost Incoming
Cost Outgoing


The following fields must remain editable in edit mode:

Countries Served
Inbound/Outbound (dropdown)
Status (toggle)
Process (dropdown)
Any other configurable fields


When in edit mode, show a ✓ confirm (blue checkmark button) and × cancel (grey X button) at the end of the row to save or discard changes
Read-only fields must be visually distinct in edit mode — styled as greyed-out or plaintext so it is clear they cannot be edited


CHANGE 3 — "Buy Number" button opens a popup with full phone number options functionality:

Clicking the "+ Buy Number" button at the top right of the Numbers page must open a popup modal (centered on the page, with dark semi-transparent backdrop)
The popup has a left sidebar panel and a right content area

Left sidebar of the popup contains these clickable options (like a vertical menu):

Free Vapi Number (default selected)
Free Vapi SIP
Import Twilio
Import Vonage
Import Telnyx
BYO SIP Trunk Number

Each option is clickable and changes the right content area to show the relevant form
Right content area — form for each option:
1. Free Vapi Number (default view):

Label: "Area Code"
Text input with placeholder "725" for entering US area code
Info notice box below: "Free US phone numbers • Up to 10 per account — Only US area codes are supported. For international numbers, use the import options above."
Bottom buttons: "Cancel" (outlined) and "Create" (solid teal/green)

2. Free Vapi SIP:

Label: "SIP Identifier" — text input with placeholder "my-example-identifier"
Helper text below input: "Will be used as: sip:identifier@sip.vapi.ai"
Label: "Label" — text input with placeholder "Label for SIP URI"
Section heading: "SIP Authentication (Optional)"
Label: "Username" — text input with placeholder "SIP Authentication Username"
Label: "Password" — text input with placeholder "SIP Authentication Password" (masked)
Blue hyperlink text: "Read more about using SIP with Vapi in the documentation"
Bottom buttons: "Cancel" and "Import SIP URI" (solid teal)

3. Import Twilio:

Label: "Twilio Phone Number" — country flag dropdown (🇺🇸) + phone number text input with placeholder "+14156021922"
Label: "Twilio Account SID" — text input with placeholder "Twilio Account SID"
Label: "Twilio Auth Token" — text input with placeholder "Twilio Auth Token"
Label: "Label" — text input with placeholder "Label for Phone Number"
Toggle row: "SMS Enabled" label + subtitle "Enable SMS messaging for this phone number" + toggle switch on the right (default ON/teal)
Bottom buttons: "Cancel" and "Import from Twilio" (solid teal)

4. Import Vonage:

Label: "Vonage Phone Number" — country flag dropdown (🇺🇸) + phone number text input with placeholder "+14156021922"
Label: "API Key" — text input with placeholder "Enter API Key"
Label: "API Secret" — text input with placeholder "Enter API Secret"
Label: "Label" — text input with placeholder "Label for Phone Number"
Bottom buttons: "Cancel" and "Import from Vonage" (solid teal)

5. Import Telnyx:

Label: "Telnyx Phone Number" — country flag dropdown (🇺🇸) + phone number text input with placeholder "+14156021922"
Label: "API Key" — text input with placeholder "Enter API Key"
Label: "Label" — text input with placeholder "Label for Phone Number"
Bottom buttons: "Cancel" and "Import from Telnyx" (solid teal)

6. BYO SIP Trunk Number:

Label: "Phone Number" — text input with placeholder "+14155551234"
Checkbox row: "Allow non-E164 phone numbers" with subtitle: "Check this box to disable E164 format validation and use custom phone number formats"
Label: "SIP Trunk Credential" — dropdown with placeholder "Select a SIP trunk credential"
Label: "Label" — text input with placeholder "Label for Phone Number"
Blue hyperlink text: "Read more about SIP trunking in the documentation"
Bottom buttons: "Cancel" and "Import SIP Phone Number" (solid teal)

Popup general specs:

Dark background popup (dark grey/charcoal theme matching Vapi's dark UI style)
Left sidebar options in white text, selected option highlighted in teal/green
All inputs styled with dark background and light placeholder text
(×) close button at top right of the popup
Clicking Cancel or (×) closes the popup without saving


Apply all three changes only within the Settings → Numbers page. Do not modify any other page, route, drawer, or component.
After all changes, save and re-publish the Figma site and confirm all updates are visible
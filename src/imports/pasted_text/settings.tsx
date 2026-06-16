In Settings.tsx, make the following precise changes to add a new "Security" settings tab:

Step 1: Add Security to the tabs array
In the tabs array defined near the top of the component, add a new entry after the "audit-logs" entry with id "security" and label "Security".

Step 2: Add four new state groups for Security
Near the other state variable declarations, add the following state variables:
For SMS Bot Spammers: an array state smsBotSpamPhrases typed as array of objects with id as number, phrase as string, and enabled as boolean, defaulting to one empty entry with id 1, phrase empty string, and enabled true.
For Robo Call Detection: a boolean roboCallDetectionEnabled defaulting to true. A boolean roboCallDetectionExpanded defaulting to false.
For Blocked Numbers: an array state securityBlockedNumbers typed as array of objects with id as number, countryCode as string defaulting to "+1", and phoneNumber as string, defaulting to one entry. A number state blockedNumbersCount derived from the array length, used to show the badge count. A boolean blockedNumbersExpanded defaulting to false.
For Bot Block Phrases: an array state botBlockPhrases typed as array of objects with id as number, phrase as string, and enabled as boolean, defaulting to one empty entry. A boolean botBlockPhrasesExpanded defaulting to false.
For the SMS Bot Spammers accordion: a boolean smsBotSpammersExpanded defaulting to false.

Step 3: Add the Security tab content JSX block
After the audit-logs tab content block and before the closing of the content area div, add a new conditional block that renders when activeTab === "security". Inside it render the following structure:
A page header with title "Security" and subtitle "Configure security and spam protection settings."
Below the header render four accordion sections, each following the same pattern: a rounded bordered white card div. The card has a header row that is a flex justify-between items-center div with padding 4 and a hover gray background. The left side of the header shows an icon followed by the section title in bold small font and an Info icon with a tooltip. The right side shows a toggle switch and a ChevronDown icon that rotates 180 degrees when expanded. The header row itself is clickable and closes the accordion when already expanded. The toggle switch independently controls the enabled state using stopPropagation so clicking toggle doesn't bubble to the close handler. When expanded a border-t separator appears and the content renders below.

Section A — SMS Bot Spammers:
Use icon MessagesSquare from lucide with text-primary color. Title "SMS Bot Spammers". Tooltip text "Block spam SMS messages by defining phrases that trigger automatic filtering."
Toggle bound to a boolean smsBotSpammersEnabled state defaulting to true. Accordion expansion controlled by smsBotSpammersExpanded.
Expanded content shows a flex justify-between header row with bold small label "SMS Spam Phrases" on the left and an "Add Phrase" button on the right that pushes a new object into smsBotSpamPhrases with a new Date.now() id, empty phrase string, and enabled true.
Below that render each phrase in smsBotSpamPhrases as a bordered rounded card containing: a text input bound to phrase with placeholder "Enter spam phrase to block", a small toggle switch bound to enabled on that item, and a "Remove" button that filters that item out of the array. Below all phrases render a right-aligned blue Save button that calls toast.success("SMS Bot Spammer phrases saved").

Section B — Robo Call Detection:
Use icon PhoneOff from lucide with text-primary color. Title "Robo Call Detection". Tooltip text "Automatically detect and filter robocalls before they reach your system."
On the right side of the header, when roboCallDetectionEnabled is true show a small pill badge with green background and text "On" in green; when false show a gray "Off" pill. Also show the toggle and chevron. Accordion expansion controlled by roboCallDetectionExpanded.
Expanded content shows a flex justify-between row with on the left a bold small label "Enable Robo Call Detection" and below it a muted description text "Automatically detect and filter robocalls". On the right a toggle switch bound to roboCallDetectionEnabled and setRoboCallDetectionEnabled. Below this row render a right-aligned blue Save button that calls toast.success("Robo Call Detection settings saved").

Section C — Blocked Numbers:
Use icon Ban from lucide with text-primary color. Title "Blocked Numbers". Tooltip text "Block specific phone numbers from contacting your system."
On the right side of the header, when securityBlockedNumbers has at least one entry with a non-empty phoneNumber show a small orange circular badge displaying the count of filled entries. Also show the chevron. Accordion expansion controlled by blockedNumbersExpanded.
Expanded content shows a flex justify-between header row with bold small label "Blocked Phone Numbers" on the left and an "Add Number" button on the right that pushes a new entry into securityBlockedNumbers with new id, countryCode "+1", and empty phoneNumber.
Below that render each entry in securityBlockedNumbers as a flex row containing: a country code select with options +1, +44, +91, +61, +81 bound to countryCode, a tel input bound to phoneNumber with placeholder "Phone number", and a "Remove" button that filters that item out. Below all entries render a right-aligned blue Save button that calls toast.success("Blocked numbers saved").

Section D — Bot Block Phrases:
Use icon Shield from lucide with text-primary color. Title "Bot Block Phrases". Tooltip text "Define phrases that identify and block bot callers automatically."
Toggle bound to a boolean botBlockPhrasesEnabled state defaulting to true. Accordion expansion controlled by botBlockPhrasesExpanded.
Expanded content shows a flex justify-between header row with bold small label "Block Phrases" on the left and an "Add Phrase" button on the right that pushes a new entry into botBlockPhrases with new id, empty phrase, and enabled true.
Below that render each phrase entry as a bordered card containing: a text input bound to phrase with placeholder "Enter phrase to block", a small toggle switch bound to enabled on that item, and a "Remove" button that filters it out. Below all entries render a right-aligned blue Save button that calls toast.success("Bot Block Phrases saved").

Step 4: Styling consistency
All four sections should use the same visual style as the existing accordion sections in the Process.tsx or Settings.tsx file — white background, border border-border, rounded-xl, consistent padding, the same toggle switch markup pattern using sr-only peer checkbox with the animated div track, and the same blue Save button style using bg-blue-600 text-white rounded-lg px-4 py-2 text-sm. All labels use fontFamily DM Sans for headings and Outfit for body text matching the existing file conventions.

Step 5: No other changes
Do not modify any existing tabs, state variables, handlers, or JSX outside of the Security tab block. Only add the new tab entry to the tabs array, the new state variables, and the new JSX conditional block.
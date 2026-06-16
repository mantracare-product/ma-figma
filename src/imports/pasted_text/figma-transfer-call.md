Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Complete "Transfer Call" Section — Full Flow Build

**Location:** Process page → Stage detail panel (right side) → **"Transfer Call"** accordion section (currently shows "No data" empty state — Image 1)

---

## SCREEN 1 — Transfer Call Section (Expanded / Default State)

**Reference: Image 2**

### Section Header:
- Phone/transfer icon (blue `#2563EB`) + label **"Transfer Call"** bold, font size 15px, color `#111827`
- Info `ⓘ` icon after label, color `#9CA3AF`
- Right side: pill badge **"Recommended"** — border `1px #D1D5DB`, background white, text `#374151`, font size 12px, border-radius 20px, padding 4px 10px
- Chevron `∧` collapse icon, right-aligned, color `#6B7280`
- Bottom border separator: `1px #E5E7EB`

### Info Banner (below header):
- Light blue-gray background `#EFF6FF`, border-radius 8px, padding 12px 14px
- Info circle icon `ⓘ` color `#2563EB` left-aligned
- Text: *"Teach your AI Receptionist how to intelligently transfer the call."* — font size 13px, color `#374151`

### Audio Preview Card:
- Background `#EFF6FF`, border-radius 10px, padding 14px 16px
- Top label: **"Listen to how our AI transfers calls professionally"** — color `#2563EB`, font size 13px, font-weight 600
- Below: audio player row —
  - Blue play button `▶` circle, fill `#2563EB`, size 32×32px
  - Progress bar: full-width light blue track `#BFDBFE`, no fill (0:00), height 4px, border-radius 2px
  - Timestamp `0:00` right-aligned, font size 12px, color `#6B7280`

### Empty State (No scenarios added yet):
- Centered illustration: document/letter icon with speech bubble dots (gray tones, same style as Image 2)
- Text below: **"No data"** — font size 13px, color `#9CA3AF`, centered

### Bottom Action Bar:
- Right-aligned, two buttons side by side:
  - **"+ Add"** button — border `1px #2563EB`, background white, text `#2563EB`, font size 13px, border-radius 8px, padding 8px 16px, `+` icon before text
  - **"Learn More"** button — border `1px #D1D5DB`, background white, text `#374151`, font size 13px, border-radius 8px, padding 8px 16px, external link icon before text

---

## SCREEN 2 — "Add Call Transferring Workflow" Modal (Popup)

**Triggered by:** Clicking **"+ Add"** button
**Reference: Images 3, 4, 6**

### Modal Container:
- Centered modal overlay with dim background `rgba(0,0,0,0.4)`
- Modal width: **660px**, max-height: **80vh**, scrollable body
- Background: white, border-radius: 12px
- Box shadow: `0px 8px 32px rgba(0,0,0,0.16)`

### Modal Header:
- Title: **"Add Call Transferring Workflow"** — font size 18px, font-weight 700, color `#111827`
- Close `×` button top-right, color `#6B7280`, size 20px

### Scrollable Body:

**Scenario Card (Scenario 1 by default):**
- Bordered card, border `1px #E5E7EB`, border-radius 10px, padding 20px
- Card header row: **"Scenario 1"** label — font size 14px, font-weight 700, color `#111827`
  - No delete button on Scenario 1 (first scenario cannot be deleted)
  - For Scenario 2+: show **"Delete"** button — background `#2563EB`, white text, trash icon, border-radius 6px, padding 6px 14px, font size 13px (Image 4)

**Field 1 — Scenario Description:**
- Label: **"Scenario Description"** — color `#2563EB`, font size 14px, font-weight 600 + `ⓘ` info icon
- Input: full-width text input, placeholder: *"e.g. Transfer the caller to the billing department. Execute whenever caller asks fo..."*, border `1px #E5E7EB`, border-radius 8px, padding 10px 12px, font size 13px, color `#9CA3AF`

**Field 2 — Phone Number:**
- Label: **"Phone Number"** — same style as above + `ⓘ`
- Two-column row:
  - Left (70%): **Number input** — label `Number:` above in gray 11px
    - Input with flag selector on left (🇺🇸 US flag + dropdown arrow) + prefix `+1` + number text field
    - Border `1px #D1D5DB`, border-radius 8px, height 40px, font size 14px
  - Middle: `#` separator symbol, color `#374151`, font size 16px, vertically centered
  - Right (30%): **Extension input** — label `Extension (Optional): ⓘ` above in gray 11px
    - Input placeholder: *"e.g: 302"*, same border/radius style

**Field 3 — Voice Response:**
- Label: **"Voice Response"** — same blue label style + `ⓘ`
- Input: single-line text input, pre-filled default value: *"Please hold while I transfer your call"*
- Active/focused state: border `1.5px #2563EB` (blue border glow)

**Field 4 — Advanced Settings (Collapsed row):**
- Text link: **"Advanced Settings"** in `#2563EB`, font size 13px, font-weight 600
- Right arrow `▶` icon in blue, right-aligned
- Clicking expands additional settings (keep collapsed by default)
- Bottom border separator `1px #E5E7EB` above this row

### Add Another Scenario Button:
- Full-width button at the bottom of the scroll area, below all scenario cards
- Style: dashed border or plain text button — **"+ Add Call Transferring Workflow"** — color `#2563EB`, font size 13px, centered, padding 12px
- Clicking adds a new **"Scenario 2"** card with the same fields + a Delete button

### Modal Footer (fixed bottom):
- Right-aligned single button: **"Submit"** — fill `#2563EB`, white text, font size 14px, font-weight 600, border-radius 8px, padding 10px 28px

---

## SCREEN 3 — After Submit: Scenario Cards Displayed

**Triggered by:** Clicking "Submit"
**Reference: Images 5, 7, 8**

### Success Toast Notification (top-right):
- White card, border-radius 10px, box shadow, padding 14px 16px
- Left: green circle checkmark icon `✓` fill `#10B981`
- Text: **"Call Transferring workflow has been created successfully!"** — font size 14px, color `#111827`
- Close `×` button top-right of toast
- Auto-dismiss after 4 seconds

### Scenario Display Card (replaces empty state):
- Full-width card, border `1px #E5E7EB`, border-radius 10px, padding 20px 24px
- **Card Header Row:**
  - Left: **"Scenario 1"** — font size 15px, font-weight 700, color `#111827`
  - Right side action buttons (left to right):
    - **On/Off toggle** — when ON: blue pill toggle `#2563EB` with white knob + label `On` in blue; tooltip on hover: *"Workflow is Enabled"* (dark tooltip, border-radius 6px) — Image 8
    - **Copy icon** button — outlined, icon only, border `1px #D1D5DB`, border-radius 6px, size 32×32px, color `#6B7280`
    - **"Delete"** button — red fill `#EF4444`, white text, trash icon, border-radius 6px, padding 7px 14px
    - **"Edit"** button — blue fill `#2563EB`, white text, pencil icon, border-radius 6px, padding 7px 14px
    - **"Availability"** button — blue fill `#2563EB`, white text, settings/gear icon, border-radius 6px, padding 7px 14px

- **Card Body (read-only display, separated by horizontal dividers `1px #F3F4F6`):**

  - **Scenario Description** section:
    - Label: **"Scenario Description"** in `#2563EB`, font size 13px, font-weight 600 + `ⓘ`
    - Value text below: e.g. `NETNHO4T` — font size 14px, color `#111827`

  - **Phone Number** section:
    - Label: **"Phone Number"** in `#2563EB` + `ⓘ`
    - Value: e.g. `+1 (585) 437-0996` — font size 14px, color `#111827`

  - **Voice Response** section:
    - Label: **"Voice Response"** in `#2563EB` + `ⓘ`
    - Value: e.g. `Please hold while I transfer your call` — font size 14px, color `#111827`

  - **Call Whisper Settings** section:
    - Label: **"Call Whisper Settings"** in `#2563EB` + `ⓘ`
    - Value: **Type:** `Cold Transfer` — font size 14px, color `#111827`, "Type:" in bold

---

## SCREEN 4 — Delete Confirmation Modal

**Triggered by:** Clicking **"Delete"** button on a Scenario card
**Reference: Image 9**

### Modal:
- Small centered modal, width ~380px, background white, border-radius 12px
- Box shadow: `0px 4px 24px rgba(0,0,0,0.16)`
- Dim overlay behind: `rgba(0,0,0,0.3)`

### Modal Content:
- Top-left: red trash/delete icon in a red circle, size 28px
- Heading: **"Are you sure you want to delete this scenario?"** — font size 16px, font-weight 700, color `#111827`
- Subtext: *"Scenario 1 will be permanently deleted."* — font size 13px, color `#6B7280`

### Modal Buttons (right-aligned):
- **"Cancel"** — border `1px #D1D5DB`, white background, text `#374151`, border-radius 8px, padding 9px 20px
- **"Delete"** — fill `#EF4444`, white text, border-radius 8px, padding 9px 20px, font-weight 600

---

## Summary of All States to Build:

| State | Trigger | Screen |
|---|---|---|
| Empty / default | Transfer Call section loaded | Screen 1 |
| Add workflow popup | Click "+ Add" | Screen 2 |
| Scenarios displayed | Click "Submit" | Screen 3 |
| Delete confirmation | Click "Delete" on card | Screen 4 |
Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Complete "Send Text Message" Section — Full Flow Build

**Location:** Process page → Stage detail panel → **"Send Text Message"** accordion section (currently shows "No data" empty state — Image 1)

---

## SCREEN 1 — Send Text Message Section (Expanded / Default State)

**Reference: Image 2**

### Section Header:
- Chat/message icon (blue `#2563EB`) + label **"Send Text Message"** bold, font size 15px, color `#111827`
- Info `ⓘ` icon after label, color `#9CA3AF`
- Right side: pill badge **"Recommended"** — border `1px #D1D5DB`, background white, text `#374151`, font size 12px, border-radius 20px, padding 4px 10px
- Chevron `∧` collapse icon, right-aligned, color `#6B7280`
- Bottom border separator: `1px #E5E7EB`

### Info Banner:
- Light background `#EFF6FF`, border-radius 8px, padding 12px 14px, full width
- Info `ⓘ` icon left, color `#2563EB`
- Text: *"Your AI Receptionist can text the caller in real-time during the call. Great for sending Calendly links and menus."* — font size 13px, color `#374151`

### Two-Column Media Row (below banner):
**Left card — Audio Preview:**
- Background `#EFF6FF`, border-radius 10px, padding 14px 16px
- Label: **"Listen to how our AI handles texting scenarios"** — color `#2563EB`, font size 13px, font-weight 600
- Audio player row: blue `▶` play button (32×32px, fill `#2563EB`) + progress bar (light blue `#BFDBFE`, full width, height 4px) + timestamp `0:00` right-aligned, `#6B7280`

**Right card — Texting Demo:**
- Border `1px #E5E7EB`, border-radius 10px, padding 14px 16px
- Globe `🌐` icon + label **"Texting Demo"** — color `#374151`, font size 13px, font-weight 600
- Body area: empty white space (demo renders here), min-height 120px

**Layout:** Both cards sit side by side at 50/50 width with 16px gap. On narrow widths stack vertically (responsive).

### Empty State:
- Centered illustration: document with speech bubble dots (gray tones, same as Transfer Call empty state)
- Text: **"No data"** — font size 13px, color `#9CA3AF`, centered

### Bottom Action Bar:
- Right-aligned:
  - **"+ Add"** button — border `1px #2563EB`, white background, text `#2563EB`, font size 13px, border-radius 8px, padding 8px 16px
  - **"Learn More"** button — border `1px #D1D5DB`, white background, text `#374151`, font size 13px, border-radius 8px, padding 8px 16px, external link icon before text

---

## SCREEN 2 — "Add Texting Workflow" Modal

**Triggered by:** Clicking **"+ Add"**
**Reference: Images 3, 4, 5, 6**

### Modal Container:
- Centered overlay, dim background `rgba(0,0,0,0.4)`
- Width: **660px**, max-height: **80vh**, scrollable body
- Background white, border-radius 12px
- Box shadow: `0px 8px 32px rgba(0,0,0,0.16)`

### Modal Header:
- Title: **"Add Texting Workflow"** — font size 18px, font-weight 700, color `#111827`
- Close `×` top-right, color `#6B7280`, size 20px
- Bottom border: `1px #E5E7EB`

---

### Scrollable Body — All Fields in Order:

**Scenario Card — "Scenario 1":**
- Bordered card: border `1px #E5E7EB`, border-radius 10px, padding 20px
- Card header: **"Scenario 1"** — font size 14px, font-weight 700, color `#111827`
- Horizontal separator `1px #F3F4F6` below header

---

**Field 1 — Enable Short URLs**
*(Reference: Image 3)*
- Label: **"Enable Short URLs"** — color `#2563EB`, font size 14px, font-weight 600 + `ⓘ` info icon
- Below label: blue ON/OFF toggle switch
  - ON state: fill `#2563EB`, white knob right
  - Default: ON (enabled)
- Horizontal separator `1px #F3F4F6` below

---

**Field 2 — Scenario Description**
*(Reference: Image 3)*
- Label: **"Scenario Description"** — color `#2563EB`, font size 14px, font-weight 600 + `ⓘ`
- Textarea input, min-height 72px
- Placeholder: *"e.g. Send the caller a copy of the menu. Execute whenever caller asks for menu or prices."*
- Border `1px #E5E7EB`, active border `1.5px #2563EB`, border-radius 8px, padding 10px 12px, font size 13px
- Horizontal separator below

---

**Field 3 — Text Message**
*(Reference: Image 4)*
- Label: **"Text Message"** — color `#2563EB`, font size 14px, font-weight 600 + `ⓘ`
- Textarea input, min-height 72px
- Placeholder: *"e.g. Here is our menu: www.restaurant.com/menu"*
- Border `1px #E5E7EB`, active border `1.5px #2563EB`, border-radius 8px, padding 10px 12px
- Below input: helper text **"\* Max 1000 characters allowed"** — color `#2563EB`, font size 12px, margin-top 4px
- Horizontal separator below

---

**Field 4 — What should the AI do next?**
*(Reference: Image 4)*
- Label: **"What should the AI do next?"** — color `#2563EB`, font size 14px, font-weight 600 + `ⓘ`
- Textarea input, min-height 72px
- Placeholder: *"e.g., Tell the caller you've sent them a text message, and then trigger the intake form defined earlier to collect their information."*
- Border `1px #E5E7EB`, active border `1.5px #2563EB`, border-radius 8px, padding 10px 12px
- Horizontal separator below

---

**Field 5 — Ask before sending Text SMS**
*(Reference: Image 5)*
- Label: **"Ask before sending Text SMS"** — color `#2563EB`, font size 14px, font-weight 600 + `ⓘ`
- Below label: toggle switch (default OFF — gray `#D1D5DB`, white knob left)
- Horizontal separator `1px #F3F4F6` below

---

**Field 6 — Attach Image (Optional)**
*(Reference: Images 5, 6)*
- Section label above dropzone: **"Image Upload"** — color `#6B7280`, font size 12px, font-weight 500
- Sub-label: **"Attach Image (Optional)"** — color `#2563EB`, font size 14px, font-weight 600 + `ⓘ`
- Upload dropzone:
  - Dashed border `1.5px dashed #93C5FD`, border-radius 10px, background `#F8FAFF`, padding 32px 20px, full width
  - Center icon: inbox/upload tray icon, color `#2563EB`, size 36×36px
  - Primary text: **"Click or drag file to this area to upload"** — font size 14px, color `#374151`, centered
  - Secondary text: *"Must be JPEG/JPG/PNG image (Max. 1 MB)"* — font size 12px, color `#9CA3AF`, centered

- **After image uploaded (Image 6 state):**
  - Dropzone area shrinks to a narrow bar showing: paperclip icon `📎` + filename (e.g. `schedule-should look-like this.png`) — font size 13px, color `#374151`
  - Below filename: image thumbnail preview — border-radius 8px, max-height 160px, full width, object-fit cover

---

### Add Another Scenario Button:
- Full-width bottom row inside modal scroll area
- **"+ Add Texting Workflow"** — color `#2563EB`, font size 13px, centered text, padding 12px
- Dashed or plain border style, border-radius 8px

### Modal Footer (fixed):
- Right-aligned: **"Submit"** — fill `#2563EB`, white text, font size 14px, font-weight 600, border-radius 8px, padding 10px 28px

---

## SCREEN 3 — After Submit: Scenario Card Display

**Reference: Images 7, 8, 9**

### Limit Reached Banner (if limit hit):
*(same style as Transfer Call — peach bg `#FFF7ED`, orange border, warning icon)*
- Heading: **"Limit Reached"** — `#F97316`, font-weight 700
- Subtext: *"You've reached your limit of 1 texting workflow. You can still view and edit existing items, but cannot create new ones."*
- Bottom row: **"1 of 1 used"** pill (amber) + **"Upgrade"** button (`#2563EB`)

---

### Scenario Display Card:
- Full-width card, border `1px #E5E7EB`, border-radius 10px, padding 20px 24px

**Card Header Row:**
- Left: **"Scenario 1"** — `#111827`, font-weight 700, font size 15px
- Right action buttons:
  - **On/Off toggle** — blue ON (`#2563EB`) / red OFF (`#EF4444`)
  - **Copy icon** — outlined, border `1px #D1D5DB`, 32×32px
  - **"Delete"** — red fill `#EF4444`, white, trash icon, border-radius 6px
  - **"Edit"** — blue fill `#2563EB`, white, pencil icon, border-radius 6px
  - **"Availability"** — blue fill `#2563EB`, white, gear icon, border-radius 6px

**Card Body — Read-only fields (separated by `1px #F3F4F6` dividers):**

Each field follows the pattern:
- Label: `#2563EB`, font size 13px, font-weight 600 + `ⓘ`
- Value below: `#111827`, font size 14px

Fields displayed in this order:

1. **Enable Short URLs** — value shown as a blue pill badge: **"Enabled"** — fill `#2563EB`, white text, border-radius 20px, padding 4px 12px, font size 12px

2. **Scenario Description** — plain text value (e.g. `feryg4reg`)

3. **Text Message** — plain text value (e.g. `srgeryh`)

4. **What should the AI do next?** — plain text value (e.g. `fgbrtht5`)

5. **Attached Image** — label + image thumbnail below:
   - Image rendered at ~120×160px, border-radius 8px, border `1px #E5E7EB`
   - If no image: field omitted entirely

6. **Ask before sending Text SMS** — plain text value: **"No"** or **"Yes"** — font size 14px, color `#111827`

---

## Responsive Rules:

- **Modal:** At widths below 520px, modal goes full-width with 16px side padding
- **Two-column audio + demo row:** Stacks vertically below 640px — audio card on top, demo card below, full width each
- **Action buttons on Scenario card:** Wrap to second row if viewport is narrow; maintain 8px gap
- **All form inputs:** 100% width inside modal at all times — no side-by-side inputs
- **Dropzone:** Maintains full width, reduces internal padding on small screens to 16px

---

## Summary of All States:

| State | Trigger |
|---|---|
| Empty default | Section loaded, no workflows |
| Add Texting Workflow modal | Click "+ Add" |
| Image attached state | File dragged/clicked into dropzone |
| Scenario card display | After Submit |
| Limit Reached banner | Limit hit after submit |
| Delete confirmation | Click "Delete" on card (same modal as Transfer Call) |
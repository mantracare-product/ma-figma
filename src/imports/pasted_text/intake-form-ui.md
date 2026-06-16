Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Fix "Collect Information (Intake Form)" UI — Simplified Template Selector

---

## CHANGE 1 — Wrap Label in Clickable Button

**Remove:** The separate label text + dashed selector row as two separate elements

**Replace with:** A single full-width clickable button that contains the label text

**Button specs:**
- Full width of accordion body
- Height: 44px
- Border: `1px solid #D1D5DB`, border-radius 8px, background white
- Layout: horizontal, space-between
- Left content: text **"Select the form to collect caller information from during the call"** — font size 13px, color `#374151`, font-weight 500, padding-left 12px
- Right content: **`+ Add`** in `#2563EB`, font size 12px, font-weight 600, padding-right 12px
- Hover state: border `1px #2563EB`, background `#F8FBFF`
- Cursor: pointer
- Entire button is one clickable unit — clicking anywhere opens the popup

---

## CHANGE 2 — Simplified Popup (Names Only, No Details)

**Remove:** The current cards with descriptions, field counts, icons, colored backgrounds

**Replace with:** A clean minimal list popup

**Modal container:**
- Width: **400px**, height: auto
- Background white, border-radius 12px
- Box shadow: `0px 8px 32px rgba(0,0,0,0.14)`
- Padding: 20px 24px

**Modal header:**
- Title: **"Choose a form"** — font size 16px, font-weight 700, color `#111827`
- Close `×` top-right, color `#9CA3AF`, 16px
- Separator `1px #F3F4F6` below header, margin 12px 0

**Form list — one by one, names only:**

Each row:
- Height: 44px
- Full width
- Layout: horizontal, align-items center, space-between
- Left: form name text — font size 14px, color `#111827`, font-weight 500, padding-left 4px
- Right: empty by default; on hover shows `›` chevron in `#9CA3AF`
- Separator `1px #F3F4F6` between each row (not after last)
- Hover background: `#F9FAFB`
- Selected state: background `#EFF6FF`, left border `3px solid #2563EB`, name color `#2563EB`, right side shows `✓` in `#2563EB`

**List items (in this order):**
1. Contact Form
2. Appointment Booking
3. Lead Generation
4. Quote Request
5. Event Registration

**Below the list — separator + Create New button:**
- `1px #F3F4F6` separator
- Full-width text button row, height 44px:
  - Left: `+` icon `#2563EB` 14px + text **"Create New Form"** `#2563EB`, font size 14px, font-weight 500, padding-left 4px
  - Hover background: `#F0F7FF`
  - On click: close modal + navigate to **Web Forms** page

**No modal footer buttons** — selection is immediate on click (click a name → selects it → modal closes automatically → selected card appears)

---

## CHANGE 3 — Selected Form Card (after selection)

**Replaces** the clickable button row after a form is chosen

**Card specs:**
- Full width, height: 56px
- Border: `1.5px solid #2563EB`, border-radius 8px, background `#EFF6FF`
- Padding: 12px 14px
- Layout: horizontal, align-items center

**Left — Icon:**
- Circle 28×28px, background `#DBEAFE`, border-radius 50%
- Icon: small form/document icon `#2563EB`, 14px

**Center — Text (flex-grow):**
- Row 1: form name — font size 13px, font-weight 700, color `#111827`
- Row 2: field summary — font size 11px, color `#6B7280`
  - Contact Form: *"4 fields · Name, Email, Phone, Message"*
  - Appointment Booking: *"5 fields · Name, Email, Phone, Preferred Date, Time Slot"*
  - Lead Generation: *"5 fields · Name, Email, Phone, Company, How can we help?"*
  - Quote Request: *"5 fields · Name, Email, Phone, Project Details, Budget Range"*
  - Event Registration: *"5 fields · Name, Email, Phone, No. of Attendees, Dietary Req."*

**Right — Actions:**
- Green checkmark circle `#10B981`, 18×18px, white `✓` inside
- Gap 8px
- **"Edit"** — text button, `#2563EB`, font size 12px, font-weight 600, no border
- Gap 8px
- **"×"** remove icon — `#9CA3AF`, 14px, clicking this resets back to the clickable button state

---

## CHANGE 4 — Multiple Forms: 3 Per Row

If more than one form can be added (future state), display selected form cards in a **3-column grid:**

- Grid: 3 columns, gap 10px
- Each card: same specs as above but width ~1/3 of container
- After row of 3 is filled, next card starts a new row below
- Below all cards: show the original clickable button again (to add another form) if more slots available

---

## CHANGE 5 — Success Toast

After selecting a form and modal auto-closes:

- Toast appears top-right of the page
- White card, border-radius 8px, box shadow `0px 4px 16px rgba(0,0,0,0.1)`, padding 12px 16px
- Left: green circle `✓` icon `#10B981`, 18px
- Text: **"[Form name] template added successfully!"** — e.g. *"Contact Form template added successfully!"*
- Font size 13px, color `#111827`
- Auto-dismiss after 3 seconds

---

## Summary of All States:

| State | What shows |
|---|---|
| Default | Single full-width clickable button with label + "+ Add" |
| Button clicked | Clean minimal popup — 5 form names in a list + Create New |
| Name hovered | Row highlight + `›` chevron |
| Name clicked | Selected (blue left border + `✓`) → modal closes immediately |
| After selection | Blue-bordered info card with icon + name + fields + Edit + × |
| Multiple forms | Cards display 3 per row in a grid |
| Create New clicked | Navigate to Web Forms page |
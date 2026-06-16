Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Redesign "Collect Information (Intake Form)" Section — Compact Inline Flow

**Location:** Process page → Stage detail panel → **"Collect Information (Intake Form)"** accordion section

---

## LAYOUT REDESIGN — No Empty Space, Compact Stack

**Remove entirely:**
- The empty state illustration (document icon + "No data")
- The `+ Add Form ▼` split button at the bottom
- All excess whitespace/spacer elements

**Replace with this exact compact vertical stack inside the accordion body:**

```
┌─────────────────────────────────────────────────┐
│  ⓘ  Teach your AI Receptionist how to           │
│     intelligently collect information.           │
├─────────────────────────────────────────────────┤
│  Select the intake form                          │
│  ┌─────────────────────────────────────── ▼ ─┐  │
│  │  Choose a template...                      │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ─────────── or ───────────                      │
│                                                   │
│  [ + Create New Form ]                           │
└─────────────────────────────────────────────────┘
```

**Body padding:** 16px all sides
**Gap between elements:** 12px
**No min-height, no spacers** — frame hugs content tightly, expands only when form fields appear below

---

## ELEMENT 1 — Info Banner (keep existing)

- Background `#EFF6FF`, border-radius 8px, padding 12px 14px
- `ⓘ` icon `#2563EB` + text: *"Teach your AI Receptionist how to intelligently collect information."*
- Font size 13px, color `#374151`

---

## ELEMENT 2 — "Select the intake form" Label + Dropdown

**Label row:**
- Text: **"Select the intake form"** — font size 13px, font-weight 600, color `#374151`
- Sits directly below the info banner with 12px gap

**Dropdown (below label, 6px gap):**
- Full width of the container
- Height: 40px
- Border: `1px solid #D1D5DB`, border-radius 8px, background white
- Left padding: 12px, right padding: 10px
- Default/placeholder text: *"Choose a template..."* — color `#9CA3AF`, font size 13px
- Right side: chevron `▼` icon, color `#6B7280`, 12px, vertically centered
- Hover border: `1px #2563EB`
- Focus border: `1.5px #2563EB`, box shadow `0px 0px 0px 3px rgba(37,99,235,0.1)`

**Dropdown Menu (on click — opens downward):**
- White card, border `1px #E5E7EB`, border-radius 8px
- Box shadow: `0px 4px 16px rgba(0,0,0,0.1)`
- Full width matching the dropdown trigger
- Max-height 240px, scroll if needed

**Menu items (one per template):**

Each item row — padding 10px 14px, hover background `#EFF6FF`:

- **Contact Form** — font size 13px, color `#111827`, font-weight 500
- **Appointment Booking**
- **Lead Generation**
- **Quote Request**
- **Event Registration**

Selected item shows: checkmark `✓` `#2563EB` on the right side of the row

---

## ELEMENT 3 — Divider with "or"

- Horizontal line with centered **"or"** text
- Line: `1px #E5E7EB` on both sides
- Text: **"or"** — font size 12px, color `#9CA3AF`, padding 0px 10px
- Margin: 4px top and bottom

---

## ELEMENT 4 — "Create New Form" Button

- Full width
- Style: outlined — border `1px #2563EB`, background white, text `#2563EB`
- Label: **"+ Create New Form"**
- Font size 13px, font-weight 600
- Border-radius 8px, height 38px
- Hover: background `#EFF6FF`
- **On click:** Navigate directly to **Web Forms** page (existing nav item)

---

## STATE 2 — Template Selected from Dropdown

**Triggered by:** User selects any template from the dropdown

**The dropdown updates:**
- Shows selected template name (e.g. **"Contact Form"**) replacing placeholder text
- Checkmark visible in dropdown menu on the selected item

**Below the dropdown, form fields expand inline (no modal):**

Animated smooth expand — fields slide down below the dropdown with 12px gap

**Form fields block:**
- Border `1px #E5E7EB`, border-radius 10px, padding 16px, background `#FAFAFA`
- Fields rendered based on chosen template:

**Contact Form fields:**
- Name (Text input)
- Email (Email input)
- Phone (Phone input)
- Message (Textarea)

**Appointment Booking fields:**
- Name, Email, Phone, Preferred Date, Time Slot

**Lead Generation fields:**
- Name, Email, Phone, Company, How can we help?

**Quote Request fields:**
- Name, Email, Phone, Project Details, Budget Range

**Event Registration fields:**
- Name, Email, Phone, Number of Attendees, Dietary Requirements

---

**Each field row inside the form block:**
- Label: field name — font size 12px, color `#6B7280`, font-weight 500, margin-bottom 4px
- Input: border `1px #E5E7EB`, border-radius 6px, height 36px, padding 8px 10px, font size 13px, placeholder color `#D1D5DB`, background white, full width
- Gap between fields: 10px

**Submit button (at bottom of fields block):**
- Full width
- Fill `#2563EB`, white text, **"Submit Form"**
- Font size 13px, font-weight 600, border-radius 8px, height 38px
- Margin-top 12px

---

## STATE 3 — After Submit: Scenario Card Display

**Same exact pattern as Transfer Call and Send Text Message submitted cards**

**Replace** the dropdown + fields block with a display card:

**Card container:**
- Border `1px #E5E7EB`, border-radius 10px, padding 16px 20px, background white
- Full width, no extra spacing above or below

**Card header row:**
- Left: template name — e.g. **"Contact Form"** — font size 14px, font-weight 700, color `#111827`
- Right action buttons (same style as Transfer Call):
  - **On/Off toggle** — blue ON `#2563EB` / red OFF `#EF4444`, pill style
  - **Copy icon** — outlined, border `1px #D1D5DB`, 30×30px
  - **"Delete"** — red fill `#EF4444`, white text, trash icon, border-radius 6px, padding 6px 12px, font size 12px
  - **"Edit"** — blue fill `#2563EB`, white text, pencil icon, border-radius 6px, padding 6px 12px, font size 12px

**Card body — read-only field rows** (separated by `1px #F3F4F6` dividers):

Each row:
- Label: field name in `#2563EB`, font size 12px, font-weight 600 + `ⓘ` icon
- Right: field type pill — background `#F3F4F6`, text `#6B7280`, font size 11px, border-radius 10px, padding 2px 8px (e.g. `Text`, `Email`, `Phone`, `Textarea`)

Rows for Contact Form example:
- **Name** — `Text`
- **Email** — `Email`
- **Phone** — `Phone`
- **Message** — `Textarea`

---

## WHEN DRAWER OPENS — No Layout Shift

- The accordion body has **no fixed height or min-height**
- Frame uses **auto-layout vertical, hug contents**
- When drawer opens and the panel renders, the `+ Create New Form` button sits directly below the `or` divider with zero empty gap
- When a template is selected and fields expand, the section grows naturally downward — no jump or reflow

---

## Summary of All States:

| State | What shows |
|---|---|
| Default | Info banner → Label → Dropdown → or → Create New button |
| Dropdown opened | Template list menu appears |
| Template selected | Dropdown shows name + form fields expand inline below |
| After Submit | Compact display card with field list + Edit/Delete/Toggle |
| Create New clicked | Navigate to Web Forms page |
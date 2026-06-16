Here's the precise prompt:

---

### Figma Make Prompt: Voice Configuration — Search, Filter & Card Redesign

---

### CONTEXT
Update the Voice Configuration section in Settings. Changes apply to both the **main page** and the **Voice Library popup modal**.

---

### CHANGE 1 — Add Search Bar + Filter Below Info Banner (Main Page)

Directly below the blue info banner `"Choose the voice your AI Receptionist will use when answering the phone."` add a **search + filter row**:

**Layout (left to right):**
```
[🔍 Search voices...————————————————]  [⚙ Filters ▾]
```

- Search bar: flex-grow, `1px solid #E5E7EB` border, 8px radius, 40px height, 🔍 icon left inside, placeholder `Search voices...` in `#9CA3AF`
- Filter button: white bg, `1px solid #E5E7EB` border, 40px height, 100px wide, 8px radius, ⚙ icon + `Filters` text + `▾` chevron, `#374151` text

**Filter dropdown panel** (opens below the Filter button, 320px wide, white bg, `1px solid #E5E7EB` border, 12px radius, 16px padding, shadow `0 4px 16px rgba(0,0,0,0.12)`):

5 filter fields stacked vertically, 12px gap each:

**1. Language** — dropdown, default: `All Languages`
Options: English · Hindi · Spanish · French · German · Arabic · Portuguese · Japanese · Mandarin · Korean

**2. Tone** — dropdown, default: `All Tones`
Options: Professional · Friendly · Casual · Formal · Empathetic · Energetic · Calm

**3. Gender** — dropdown, default: `All Genders`
Options: Female · Male · Neutral

**4. Age** — dropdown, default: `All Ages`
Options: Young · Mid · Mature · Senior

**5. Country** — dropdown, default: `All Countries`
Options: USA · UK · India · Australia · Canada · South Africa · Ireland · New Zealand · Singapore · UAE

**Each dropdown field:**
- Label in 11px bold `#374151` uppercase above the dropdown
- Dropdown: white bg, `1px solid #E5E7EB` border, 36px height, 8px radius, value text 13px `#374151`, `▾` chevron right-aligned in `#9CA3AF`

**Bottom of filter panel:**
- `Apply Filters` button — full width, `#1A73E8` blue bg, white text 14px bold, 40px height, 8px radius
- `Clear All` text link — 12px `#1A73E8`, centered below button, 8px margin top

---

### CHANGE 2 — Redesign Voice Cards (Main Page)

**Remove** the square initial badge (the grey `NO` / `AL` square at top of card).

**New card layout:**

```
[Voice name — 15px bold #111827]     [✓ selected badge top-right if selected]
[Gender • Country — 13px #6B7280]
[Tag pill 1] [Tag pill 2]
[✓ Selected btn]  [▶ Preview btn]
```

**Tag pills** (Young · Professional · Friendly · Mid · etc.):
- Light grey `#F3F4F6` bg, `#374151` text, 11px, 4px radius, 6px horizontal padding, 24px height

**Selected button:**
- Green `#22C55E` bg, white text `✓ Selected`, 36px height, flex-grow left half

**Preview button:**
- White bg, `1px solid #E5E7EB` border, `▶ Preview` text `#374151`, 36px height, flex-grow right half

**Card container:**
- White bg, `1px solid #E5E7EB` border, 8px radius, 16px padding
- Selected card: `2px solid #1A73E8` blue border + light blue bg `#EFF6FF`
- Non-selected card: standard border, white bg

**Voice data for cards:**

| Name | Gender | Country | Tags |
|------|--------|---------|------|
| Nova | Female | USA | Young · Professional |
| Alloy | Male | USA | Mid · Friendly |
| Echo | Male | UK | Mid · Professional |
| Shimmer | Female | UK | Young · Friendly |
| Onyx | Male | USA | Mature · Formal |
| Fable | Female | Australia | Young · Casual |

---

### CHANGE 3 — Apply Same Search + Filter to Voice Library Popup

Inside the **Voice Library modal popup**, directly below the `Voice Library · Clone Voice` tab bar row and above the `CURRENT VOICE` section label:

Add the **same search + filter row** (identical to Change 1):
```
[🔍 Search voices...————————————]  [⚙ Filters ▾]
```

Same filter dropdown with all 5 fields (Language · Tone · Gender · Age · Country) and same options as Change 1.

Apply the **same card redesign** (Change 2) to:
- The **Current Voice** card (Nova — Selected state with blue border)
- All **Featured Voices** cards below (no selected state — just Preview button spanning full width for non-selected cards)

**Non-selected card button row (Featured Voices):**
- Single full-width `▶ Preview` button — white bg, `1px solid #E5E7EB` border, 36px height

---

### CHANGE 4 — Voice Library Modal Tab Bar

Keep existing `Voice Library · Clone Voice` tabs + `How Credits Work · Learn More ↗` link unchanged. Just add the search+filter row directly below this tab bar row with 12px margin top.

---

### DO NOT CHANGE
- Modal close button (✕)
- `CURRENT VOICE` and `FEATURED VOICES` section labels
- Demo Video placeholder in the right panel of Current Voice section
- Sidebar navigation, Settings menu items
- Any other settings section

---

**Attach both screenshots** — main Voice Configuration page (Image 1) and Voice Library popup (Image 2) — so Figma Make knows exactly where to insert the search/filter row and which cards to redesign.
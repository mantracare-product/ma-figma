Here's the detailed prompt for Figma Make:

---

## Prompt: Fix Voice Configuration Page — Section Order, Voice Sources & Modal Responsiveness

---

### Section 1 — Fix Page Layout Order

The Voice Configuration page must have sections in this exact top-to-bottom order:

1. **AI Models** (restore at top — was incorrectly removed)
2. **Choose Voice** (currently exists, keep as-is)
3. **Featured Voices** (currently exists, keep as-is)
4. **"Explore All Voices" button** (keep as-is)

**Remove entirely** the "Voice Model Configuration" section that shows OpenAI/Gemini/Claude tabs + Available Voices grid (Nova, Alloy, Echo, Shimmer). This section should not appear on the page at all anymore.

---

### Section 2 — Restore AI Models at Top

Bring back the **AI Models** section exactly as it was before, as the very first section on the Voice Configuration page:

- Section title: **"AI Models"** in bold, same heading style as other section titles
- Top-right: outlined button **"▷ How it works"**
- Subtitle: *"Manage AI service providers"* in muted gray
- A table/list with columns: **Service Provider | Model Name | Status | Actions**
- Three rows:
  - OpenAI | GPT-4 | toggle ON (blue) | edit + delete icons
  - Gemini | Gemini Pro | toggle ON (blue) | edit + delete icons
  - Claude | Claude 3 | toggle OFF (gray) | edit + delete icons
- Same card styling, border, and spacing as before

---

### Section 3 — Fix Voices in Featured Voices Grid

The Featured Voices grid on the main page currently shows voices from the wrong source. Replace all voice data with these voices from the Voice Model Configuration section:

**Nova** — Female • USA | Age: Young | Type: Professional
**Alloy** — Male • USA | Age: Mid | Type: Friendly
**Echo** — Male • UK | Age: Mature | Type: Sales
**Shimmer** — Female • USA | Age: Young | Type: Support

Each card in the grid should show:
- Avatar square with initials (NO, AL, EC, SH) in the same gray initials style
- Voice name in medium text
- Gender • Region below name in muted text
- Two small tag chips: Age value + Type value (use the same chip style as existing)
- Two buttons: **"+ Select"** (outlined) and **"▷ Preview"** (outlined)

Keep the 3-column grid layout. Since there are only 4 voices, render as: Row 1 = Nova, Alloy, Echo | Row 2 = Shimmer (left-aligned, not stretched)

The **currently selected voice** card gets: blue border outline, blue checkmark circle top-right, green "Selected" button replacing "Select"

---

### Section 4 — Fix Voice Library Modal — Same Voices

Inside the **Voice Library modal** (opens from "Explore All Voices"):

**Tab 1 — Voice Library:**

Current Voice card: keep Dakota Flash V2 as currently shown — this is correct, do not change

Featured Voices section inside the modal: replace with the same 4 voices (Nova, Alloy, Echo, Shimmer) in the same card format with:
- Avatar initials square
- Name + Gender • Region
- Age and Type tag chips
- Short description per voice:
  - Nova: *"Young professional female voice, crisp and clear for front desk use."*
  - Alloy: *"Friendly mid-range male voice, warm and approachable."*
  - Echo: *"Mature male voice with a UK accent, authoritative and calm."*
  - Shimmer: *"Young supportive female voice, gentle and reassuring."*
- Select + Preview buttons

**Tab 2 — Clone Voice:** no changes needed, keep as-is

---

### Section 5 — Fix Modal Size and Responsiveness

**Current problem:** The Voice Library modal is taking up nearly the full viewport width and height, feeling overwhelming and uncontained.

**Fix the modal dimensions:**

- **Max width:** `720px` — the modal should never be wider than this
- **Max height:** `80vh` — modal should not exceed 80% of viewport height
- **The modal must be centered** both horizontally and vertically on screen with a semi-transparent dark backdrop behind it
- **Internal scroll:** the modal body (everything below the tab bar) should have `overflow-y: auto` so content scrolls inside the modal — the modal frame itself stays fixed in place
- **Min width:** `480px` so it never collapses too narrow on smaller screens
- **Padding:** consistent internal padding of ~24px on all sides

**Modal structure with correct sizing:**
```
Backdrop (full screen, semi-transparent dark overlay)
└── Modal Card (max-w-[720px], max-h-[80vh], centered, rounded-xl, white bg)
    ├── Modal Header (fixed, does not scroll)
    │   ├── "Voice Library" title
    │   └── × close button
    ├── Tab Bar (fixed, does not scroll)
    │   ├── Voice Library tab | Clone Voice tab
    │   └── How Credits Work | Learn More links
    ├── Divider line
    └── Modal Body (overflow-y: auto, scrolls independently)
        └── Tab content here
```

- The header, tab bar, and divider must stay **sticky/fixed** at the top of the modal — they must never scroll away
- Only the content below the tab bar scrolls
- Add a subtle bottom fade gradient on the modal body to indicate there is more content to scroll
- The close × button must always be visible and accessible regardless of scroll position

---

### What Must Not Change

- The Choose Voice section layout and Selected Voice card — keep exactly as-is
- The "Explore All Voices" button placement and styling
- The AI Models table design — just restore it exactly as it was
- All colors, typography, border-radius, and spacing tokens from the existing design system
- The Clone Voice tab content and How Credits Work panel
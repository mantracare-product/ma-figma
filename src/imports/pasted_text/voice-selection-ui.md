Here's a detailed prompt for Figma Make to replace the AI Models section with the full voice selection UI:

---

## Prompt: Replace AI Models Section in Voice Configuration with Voice Selection UI

---

### Context & Location

This change is on the **Settings → Voice Configuration** page. The page currently has two sections:

1. **AI Models** — table with Service Provider, Model Name, Status, Actions (OpenAI/GPT-4, Gemini/Gemini Pro, Claude/Claude 3)
2. **Voice Model Configuration** — toggle + AI model selector + Available Voices grid

**Completely replace the entire "AI Models" section** (the table with the three providers) with the new voice selection UI described below. The Voice Model Configuration section below it remains untouched.

---

### New Section to Build — "Choose Voice"

---

#### Section Header Row

- Left side: speaker/audio icon + text **"Choose Voice"** + small circular info `ⓘ` icon next to it (same styling as the existing page headers)
- Right side: a small outlined pill badge with text **"Recommended"** — light border, small font, no fill
- Below the header: subtitle text — *"Choose the voice your AI Receptionist will use when answering the phone."* — muted gray, same style as other subtitles on the settings page, inside a light info banner row with an `ⓘ` icon on the left

---

#### Selected English Voice Card + Demo Video

Render these two side by side in a horizontal row:

**Left — Selected Voice Card (~55% width)**

A white rounded card with subtle border containing:
- Top-right corner: a filled blue circle with a white checkmark `✓` — indicates currently selected
- Voice avatar: a colored square with initials **"DA"** (dark navy background, white text) — same style as the existing avatar initials seen in the figma
- Voice name: **"Dakota Flash V2"** in medium-weight text
- Next to the name: a small purple/violet pill badge labeled **"STS"**
- Below name: green text **"Recommended"**
- Below that: a green dot + text **"Active"** as a small status badge
- Two buttons side by side at the bottom:
  - **"Selected"** — green filled button with a checkmark circle icon on the left (same green as Active badge)
  - **"Preview"** — outlined/ghost button with a play triangle icon on the left

**Right — Voice Library Demo Card (~43% width)**

A white rounded card with subtle border containing:
- Top: globe/web icon + text **"Voice Library Demo"** as a small label
- Below: a thumbnail image placeholder (woman at a desk/microphone — use a placeholder rectangle with rounded corners if no image available)
- The card has the same border-radius and shadow as the Selected Voice card

---

#### Featured Voices Section

Below the two cards, a section titled **"Featured Voices"** in medium-weight dark text.

Render a **3-column grid** of voice cards. Each card contains:
- Voice avatar: gray square with initials (2 letters, e.g. CA, DA, LU, AS, MA, JE)
- Voice name in medium text
- Optional **"STS"** purple badge next to name (only for: Cassidy-English, Dakota Flash V2, Mark, Jessica, Dea)
- Optional **"Recommended"** green text below name (only for: Cassidy-English, Dakota Flash V2, Mark, Jessica)
- Two buttons: **"Select"** (outlined with + icon) and **"Preview"** (outlined with play icon)

Voices to include in the grid (in this order, left-to-right, top-to-bottom):

Row 1: Cassidy-English (STS, Recommended) | Dakota Flash V2 (STS, Recommended) | Luna
Row 2: Astra | Mark (STS, Recommended) | Dea (STS)
Row 3: Jessica (STS, Recommended) — only 1 in last row, left-aligned

The **currently selected voice (Dakota Flash V2)** card in the grid gets special treatment:
- Blue filled checkmark circle in top-right corner
- The "Select" button changes to a green **"Selected"** filled button with checkmark icon
- An **"Active"** green dot badge appears below "Recommended"

---

#### Explore All Voices Button

Below the featured voices grid, a full-width or right-aligned button:
- Label: **"Explore All Voices →"**
- Style: solid dark navy/dark background button with white text and a right arrow
- On click: opens the **Voice Library modal** (described below)

---

### Voice Library Modal (opens on "Explore All Voices")

A large modal/drawer with a white background, rounded corners, close `×` button top-right, title **"Voice Library"** top-left.

**Top Tab Bar (two tabs):**
- **"Voice Library"** tab — speaker icon + label (active state: blue filled pill; inactive: outlined/ghost)
- **"Clone Voice"** tab — copy/clone icon + label
- On the right side of the tab bar (right-aligned): two text links — `ⓘ How Credits Work` and `↗ Learn More`

---

#### Tab 1 — Voice Library (default active tab)

**Current Voice subsection:**

Two side-by-side cards:

Left card (Current Voice):
- Blue checkmark circle top-right
- Avatar: dark navy square, initials **"DA"**, blue background
- Name: **"Dakota Flash V2"** + purple **"STS"** badge
- Green **"Recommended"** text
- Green dot **"Active"** badge
- Tag chips in a row: `frontdesk` `English` `Female` `1 credit/min` — small gray rounded chips
- Description text: *"Soft and gentle female voice with a smooth delivery, slightly warm tone, and relaxed pacing..."*
- Buttons: green **"Selected"** + outlined **"Preview"**

Right card (Demo):
- Globe icon + **"Voice Library Demo"** label at top
- Thumbnail image placeholder with play button overlay (YouTube-style embed placeholder)

**Featured Voices subsection** (below, same as main page):

Same 3-column grid layout as described above, with full detail cards including:
- Tag chips: `frontdesk` / `rime`, `English`, `Female`, `1 credit/min`
- Short description text (1–2 sentences per voice)
- Select + Preview buttons

Voices and descriptions:
- **Dakota Flash V2** — "Soft and gentle female voice with a smooth delivery, slightly warm tone, and relaxed pacing"
- **Luna** — "Engaging tone perfect for business communications."
- **Astra** — "Professional voice with clear articulation and natural flow."
- **Mark** — show male avatar, description: "Confident and clear male voice, professional tone."
- **Dea** — "A professional and charming English voice."
- **Jessica** — "Warm and friendly female voice, ideal for reception."

---

#### Tab 2 — Clone Voice

**Warning Banner** at top:
- Light yellow/amber background, rounded card
- Orange `!` warning icon on the left
- Bold text: **"Cloned voices are inbound only"**
- Subtext: *"Due to legal restrictions on AI voice replication, cloned voices cannot be selected for agents used in outbound call sequences. Use a licensed or synthetic voice for outbound."*

**Create Custom Voice form** below the banner, inside a white rounded card:
- Section title: **"Create Custom Voice"**
- Subtitle: *"Upload an audio file or record directly to create your own voice clone"*
- Required field: **Voice Name** — text input, placeholder: *"Enter a name for your custom voice"*
- Required field: **Description** — textarea, placeholder: *"Describe your custom voice"*
- Required field: **Voice Provider** — toggle button group with two options: **"Elevenlabs"** (default selected, blue filled) | **"Cartesia"** (outlined)
- **Audio Source** — two buttons side by side: **"Select File"** (upload icon) | **"Start Recording"** (microphone icon) — both outlined
- Helper text below: *"Maximum file size: 10 MB • Supported formats: WAV, MP3"*
- Full-width blue filled CTA button at bottom: **"Create Voice Clone"**

---

#### How Credits Work Side Panel / Modal

Triggered by clicking **"How Credits Work"** link in the modal tab bar. Opens as a side drawer or nested modal with title **"Voice Credits Explained"** and close `×`:

Display the following info cards in a vertical list, each with a circle checkmark icon and bold title + description:

1. **What are Voice Credits?** (highlighted blue info card) — *"Voice credits are the currency that powers your AI receptionist's voice capabilities. They're simple to understand and easy to manage."*
2. **Prorated by the Second** — *"Credits are charged by the second, not by the minute. You'll only pay for the exact duration used, so short or partial minutes won't cost you a full credit."*
3. **1 credit = 12¢** — *"Each credit costs 12 cents, making it easy to understand your costs."*
4. **Monthly Free Credits** — *"Your plan includes free credits that automatically renew each month."*
5. **Auto-Reload Available** — inline `⚙ Configure` link next to title — *"Enable auto-reload to ensure your receptionist is always available to take calls."*
6. **Transferred Call Usage** — *"Each transferred call uses 0.25 credits per minute = $0.03 per minute."*

Footer link: **"Read our complete pricing guide ↗"** — centered, underlined text link

---

### Design Consistency Rules

- Use only colors, fonts, border-radius, shadows, and component styles already present in the Figma file
- Blue filled buttons: same blue as existing primary buttons (`#2563EB` or whatever the file uses)
- Green = active/selected state color
- Purple/violet = STS badge color
- All cards use same rounded corners and subtle border/shadow as existing settings cards
- Tag chips use the same small rounded gray chip style
- Modal overlay uses the same backdrop and modal card style as the existing Add New Service modal in the file
- Do not introduce any new typefaces, icon sets, or color tokens
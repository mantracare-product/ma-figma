Here is the precise, detailed Figma prompt:

---

## Figma Prompt: "Collect Information (Intake Form)" — Full Flow Build

**Location:** Process page → Stage detail panel → **"Collect Information (Intake Form)"** accordion section (currently shows "No data" — Image 3)

---

## SCREEN 1 — Default Empty State with Dropdown Button

**Replace** the current empty state (No data + no action) with:

### Info Banner (keep existing):
- Light blue `#EFF6FF` background, border-radius 8px, padding 12px 14px
- Info `ⓘ` icon `#2563EB` + text: *"Teach your AI Receptionist how to intelligently collect information."*

### Empty State Area:
- Document icon + **"No data"** text — keep as-is, centered

### Bottom Action Bar:
**Replace any existing button** with a single **split/dropdown button:**

**Dropdown Button — "Add Form ▼":**
- Primary area left: **"+ Add Form"** — fill `#2563EB`, white text, font size 13px, font-weight 600, border-radius 8px 0px 0px 8px, padding 9px 16px
- Divider: `1px white` vertical line
- Right chevron area: **`▼`** icon — same blue fill, border-radius 0px 8px 8px 0px, padding 9px 10px, clickable separately

**On clicking anywhere on the button → dropdown menu appears below:**

Dropdown card:
- White background, border `1px #E5E7EB`, border-radius 8px, box shadow `0px 4px 16px rgba(0,0,0,0.1)`, min-width 200px
- Two options:

  **Option 1 — "Select from Template"**
  - Template/grid icon (2×2 squares) in `#2563EB`, 16px
  - Label: **"Select from Template"** — font size 13px, color `#111827`, font-weight 500
  - Subtext below: *"Choose from pre-built forms"* — font size 11px, color `#9CA3AF`
  - Hover background: `#EFF6FF`
  - Padding: 10px 14px

  **Option 2 — "Create New"**
  - Plus/pencil icon in `#2563EB`, 16px
  - Label: **"Create New"** — font size 13px, color `#111827`, font-weight 500
  - Subtext below: *"Build your own from scratch"* — font size 11px, color `#9CA3AF`
  - Hover background: `#EFF6FF`
  - Padding: 10px 14px

  - Divider `1px #F3F4F6` between the two options

---

## SCREEN 2A — "Select from Template" Flow

**Triggered by:** Clicking **"Select from Template"** from dropdown

### Modal: "Start with a template"

**Reference: Images 1 & 2**

**Modal Container:**
- Full-page overlay OR large centered modal
- Width: **900px**, max-height: **85vh**, scrollable
- Background white, border-radius 14px
- Box shadow: `0px 8px 40px rgba(0,0,0,0.16)`

**Modal Header:**
- Tag above title: **"NEW FORM"** — font size 11px, color `#6B7280`, font-weight 600, letter-spacing 1px, uppercase
- Title: **"Start with a template"** — font size 24px, font-weight 700, color `#111827`
- Subtitle: *"Get started in minutes — or build your own from scratch."* — font size 14px, color `#6B7280`
- Close `×` top-right, color `#6B7280`

---

### Template Grid (3 columns, scrollable):

**Grid layout:** 3 columns, 20px gap, padding 24px

Each template card:
- Border `1px #E5E7EB`, border-radius 12px, background white, padding 20px
- Hover state: border `2px #2563EB`, box shadow `0px 4px 16px rgba(37,99,235,0.12)`
- **Selected state:** border `2px #2563EB`, top-right checkmark badge — filled circle `#2563EB`, white `✓`, 20×20px

---

**Template Card 1 — Contact Form:**
- Title: **"Contact Form"** — font size 15px, font-weight 700, color `#111827`
- Form fields preview (non-interactive, display only):
  - Input field: placeholder `Name` — border `1px #E5E7EB`, border-radius 6px, height 34px, font size 12px, color `#9CA3AF`
  - Input field: placeholder `Email`
  - Input field: placeholder `Phone`
  - Input field: placeholder `Message`
  - Button: **"Send Message"** — fill `#111827`, white text, border-radius 6px, height 36px, full width, font size 12px
- Description: *"Perfect for capturing general inquiries and customer questions. Includes all essential contact fields."* — font size 12px, color `#6B7280`, margin-top 12px
- Usage: **"Used by 12.5K businesses"** — font size 11px, color `#9CA3AF`

---

**Template Card 2 — Appointment Booking:**
- Title: **"Appointment Booking"**
- Fields preview:
  - `Name`, `Email`, `Phone`, `Preferred Date`, `Time Slot`
  - Button: **"Book Appointment"** — same black style
- Description: *"Streamline scheduling with date and time selection. Great for service-based businesses."*
- Usage: *"Used by 8.2K businesses"*

---

**Template Card 3 — Lead Generation:**
- Title: **"Lead Generation"**
- Fields preview:
  - `Name`, `Email`, `Phone`, `Company`, `How can we help?`
  - Button: **"Get Started"** — same black style
- Description: *"Capture qualified leads with company information. Ideal for B2B sales teams."*
- Usage: *"Used by 15.8K businesses"*

---

**Template Card 4 — Quote Request:**
- Title: **"Quote Request"**
- Fields preview:
  - `Name`, `Email`, `Phone`, `Project Details`, `Budget Range`
  - Button: **"Request Quote"**
- Description: *"Gather project requirements and budget info. Perfect for agencies and contractors."*
- Usage: *"Used by 6.4K businesses"*

---

**Template Card 5 — Event Registration:**
- Title: **"Event Registration"**
- Fields preview:
  - `Name`, `Email`, `Phone`, `Number of Attendees`, `Dietary Requirements`
  - Button: **"Register Now"**
- Description: *"Simplify event sign-ups with attendee tracking. Great for conferences and workshops."*
- Usage: *"Used by 4.9K businesses"*

---

**Template Card 6 — Start from Scratch:**
- Dashed border `1.5px dashed #D1D5DB`, border-radius 12px, background `#FAFAFA`
- Center content (vertically + horizontally centered):
  - Large `+` icon — circle border `2px #D1D5DB`, size 48×48px, `+` color `#9CA3AF`, font size 24px
  - Title: **"Start from scratch"** — font size 15px, font-weight 700, color `#374151`
  - Subtitle: *"Full creative control"* — font size 12px, color `#9CA3AF`
- Clicking this redirects to Web Forms screen (same as "Create New" flow)

---

**Footer note (below grid):**
- Text: *"All templates include Name, Email, and Phone by default."* — font size 12px, color `#9CA3AF`, centered, padding-bottom 16px

---

### Modal Footer (fixed bottom):
- Left: **"Cancel"** — border `1px #D1D5DB`, white bg, text `#374151`, border-radius 8px, padding 9px 20px
- Right: **"Use Template"** — fill `#2563EB`, white text, border-radius 8px, padding 9px 24px, font-weight 600
  - Disabled (gray `#D1D5DB`) until a template card is selected
  - Enabled (blue) once any template card is clicked/selected

---

### After Clicking "Use Template":

**The selected template's questions are added to the Collect Information section:**

Display a **form card** inside the accordion section:

**Form display card:**
- Border `1px #E5E7EB`, border-radius 10px, padding 20px
- Card header row:
  - Left: template name (e.g. **"Contact Form"**) — font size 15px, font-weight 700, `#111827`
  - Right: action buttons — **"Edit"** (blue, pencil icon) + **"Delete"** (red, trash icon) — same style as Transfer Call scenario cards

- **Fields list** (read-only display, each separated by `1px #F3F4F6`):
  - Each field row: field label in `#2563EB`, font size 13px, font-weight 600 + field type tag (e.g. `Text`, `Email`, `Phone`) as a small gray pill `#F3F4F6`, text `#6B7280`, font size 11px, border-radius 10px, padding 2px 8px — right-aligned
  - Fields shown based on chosen template (e.g. Contact Form shows: Name, Email, Phone, Message)

---

## SCREEN 2B — "Create New" Flow

**Triggered by:** Clicking **"Create New"** from dropdown OR clicking **"Start from scratch"** card in template modal

**Action:** Navigate directly to the **Web Forms** page (existing screen in the app — left sidebar "Web Forms" nav item)

**Transition:** Standard page navigation — no modal, no overlay. The Web Forms page opens with a new blank form builder in focus.

---

## Responsive Rules:

- **Template grid:** 3 columns on desktop (≥1024px) → 2 columns (768–1023px) → 1 column (<768px)
- **Modal width:** 900px on desktop → 100% width with 16px padding on mobile
- **Dropdown menu:** Always anchors below the button, full-width on mobile
- **Form card field rows:** Stack label and type tag vertically on narrow widths

---

## Summary of All States:

| State | Trigger |
|---|---|
| Empty state + "Add Form ▼" button | Default / no form added |
| Dropdown menu (2 options) | Click "Add Form ▼" |
| Template selection modal | Click "Select from Template" |
| Selected state on card | Click any template card |
| "Use Template" enabled | Template card selected |
| Form fields displayed in accordion | After "Use Template" clicked |
| Redirect to Web Forms | Click "Create New" or "Start from scratch" |
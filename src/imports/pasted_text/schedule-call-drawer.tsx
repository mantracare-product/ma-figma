Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Convert "Schedule Call" Modal → Side Drawer

---

### Current Behavior (to be removed):
When the user clicks the **Call icon** in the Clients section, a **centered modal/popup** appears titled "Schedule Call" with:
- A blurred background overlay
- A floating white card (~400px wide) centered on screen
- Cancel / Schedule buttons at the bottom

**Remove this modal pattern entirely.**

---

### New Behavior (to be implemented):
Replace with a **right-side drawer** — identical in structure and style to the existing drawer that opens when clicking the **Eye icon** on a client row.

---

### Drawer Specs:

**Container:**
- Slides in from the **right edge** of the screen
- Width: **420–440px** (same as the eye icon drawer)
- Height: **100% viewport height** — full screen top to bottom
- Background: `#FFFFFF`
- Left edge: subtle box shadow `0px 0px 24px rgba(0,0,0,0.12)`
- The rest of the page dims with a semi-transparent dark overlay (`rgba(0,0,0,0.3)`) behind the drawer
- Drawer sits on top of all page content (highest z-index)
- Smooth slide-in animation from right (same as eye drawer)

**Drawer Header:**
- Top bar with a **calendar/clock icon** (🗓 or use the same schedule icon style from the app) followed by the title **"Schedule Call"** in bold, font size 16px, color `#111827`
- A **red circular close button (×)** top-right corner — same style as Image 2 (red `#EF4444` circle with white × icon), NOT a plain × like the current modal
- Bottom border separator: 1px `#E5E7EB`
- Padding: 16px horizontal, 14px vertical

---

### Drawer Body (scrollable content, padding 16px horizontal):

**Section 1 — "Select Client"**
- Section heading: `Select Client` with a person/user icon to the left — font size 13px, uppercase, color `#6B7280`, font-weight 600, letter-spacing 0.5px — same style as "CONTACT DETAILS" and "PIPELINE INFO" headings in Image 2

- **Client Card** (selected client display):
  - Full-width card, background: blue gradient (`#1D4ED8` → `#2563EB`), border-radius 10px, padding 14px 16px
  - Left side: circular avatar icon (person outline) in a slightly lighter blue circle, size 36×36px
  - Client name in white, bold, font size 15px
  - Badge tag beside name — e.g. `LEAD` in a small pill, background `rgba(255,255,255,0.2)`, white text, font size 10px, border-radius 20px
  - Below name: bullet separator • and `Since [date]` in light blue/white, font size 12px
  - Right side: **"Change"** text button in white, font size 13px, underline or plain, right-aligned

**Section 2 — "Contact Details"**
- Section heading same style as above: `CONTACT DETAILS` with subtle gray label
- Phone number row: phone icon (green `#10B981`) + phone number text, inside a light bordered input-style row, border `1px #E5E7EB`, border-radius 8px, padding 10px 12px, font size 14px
- Email row: email/envelope icon (red `#EF4444`) + email address text, same row style as phone

**Section 3 — "Pipeline Info"**
- Section heading: `PIPELINE INFO`
- Two-column layout inside a single bordered card (`1px #E5E7EB`, border-radius 8px):
  - Left column: label `Process` in gray 11px + value (e.g. `Cold Calls - India`) in black 14px bold below
  - Vertical divider `1px #E5E7EB` between columns
  - Right column: label `Current Stage` in gray 11px + colored stage dot + value (e.g. `Follow Up`) in black 14px bold

**Section 4 — "Select Date & Time"**
- Section heading: `Select Date & Time` with a clock icon (green/teal) to the left — same heading style
- **Calendar component** inside a bordered card (`1px #E5E7EB`, border-radius 10px, padding 16px):
  - Month/Year header: dropdown for month (e.g. `May ▼`) left-aligned + year (`2026`) right-aligned, font size 14px bold
  - Day-of-week row: `Sun Mon Tue Wed Thu Fri Sat` in gray, font size 12px, evenly spaced
  - Date grid: 7-column grid, each date cell 36×36px, font size 13px
  - **Today's date** or selected date: filled circle `#2563EB` (blue), white text
  - Other dates: plain text `#374151`, hover state light blue bg
  - Dates from previous/next month: `#D1D5DB` light gray

- **Time Picker** below calendar, inside same card after a horizontal divider:
  - Label: `24H FORMAT` in gray uppercase, font size 11px, centered
  - Two number boxes side by side: Hours box + Minutes box
    - Each box: border `1px #E5E7EB`, border-radius 6px, width 56px, height 44px, font size 22px bold, centered text, color `#111827`
  - Below time boxes: formatted date-time confirmation string e.g. `May 10th 2026 at 14:36 IST` in blue `#2563EB`, font size 12px, centered

---

### Drawer Footer:
- Fixed to the bottom of the drawer (does not scroll)
- Top border: `1px #E5E7EB`
- Padding: 14px 16px
- Two buttons right-aligned:
  - **"Cancel"** — outlined button, border `1px #D1D5DB`, background white, text `#374151`, font size 14px, border-radius 8px, padding 10px 20px
  - **"Schedule"** — filled button, background `#2563EB`, white text, font size 14px, font-weight 600, border-radius 8px, padding 10px 24px

---

### Animation & Behavior:
- Drawer slides in from the right (same transition as the eye icon drawer)
- Clicking the overlay or the × button closes and slides it back out to the right
- The main page content does **not** shift or resize — the drawer overlays on top

---

### Remove:
- The existing centered modal frame, its backdrop blur, and its shadow card
- The old "Selected Client" plain white card layout (non-gradient)
- The standalone Phone Number and Email input fields (replace with the icon-row style)
- The missing date/time picker (add the full calendar + time picker as specified above)
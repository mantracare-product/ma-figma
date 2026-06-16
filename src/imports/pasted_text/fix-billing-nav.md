Here is the precise, detailed Figma prompt:

---

## Figma Prompt: Fix Billing Navigation — Convert Separate Page to Inline Sub-Panel (Match Organization Pattern)

**Location:** Settings page → **"Billing"** left sidebar item

---

## CURRENT BEHAVIOR (to be removed):

- Clicking **"Billing"** in the left sidebar navigates to a **completely separate page** with its own header, "← Back" button, and full-page layout
- This breaks the Settings pattern where all other items (Organization, Team, Voice Configuration, etc.) stay on the same page and show content in the right panel

---

## REQUIRED BEHAVIOR (match Organization exactly):

Clicking **"Billing"** must:
1. Highlight "Billing" in the left sidebar (same blue selected state as "Organization")
2. Show Billing content in the **right content panel** — same panel that shows Organization details
3. **No page navigation, no "← Back" button, no separate route**
4. The left sidebar with all Settings nav items remains fully visible at all times

---

## CHANGE 1 — Billing Sidebar Item: Remove Arrow, Add Expand Behavior

**Current state:** "Billing" has a `›` right arrow suggesting it navigates away

**New state:**
- Remove the `›` navigation arrow
- Clicking "Billing" selects it (blue highlight, same as Organization)
- Does NOT expand inline in sidebar — instead loads content in right panel like all other items
- The sub-items (Plans, Subscriptions, Payments, Transactions) move OUT of the sidebar and INTO the right panel as a tab bar

---

## CHANGE 2 — Right Panel: Billing Content Layout

When "Billing" is selected in sidebar, the right content panel shows:

### Panel Header (matches Organization header style):
- Title: **"Billing"** — font size 22px, font-weight 700, color `#111827`
- Subtitle: *"Manage plans, subscriptions, and payments"* — font size 14px, color `#6B7280`
- Top-right: org selector dropdown **"Healthcare Org ▼"** — same as on Organization page

---

### Sub-navigation Tab Bar (replaces sidebar sub-items):

Horizontal tab bar directly below the header, above the content:

- Tab bar full width, border-bottom `1px #E5E7EB`
- Tab items: **Plans · Subscriptions · Payments · Transactions**
- Each tab:
  - Padding: 10px 18px
  - Font size: 14px, color `#6B7280`, font-weight 500
  - Hover: color `#111827`
  - **Active/selected tab:** color `#2563EB`, font-weight 600, border-bottom `2px solid #2563EB` (sits on the tab bar border)
- Default active tab: **Plans**

---

## CHANGE 3 — Plans Tab Content (default view)

Exactly matching the existing Plans content, now rendered inside the right panel:

### User Count Row:
- Card: border `1px #E5E7EB`, border-radius 10px, padding 16px 20px
- Left: **"How many users do you have?"** — font size 15px, font-weight 600, color `#111827` + subtext *"Adjust your team size to see updated pricing"* — font size 13px, color `#6B7280`
- Right: stepper control — `−` button (border `1px #E5E7EB`, 32×32px, border-radius 6px) + number **2** (font size 18px, font-weight 700, color `#111827`) + `+` button (same style) + label `users` below number in gray 12px

### Billing Toggle (Monthly / Annual):
- Right-aligned above plan cards
- **"Most Popular"** badge: pill, fill `#2563EB`, white text, font size 11px, border-radius 20px — floats above toggle
- Toggle: two buttons side by side
  - **"Monthly"** — border `1px #E5E7EB`, background white, text `#374151`, border-radius 8px 0px 0px 8px, padding 7px 14px, font size 13px
  - **"Annual Save 20%"** — selected state: fill `#111827`, white text, border-radius 0px 8px 8px 0px, padding 7px 14px, font size 13px; "Save 20%" in smaller green text `#10B981` same pill

### Plan Cards Grid (4 columns):
Border `1px #E5E7EB`, border-radius 12px, padding 20px, background white

**Card 1 — Starter:**
- Title: **"Starter"** — font size 16px, font-weight 700
- Subtitle: *"For small teams getting started"* — font size 12px, `#6B7280`
- Price: **$20** `/mo` — `$20` in font size 32px, font-weight 800; `/mo` in 14px `#6B7280`
- Note: `$10/user/mo × 2 users` — font size 12px, `#9CA3AF`
- Annual note: `Billed annually: $240/yr` — font size 11px, `#9CA3AF`
- CTA button below: **"Choose Starter"** — border `1px #D1D5DB`, white bg, text `#374151`, border-radius 8px, full width, padding 9px

**Card 2 — Basic:**
- Title: **"Basic"**, subtitle: *"For growing teams with regular usage"*
- Price: **$98** `/mo`, `$49/user/mo × 2 users`, `Billed annually: $1,176/yr`
- CTA: **"Choose Basic"** — same outlined style

**Card 3 — Professional (Current Plan):**
- Border: `2px solid #2563EB`, box shadow `0px 4px 16px rgba(37,99,235,0.12)`
- **"Current Plan"** badge: top-left inside card, background `#EFF6FF`, text `#2563EB`, font size 11px, border-radius 20px, padding 3px 10px
- Title: **"Professional"** — font size 16px, font-weight 700
- Subtitle: *"For teams scaling their operations"*
- Price: **$158** `/mo`, `$79/user/mo × 2 users`, `Billed annually: $1,896/yr`
- CTA: **"Current Plan"** — fill `#2563EB`, white text, border-radius 8px, full width — disabled/non-clickable style (opacity 80%)

**Card 4 — Enterprise:**
- Title: **"Enterprise"**, subtitle: *"For large organizations with custom needs"*
- Price: **"Custom pricing"** — `#2563EB`, font size 22px, font-weight 700
- Subtext: *"Contact sales for a quote"* — `#6B7280`, font size 13px
- CTA: **"Contact Sales"** — fill `#111827`, white text, border-radius 8px, full width

---

## CHANGE 4 — Subscriptions Tab Content

When **"Subscriptions"** tab is clicked, right panel shows:

- Section heading: **"Current Subscription"** — font size 16px, font-weight 700
- Card: border `1px #E5E7EB`, border-radius 10px, padding 20px
  - Plan name: **"Professional"** with `#2563EB` badge **"Active"**
  - Billing cycle: `Annual · $1,896/yr`
  - Next renewal: `Renews on June 1, 2026`
  - CTA: **"Manage Subscription"** blue button right-aligned

---

## CHANGE 5 — Payments Tab Content

When **"Payments"** tab clicked:

- Section heading: **"Payment Methods"**
- Card showing saved card: Visa ending in `4567`, expiry `12/27`, default badge
- **"+ Add Payment Method"** button — outlined blue
- **"Billing Address"** section below — editable address fields

---

## CHANGE 6 — Transactions Tab Content

When **"Transactions"** tab clicked:

- Section heading: **"Transaction History"**
- Table with columns: **Date · Description · Amount · Status · Invoice**
- 3–4 sample rows:
  - `May 1, 2026 · Professional Plan (Annual) · $1,896 · ✓ Paid · Download`
  - `Apr 1, 2026 · Professional Plan (Monthly) · $158 · ✓ Paid · Download`
- Download links: `#2563EB`, underline, font size 13px

---

## REMOVE ENTIRELY:

- The separate Billing page with `← Back` navigation
- The `›` arrow on the Billing sidebar item
- The sub-items (Plans, Subscriptions, Payments, Transactions) from the left sidebar — they now live as tabs in the right panel only

---

## Summary:

| Before | After |
|---|---|
| Billing opens a new page | Billing loads in right panel like Organization |
| Sub-items in sidebar | Sub-items as horizontal tabs in right panel |
| "← Back" button | No back button — stays in Settings |
| Separate route `/billing` | Same Settings page, right panel swaps content |
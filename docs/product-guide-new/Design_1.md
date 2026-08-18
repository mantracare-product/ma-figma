# MantraAssist Comprehensive Design System Specification (`DESIGN_1.md`)

> **Version**: 2.4.0  
> **Status**: Production Reference Standard  
> **Target Framework**: React 19 + Tailwind CSS + Framer Motion + Lucide React  
> **Typography Suite**: Google Fonts Outfit & DM Sans  

---

## 1. Design Philosophy & Core Principles

The **MantraAssist Design System** is engineered for high-velocity medical intelligence and revenue cycle management (RCM). It merges clinical precision with a modern glassmorphic aesthetic to create an intuitive and visually refined user experience.

### 1.1 Core Directives & Non-Negotiable Rules

1. **Light Clinical Glassmorphic Canvas**: The workspace canvas uses a warm, crisp neutral background (`#fafafa` / `bg-[#fafafa]`), elevated by multi-layered frosted glass panels (`bg-white/80 backdrop-blur-xl border border-white/80`).
2. **Executive Contrast (Dark Navy System)**: Primary active items, high-impact CTA buttons, and standard table headers use a dark navy-to-slate gradient (`bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white`). Pure `#000000` is strictly avoided to prevent visual fatigue.
3. **Dual-Font Typography Hierarchy**:
   - **Display, Headings, Numbers & Key Metrics**: **Outfit** (`font-display` / `font-family: 'Outfit', sans-serif`).
   - **Body, Table Data, Form Controls & System Controls**: **DM Sans** (`font-sans` / `font-family: 'DM Sans', sans-serif`).
   - **System Identifiers, Tokens & Keys**: **JetBrains Mono** (`font-mono`).
4. **Pill-Centric Geometry**: Interactive elements (primary buttons, tab switchers, search bars, filter dropdowns, badges) follow generous pill geometry (`rounded-full` or `rounded-2xl` / `rounded-[28px]`).
5. **Deterministic Interaction Model**: All structural changes (collapsing the sidebar, opening modals, applying filters) are driven by explicit user clicks with micro-animations.

---

## 2. Color Palette & Token Architecture

### 2.1 Canvas & Surface Tokens

| Token Name | Hex / RGBA | Tailwind Utility | Functional Application |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#fafafa` | `bg-[#fafafa]` | Global application background canvas |
| **Glass Panel Base** | `rgba(255, 255, 255, 0.80)` | `bg-white/80 backdrop-blur-xl` | Primary card panels, sub-navigation panels |
| **Glass Panel Solid** | `rgba(255, 255, 255, 0.92)` | `bg-white/92 backdrop-blur-2xl` | Data table containers, dropdown popovers |
| **Glass Subtle Fill** | `rgba(255, 255, 255, 0.40)` | `bg-white/40` | Internal card sections, table footers |
| **Surface White** | `#ffffff` | `bg-white` | Input fields, active sub-tabs, dropdown items |
| **Border Glass Light** | `rgba(255, 255, 255, 0.85)` | `border-white/80` | Frosted glass outer highlighting borders |
| **Border Neutral** | `#e2e8f0` / `#e5e7eb` | `border-slate-200/80` | Subtle divider lines and structural borders |

### 2.2 Dark Navy & Gradient System

| Style Name | Gradient / Hex Value | Tailwind Implementation | Usage Context |
| :--- | :--- | :--- | :--- |
| **Executive Navy Gradient** | `#181e25 → #2c3e50` | `bg-gradient-to-r from-[#181e25] to-[#2c3e50]` | Primary active nav pills, table headers, hero buttons |
| **Navy Gradient Hover** | `#222a35 → #384c60` | `hover:from-[#222a35] hover:to-[#384c60]` | Interactive hover state for dark gradient elements |
| **Dark Navy Solid** | `#181e25` | `bg-[#181e25]` | Organization avatar badge, circular action buttons |
| **Deep Dark Background** | `#0f172a` | `bg-slate-900` | Brand text anchor, tooltip backgrounds |

### 2.3 Typography Color Scale

| Level | Hex Code | Tailwind Class | Application |
| :--- | :--- | :--- | :--- |
| **Display Primary** | `#0f172a` / `#181e25` | `text-[#0f172a]` | Page H1 titles, brand headings, large metrics |
| **Content Primary** | `#222222` | `text-[#222222]` | Standard headings, card titles, table cell primary text |
| **Nav & Body Slate** | `#45515e` | `text-[#45515e]` | Navigation links, table body data, form labels |
| **Secondary Muted** | `#64748b` | `text-slate-500` | Subtitles, helper text, breadcrumbs |
| **Tertiary Subtle** | `#94a3b8` | `text-slate-400` | Table column titles, search placeholders |
| **Section Label** | `#8e8e93` | `text-[#8e8e93]` | Uppercase subnav category indicators (`SETTINGS`) |

### 2.4 Semantic Status & Accent Palette

| State | Primary Hex | Soft Fill Background | Border Accent | Tailwind Combination |
| :--- | :--- | :--- | :--- | :--- |
| **Brand Primary** | `#1456f0` | `rgba(20, 86, 240, 0.08)` | `rgba(20, 86, 240, 0.25)` | `bg-blue-50 text-[#1456f0] border-blue-200/60` |
| **Brand Cyan** | `#0284c7` | `rgba(2, 132, 199, 0.08)` | `rgba(2, 132, 199, 0.25)` | `bg-sky-50 text-[#0284c7] border-sky-200/60` |
| **Success** | `#10b981` | `rgba(16, 185, 129, 0.10)` | `rgba(16, 185, 129, 0.25)` | `bg-emerald-50 text-emerald-700 border-emerald-200/60` |
| **Warning** | `#f59e0b` | `rgba(245, 158, 11, 0.10)` | `rgba(245, 158, 11, 0.25)` | `bg-amber-50 text-amber-700 border-amber-200/60` |
| **Danger / Alert** | `#ef4444` | `rgba(239, 68, 68, 0.10)` | `rgba(239, 68, 68, 0.25)` | `bg-rose-50 text-rose-700 border-rose-200/60` |
| **Purple / AI** | `#8b5cf6` | `rgba(139, 92, 246, 0.10)` | `rgba(139, 92, 246, 0.25)` | `bg-purple-50 text-purple-700 border-purple-200/60` |

---

## 3. Typography Hierarchy & Style Tokens

```css
/* Font Family Declarations */
--font-display: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
--font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### 3.1 Type Scale Specification

| Hierarchy | Font Family | Size | Weight | Tracking | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Logo** | Outfit | `24px` (`1.5rem`) | 800 ExtraBold | `-0.03em` | `1.2` | MantraAssist brand header |
| **Page H1** | Outfit | `32px` (`2rem`) | 800 ExtraBold | `-0.025em` | `1.25` | Primary page title (`Forms`, `Overview`) |
| **Section H2** | Outfit | `20px` (`1.25rem`)| 700 Bold | `-0.02em` | `1.3` | Card headers, modal titles |
| **Subheading H3**| Outfit | `16px` (`1.0rem`) | 600 SemiBold | `-0.01em` | `1.4` | Drawer headers, table subsection titles |
| **KPI Numbers** | Outfit | `28px` (`1.75rem`)| 800 ExtraBold | `-0.02em` | `1.1` | Stat counts (`573`, `179`, `$1,250.00`) |
| **Table Headers**| Outfit | `12px` (`0.75rem`)| 700 Bold | `+0.05em` | `1.0` | Uppercase table headers (`TITLE`, `STAGE`) |
| **Body Primary** | DM Sans | `14px` (`0.875rem`)| 500 Medium | `normal` | `1.5` | Table cell data, card descriptions |
| **Body Small** | DM Sans | `13px` (`0.8125rem`)| 400 Regular | `normal` | `1.4` | Form placeholders, help descriptions |
| **Micro Labels** | Outfit | `11px` (`0.6875rem`)| 700 Bold | `+0.06em` | `1.0` | Badge pills, status chips, section tags |

---

## 4. Component Architectural Specifications

### 4.1 Master Application Sidebar ([Sidebar.tsx](file:///c:/MantraAssist%20RCM/src/app/components/layout/Sidebar.tsx))

The master navigation sidebar supports dual-mode deterministic layout:

```
Expanded Docked Sidebar (w-64)            Collapsed Icon Rail (w-16)
┌───────────────────────────────┬──┐     ┌───────────────┬──┐
│ MantraAssist             [ <| ]  │     │      (M)      [ |> ]
│ ┌───────────────────────────┐ │  │     │      [D]      │  │
│ │ [D] Demo Mantra         ↕ │ │  │     │               │  │
│ └───────────────────────────┘ │  │     │      (⊞)      │  │
│  (⊞) Overview (Active Pill)   │  │     │      (👥)     │  │
│  (👥) Clients                 │  │     │      (🔄)     │  │
│  (🔄) Processes               │  │     │      (📞)     │  │
│  (📞) Call Logs               │  │     │      (📅)     │  │
│  (📅) Appointments           │  │     │      (⚙)      │  │
│  (⚙) Settings                 │  │     │               │  │
│  > More Modules               │  │     │               │  │
│ ───────────────────────────── │  │     │               │  │
│  [→  Sign Out                 │  │     │      [→       │  │
└───────────────────────────────┴──┘     └───────────────┴──┘
```

#### Specifications:
- **Toggle Button**: Floating circular pill anchored on the top-right border edge (`absolute top-5 -right-3.5 w-7 h-7 rounded-full bg-white border border-slate-900 shadow-md flex items-center justify-center text-slate-900 active:scale-95`).
- **Icons**:
  - `PanelLeftClose` (`<|`) when expanded.
  - `PanelLeftOpen` (`|>`) when collapsed.
- **Organization Selector**:
  - Container: `bg-white border border-slate-200/90 rounded-2xl p-2.5 px-3 flex items-center justify-between shadow-2xs`.
  - Icon: Black square badge `bg-[#181e25] text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs`.
  - Label: `Demo Mantra` in Outfit Bold.
- **Active Navigation Pill**:
  - `bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white rounded-2xl px-4 py-3 font-semibold text-sm shadow-sm`.
- **Inactive Navigation Items**:
  - `text-[#45515e] hover:text-[#181e25] hover:bg-slate-100/60 rounded-2xl px-4 py-3 font-medium text-sm transition-all`.

---

### 4.2 Settings Sub-Navigation Card ([SettingsSubnav.tsx](file:///c:/MantraAssist%20RCM/src/app/components/settings/SettingsSubnav.tsx))

Dedicated sub-menu for configuration pages:
- **Container**: `w-[230px] flex-shrink-0 bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-[28px] p-3.5 space-y-1`.
- **Header Badge**: `px-3.5 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#8e8e93] font-display` displaying `SETTINGS`.
- **Navigation Hierarchy**:
  1. `Organizations` (`Building2`)
  2. `Process Settings` (`Sliders`)
  3. `Custom Fields` (`ClipboardList`)
  4. `Forms` (`FileText`)
  5. `Billing` (`CreditCard` — Accordion expandable):
     - `Plan Overview`
     - `Plans & Subscriptions`
     - `Transactions`
     - `Billing Settings`
  6. `Integrations` (`Link2`)
  7. `Knowledge Base` (`BookOpen`)
  8. `Roles & Permissions` (`Shield`)
  9. `Account` (`User`)

---

### 4.3 Standard Data Tables & Thead Specification

All tabular data grids across Clients, Processes, Call Logs, Invoices, Reports, Knowledge Base, Services, and Forms strictly adhere to the unified standard:

```html
<!-- Table Card Container -->
<div class="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 shadow-2xs overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <!-- Standard Thead -->
      <thead class="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
        <tr>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider font-display">TITLE</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider font-display">STATUS</th>
          ...
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 text-sm">
        ...
      </tbody>
    </table>
  </div>
</div>
```

#### Data Table Feature Standards:
- **Thead Styling**: `bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white`.
- **Column Customizer**: Gear icon (`Settings`) in table header opening a glassmorphic column visibility popover.
- **Row Interaction**: Hover state `hover:bg-slate-50/70 transition-colors`, selected row background `bg-blue-50/60`.
- **Key Badges**:
  - Numbers/Counts: Pill badge with soft background (e.g. `0 FIELDS` in `bg-slate-100 text-slate-700`).
  - Status/Submissions: Link pill in blue (e.g. `2 SUBMISSIONS` in `bg-blue-50 text-[#1456f0]`).
- **Pagination Toolbar**:
  - Left: `Rows per page [ 15 ▾ ]` dropdown + `Showing 1–15 of 120`.
  - Right: `PAGE 1 / 8` with pagination controls `<< < > >>`.

---

### 4.4 KPI Stat Cards & Analytics

Glassmorphic stat capsules provide immediate visibility into key operational metrics:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div class="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/80 shadow-2xs p-5 flex items-center justify-between">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">TOTAL CALLS</p>
      <h3 class="text-3xl font-extrabold text-[#181e25] mt-1 font-display">573</h3>
      <p class="text-xs text-slate-500 mt-1">Across selected filters</p>
    </div>
    <div class="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1456f0]">
      <Phone className="w-5 h-5" />
    </div>
  </div>
</div>
```

---

### 4.5 Interactive Buttons & Controls

| Control Type | Geometry | Styling Utility String |
| :--- | :--- | :--- |
| **Primary Action Pill** | `rounded-full` | `px-4 py-2.5 bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#222a35] hover:to-[#384c60] text-white text-xs font-bold shadow-sm cursor-pointer` |
| **Secondary Pill Switcher** | `rounded-full` | `p-1 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full inline-flex` with active item in dark navy |
| **Search Filter Pill** | `rounded-2xl` | `w-full pl-9 pr-4 py-2 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20` |
| **Icon Action Button** | `rounded-full` | `w-9 h-9 bg-[#181e25] text-white flex items-center justify-center rounded-full hover:bg-slate-900 shadow-sm transition-transform active:scale-95` |

---

## 5. Motion & Interaction Standards (Framer Motion)

### 5.1 Spring Physics Constants

```typescript
// Shared spring configurations
export const SPRING_PILL = {
  type: "spring",
  stiffness: 450,
  damping: 35,
};

export const SPRING_DRAWER = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

export const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};
```

### 5.2 Layout Animations
- **Active Pill Slider**: Use `<motion.div layoutId="activeNavPill" />` behind active tab text to provide seamless fluid transitions when switching tabs.
- **Accordion Expander**: Animate `<AnimatePresence>` with `initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}` for sub-menus and drawers.

---

## 6. Page-Specific Implementations Overview

| Route | Page Component | Design Architecture Highlights |
| :--- | :--- | :--- |
| `/` | `Overview.tsx` | 4 Dropdown filter pills, 4 KPI cards, Spline Area chart (+12.5% badge), Donut chart (573 total calls). |
| `/clients` | `Clients.tsx` | Dark navy thead table, column toggle popover, client drawer, bulk trigger actions. |
| `/deals` | `Deals.tsx` | Process pipeline Kanban & List views, stage indicators, dark navy thead. |
| `/call-logs` | `CallLogs.tsx` | Audio waveform player, transcript drawers, schedule call drawer, dark navy thead. |
| `/appointments` | `Appointments.tsx`| Month day banner (`SUN`..`SAT`), active date highlight (14), scheduled agenda sidebar. |
| `/web-forms` | `WebForms.tsx` | Forms vs. Entries pill switcher, search filter, 6 forms counter, dark navy thead. |
| `/invoices` | `Invoices.tsx` | Frosted glass KPI stat pills, List/Kanban toggle, record payment modal, dark navy thead. |
| `/reports` | `Reports.tsx` | Pre-built templates, custom query builder dialog, analytics export, dark navy thead. |
| `/knowledge-base`| `KnowledgeBase.tsx`| Scoped AI context tree, grid & list view switcher, document upload drawer, dark navy thead. |
| `/services` | `Services.tsx` | Product catalog, duration & tax configuration, employee tag chips, dark navy thead. |
| `/refer-and-earn`| `ReferAndEarn.tsx` | Referral links, discount codes, conversion metrics, payout activity log table. |
| `/transactions` | `Transactions.tsx` | Credit usage spline chart, credit transaction history log, dark navy thead. |
| `/settings` | `Settings.tsx` | Organization profile, team permissions, AI voices, numbers, custom fields, audit logs. |

---

## 7. Verification Checklist

- [x] All table headers use `bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white` with Outfit font.
- [x] Headings use `Outfit` font family (`font-display`).
- [x] Body copy, controls, and table data use `DM Sans` font family (`font-sans`).
- [x] Card containers implement `bg-white/80` or `bg-white/90` with `backdrop-blur-xl` and `border-white/80`.
- [x] Sidebar collapse button uses the circular `PanelLeftClose` / `PanelLeftOpen` toggle.
- [x] Auto-open on hover is disabled; all expand/collapse behaviors are deterministic.
- [x] Zero console runtime errors and clean production compilation (`vite build`).

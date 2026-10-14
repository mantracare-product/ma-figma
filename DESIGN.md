# MantraAssist Project Design Specification (`DESIGN.md`)

**Version 3.0 — Production Ground Truth Architecture & Clinical Design System**  
This document represents the authoritative, codebase-exact design specification for MantraAssist. Every rule, component class, spacing token, table row height, sidebar layout, and drawer interaction detailed here strictly matches the active codebase implementation.

---

## 1. System Foundations & Design Grammar

### 1.1 Aesthetic Principle: Clinical Glassmorphic Control Room
MantraAssist employs a light clinical control-room aesthetic designed for high-stress, rapid-scanning healthcare operations.
- **Canvas Backdrop**: `#fafafa` (Master page background) with light slate neutral surfaces (`#F8FAFC`).
- **Surface Elevation**: White solid containers (`#ffffff`) with subtle slate borders (`#E2E8F0` / `rgba(24,30,37,0.07)`).
- **Focal Elevation**: Dark slate navy surfaces (`#181e25 → #1E293B → #2c3e50`) used for active navigation pills, dark table headers, hero banners, and primary commit buttons.
- **Active Accents**:
  - **Electric Brand Blue**: `#1456f0` (Primary button fill, active focus ring), `#2563eb` / `#1d4ed8` (interactive links, streams), `#eff6ff` (subtle selected row tint).
  - **Clinical Emerald**: `#10b981` (Live dot pulse), `#047857` (High-contrast verified status), `#ecfdf5` (Success badge background).
  - **Slate Neutral**: `#222222` (High-contrast text), `#475569` (Body text), `#64748b` (Secondary labels), `#94a3b8` (Subtle placeholders).

### 1.2 Typography System

| Role | Font Family | Variable / Stack | Usage |
| :--- | :--- | :--- | :--- |
| **Display** | Outfit | `--font-outfit`, `Outfit, sans-serif` | Page titles, hero metrics, table column headers, drawer titles |
| **Sans (Controls & Body)** | DM Sans | `--font-dm-sans`, `DM Sans, sans-serif` | Body copy, form labels, input values, table cell text, navigation |
| **Mono** | JetBrains Mono | `--font-jetbrains-mono`, `monospace` | Patient IDs, invoices, phone numbers, dosages, timestamps |

**Tabular Numbers Directive:** All numbers in tables, invoices, call metrics, and timers MUST use `tabular-nums` (`font-variant-numeric: tabular-nums`).

---

## 2. Layout & Global Shell Architecture

### 2.1 Sidebar Navigation Specifications (`Sidebar.tsx`)
The application features a responsive collapsible sidebar on the left with strict width constraints:

| Sidebar State | Width Token | Exact CSS Classes | Characteristics |
| :--- | :--- | :--- | :--- |
| **Expanded** | `256px` | `w-64 min-w-[256px] max-w-[256px]` | Full organizational accordion view |
| **Collapsed (Rail)** | `68px` | `w-[68px] min-w-[68px] max-w-[68px]` | Icon-only quick rail with portal tooltips |

#### Global Collapse Trigger Button:
- **Location**: Border divider at top right of sidebar (`absolute -right-2.5 top-[60px]`).
- **Sizing & Style**: `w-5 h-5 rounded-full bg-white border border-gray-200/90 shadow-xs hover:shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer z-40`.

#### Organization Switcher Header:
- **Expanded**: `p-4 pb-1` container. Trigger button: `w-full bg-white border border-gray-200/90 rounded-xl p-2.5 px-3 flex items-center justify-between shadow-2xs`.
- **Org Icon**: `w-7 h-7 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs`.

#### Navigation Sections & Category Groups:
Sidebar groups are organized into 4 primary accordion sections with category titles in uppercase:

```tsx
/* Section Header Accordion Trigger */
<button className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50/80 transition-all cursor-pointer">
  <span>{section.title}</span>
  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
</button>
```

1. **`WORKSPACE`**
   - Overview (`/deals`), Clients (`/clients`), Call Logs (`/call-logs`), Deals/Process (`/deals`), Appointments (`/appointments`), AI Scribe (`/scribe`).
2. **`AUTOMATIONS`**
   - Workflows (`/process`), Knowledge Base (`/knowledge-base`), Webforms (`/web-forms`).
3. **`REVENUE & INSIGHTS`** *(Renamed from legacy Billing & Insights)*
   - Product & Services (`/services`), Invoice (`/invoices`), Insurance & Claims (`/claims`), Reports (`/reports`).
4. **`SETTINGS`**
   - Organization (`/settings/organization`), Team (`/settings/team`), Billing (`/settings/billing`), AI Voices / Models (`/settings/voices`), Sections / Fields (`/settings/sections-fields`), Integrations (`/settings/integrations`), Audit Logs (`/settings/audit-logs`), Security (`/settings/security`).

#### Navigation Item Sizing:
- **Container**: `w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all`
- **Active Item**: `bg-[#1E293B] text-white font-semibold shadow-xs` (Icon: `text-white w-4 h-4`)
- **Inactive Item**: `text-[#475569] hover:text-[#0F172A] hover:bg-gray-50` (Icon: `text-[#64748B] w-4 h-4`)
- **Badge**: `text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ml-auto`

---

## 3. Table System & Strict Row Sizing Specifications (`TableComponent.tsx`)

MantraAssist enforces a uniform, dense clinical table architecture across all pages (`Invoices`, `Clients`, `CallLogs`, `Services`, `Claims`, `Reports`, `UserManagement`).

### 3.1 Table Container & Table Sizing
- **Container Shell**: `bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs`
- **Table Tag**: `<table className="w-full caption-bottom text-xs border-collapse">`
- **Overflow Shell**: `overflow-x-auto`

### 3.2 Table Header (`<thead>`)
- **Background**: Dark Navy Slate Gradient `bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white select-none rounded-none border-b border-border/80`
- **Cell Height & Padding**: `px-3.5 py-2`
- **Typography**: `text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap` (`fontFamily: "Outfit, sans-serif"`)
- **Column 1 (Checkbox)**: `w-10 px-3 py-1.5 text-center`
- **Column 2 (Column Customizer Gear)**: `w-9 px-2 py-1.5 text-center relative`

### 3.3 Table Body Row Sizing (`<tbody>`)
The application enforces an **ultra-compact 32px height** for clinical data density:

| Property | Exact Class / Value | Details |
| :--- | :--- | :--- |
| **Row Height** | `h-[32px]` | Mandatory fixed compact height across all data rows |
| **Row Border** | `border-b border-border/60` | Subtle hairline divider between rows |
| **Rest Background** | `bg-white` | Pure white background baseline |
| **Hover State** | `hover:bg-[#F1F5F9]` | High-legibility light slate hover highlight |
| **Selected State** | `bg-[#E8F0FE]` | Soft brand-tinted blue selection state |
| **Cell Padding** | `px-3.5 py-1` | Compact vertical padding to fit 32px row constraint |
| **Cell Typography** | `text-xs text-gray-800 whitespace-nowrap align-middle` | Standard DM Sans body typography |
| **Numeric Columns** | `text-right font-mono tabular-nums` | Tabular numeral right-alignment for totals, fees, and IDs |

#### Action Columns in Table:
- **Checkbox Cell**: `w-10 px-3 py-1 text-center align-middle`. Input: `w-3.5 h-3.5 cursor-pointer border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7]`.
- **Hamburger Action Menu**: `w-9 px-2 py-1 text-center align-middle`. Button: `p-1 hover:bg-gray-200/80 rounded-none text-gray-400 hover:text-gray-700`.

### 3.4 Table Pagination Toolbar
- **Container**: `border-t border-border px-4 py-2.5 bg-white`
- **Rows Per Page Selector**: Dropdown options `[20, 50, 100]` (Default: 20) with `text-xs text-gray-500 font-display`.
- **Navigation Controls**: First (`ChevronsLeft`), Previous (`ChevronLeft`), Next (`ChevronRight`), Last (`ChevronsRight`) buttons with `p-1 rounded hover:bg-gray-100 disabled:opacity-30`.

---

## 4. Card & Section Architectural Standards

### 4.1 Card Container Anatomy
- **Base Card**: `bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs`
- **Card Spacing Hierarchy**: Standard section gap is `space-y-4` or `space-y-5`.
- **Card Title Bar**:
  ```tsx
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <GripVertical className="w-3.5 h-3.5 text-slate-300" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
        {sectionTitle}
      </h3>
    </div>
  </div>
  ```

### 4.2 Form Inputs inside Cards
- **Label**: `text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5`
- **Input Container**: `relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all`
- **Input Text**: `text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none flex-1`
- **Trailing Icon**: `w-4 h-4 text-slate-400 shrink-0`

---

## 5. Strict "+ Add Field" & "+ Add Section" Button Rules

### 5.1 The Unified Greyish Subtle Text Button Specification
To prevent visual clutter in forms, cards, and profile drawers, **all `+ Add Field` and `+ Add Section` buttons MUST strictly follow the subtle greyish text button standard**:

```tsx
/* Standard "+ Add Field" inside any section or drawer */
<div className="flex justify-end mt-4 pt-1">
  <button
    type="button"
    onClick={handleOpenAddField}
    className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
  >
    <Plus className="w-3.5 h-3.5" />
    Add Field
  </button>
</div>

/* Standard "+ Add Section" at the bottom of cards / drawers */
<div className="flex justify-end pt-2 pb-2">
  <button
    type="button"
    onClick={handleOpenAddSection}
    className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
  >
    <Plus className="w-4 h-4" />
    Add Section
  </button>
</div>
```

### 5.2 Rules for Buttons:
1. **Never use blue pill containers** for `+ Add Field` in profile drawers or sections. No background fills (`bg-blue-50`), no solid borders (`border-blue-200`), no bright blue text (`text-[#1456f0]`).
2. **Color Token**: `text-slate-500` default, transitioning to `text-slate-700` with `hover:underline` on hover.
3. **Alignment**: Always aligned to the bottom right (`flex justify-end`) of the respective container.

---

## 6. AI Voices & Models Configuration (`Settings.tsx` & `Process.tsx`)

### 6.1 Top Bar Switcher (Settings > Voices & Models)
- **Container**: Clean segmented pill toggle without outer white container bloat.
- **Modes**: Strictly `Models` and `Voices` tabs with **NO count badges or active numbers**.
- **Active Pill**: `bg-white text-gray-900 font-bold shadow-xs px-4 py-1.5 rounded-lg text-xs`
- **Inactive Pill**: `text-gray-500 hover:text-gray-900 font-medium px-4 py-1.5 text-xs`

### 6.2 AI Model Cards
- **Container**: `border border-gray-200/80 bg-white rounded-xl p-3.5 flex items-center justify-between`
- **Official Logos**: Official SVG brand icons for Google Gemini, OpenAI, Anthropic Claude, DeepSeek, and Meta Llama.
- **Content**:
  - Model Name: `text-sm font-bold text-gray-900`
  - Provider: `text-xs text-gray-500 font-medium`
- **Active Toggle**:
  ```tsx
  <div className="w-9 h-5 bg-gray-200 peer-checked:bg-emerald-600 rounded-full after:rounded-full after:bg-white after:h-4 after:w-4 after:top-[2px] after:left-[2px]" />
  ```

### 6.3 Voice Engine Cards (20 Default Voices)
- **Container**: `border border-gray-200/80 bg-white rounded-xl p-3.5 flex items-center justify-between`
- **Play Button**: `w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center shrink-0`
- **Identity**: `{Name} - {Role}` (`text-sm font-bold text-gray-950 font-display`)
- **Metadata**: `{Nationality} · {Gender} · English` (`text-xs text-gray-500 font-medium font-sans`)
- **Active Toggle**: Standard Emerald toggle switch (`peer-checked:bg-emerald-600`).

### 6.4 Dropdown Integration in Workflows (`Process.tsx`)
In AI Agent configuration steps:
- **Active Lists Only**: Dropdowns only list enabled models and active voices.
- **Embedded CTA**: The "View more" link is embedded **directly inside the dropdown menu** rather than as a disconnected header button.
- **Value Handling**:
  ```tsx
  <select
    value={selectedAIModel}
    onChange={(e) => {
      if (e.target.value === "__view_more_models__") {
        navigate('/settings?tab=voice-config&sub=models');
        return;
      }
      setSelectedAIModel(e.target.value);
    }}
    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl appearance-none text-sm font-medium text-gray-800 focus:border-blue-500 focus:outline-none pr-10 cursor-pointer shadow-2xs"
  >
    {activeAIModels.map((m) => (
      <option key={m.id} value={m.name}>{m.name} ({m.provider})</option>
    ))}
    <option disabled value="">──────────</option>
    <option value="__view_more_models__" className="text-blue-600 font-semibold">
      Choose from library →
    </option>
  </select>
  ```

---

## 7. Profile Drawers Architecture (Organization & Team Member)

### 7.1 Drawer Dimensions & Positioning
- **Width**: `w-full max-w-[580px]` (or `w-[540px]` on standard laptop viewports).
- **Positioning**: Fixed right edge (`fixed inset-y-0 right-0 z-50 bg-white shadow-2xl flex flex-col`).

### 7.2 Header Bar
- **Header Layout**: `p-4 border-b border-gray-200/90 flex items-center justify-between bg-white`
- **Entity Avatar**: `w-9 h-9 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs`
- **Status Pill**: `bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full`
- **Actions**:
  - `Cancel`: `px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50`
  - `Save Changes`: `px-4 py-1.5 rounded-xl bg-[#1E293B] text-white text-xs font-semibold hover:bg-slate-800 shadow-xs flex items-center gap-1.5`

### 7.3 Drawer Body Layout
- **Scroll Container**: `flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50`
- **Sections**:
  - `BASIC INFO` Card
  - `ORGANIZATION LOCATIONS` Card (with inline `+ Add Location` modal)
  - `BILLING INFO` Card
  - Dynamic Custom Sections Cards
  - Bottom `+ Add Section` trigger

---

## 8. Summary Checklist for Developers & Designers

- [x] **Table Row Height**: Strictly `h-[32px]` with `px-3.5 py-1` padding.
- [x] **Table Headers**: Dark Navy Slate gradient (`from-[#181e25] to-[#2c3e50]`) with uppercase white text.
- [x] **Sidebar Section**: Named `REVENUE & INSIGHTS` (never Billing & Insights).
- [x] **Sidebar Section**: Named `CUSTOMIZATIONS` (never Automations).
- [x] **Workflow Page Header**: Named `Workflow` (never Process Settings).
- [x] **Add Field Buttons**: Always subtle greyish text buttons (`text-slate-500 hover:text-slate-700 hover:underline`), never blue pill buttons.
- [x] **Add Section Buttons**: Always subtle greyish text buttons (`text-slate-500 hover:text-slate-700 hover:underline`).
- [x] **Voice & Model Top Bar**: Clean toggle with `Models` and `Voices` tabs; no numbers/badges.
- [x] **Workflow Selects**: Embed `Choose from library →` directly inside `<select>` options.

# MantraAssist Design System Specification (`DESIGN_NAVODYA.md`)

**Version 2.2 — Clinical Glassmorphic System (Unified Telephony & Clinical Palette)**
A light, trustworthy canvas for an AI agent that touches clinical work. Every rule below exists to serve two goals at once: **legibility under pressure** (a clinician scanning a panel between patients) and **transparency of autonomy** (a person always knows what the agent did and why).

---

## 0. Design Principles

1. **Clinical trust over cleverness.** No dark patterns, no ambiguous copy, no silent state changes. If the agent did something, it's visible and it's logged.
2. **Unified, Restrained Color Grammar.** No random, disjointed accent colors (no arbitrary purples, magentas, or bright yellows). The palette is strictly locked to the **Navy-to-Slate, Electric Brand Blue, Clinical Emerald, and Slate Neutral** hierarchy established in the Live Telephony operations console.
3. **Calm authority.** The frosted-light canvas plus navy-to-slate gradient focal points read as *competent*, not cold — this is a control room, not a hospital corridor.
4. **Transparency of autonomy.** Every agent action is sourced, reversible where possible, and gated by human confirmation where the stakes are clinical (see §11).
5. **Data integrity at a glance.** Tabular numerals, a locked semantic color grammar, and icon+text redundancy so nothing important is communicated by color alone.
6. **One hand to one monitor.** The same system has to work one-thumb in a hallway and dense, multi-pane on a clinical workstation display (see §5).

---

## System Directives & Non-Negotiable Rules

1. **Strict Design Aesthetic (Fixed Unified Palette)**: 
   - **Canvas & Glass**: Light clinical glassmorphic canvas with warm-neutral backdrop (`#fafafa`), frosted-glass surfaces (`rgba(255,255,255,0.68)`), crisp white baseline containers (`#ffffff`), and slate dividing borders (`#e2e8f0` / `rgba(24,30,37,0.07)`).
   - **Navy-to-Slate Focal Gradients**: Dark gradient focal points (`#181e25 → #243342 → #2c3e50`) for Hero containers, dark elevated surfaces, and the active navigation pill.
   - **Electric Brand Blue**: `#1456f0` (Primary button & active focus ring), `#2563eb` / `#1d4ed8` (Telephony call streams, links, active badges), `#eff6ff` (Subtle blue tinted backgrounds).
   - **Clinical Emerald (Verified & Live)**: `#10b981` (Live dot pulse & verified icons), `#047857` (High-contrast verified text), `#ecfdf5` (Success badge backgrounds).
   - **Slate Text & Monochromatic Hierarchy**: `#222222` (High-contrast display text), `#45515e` (Body copy & tables), `#64748b` (Secondary labels & subtitles), `#94a3b8` (Subtle placeholders).
2. **Typography Rules**:
   - **Body, Controls, Tables, Navigation**: MUST use `font-sans` (DM Sans / `--font-dm-sans`).
   - **Headings, Display Metrics, Hero Titles**: MUST use `font-display` (Outfit / `--font-outfit`).
   - **Clinical data, IDs, timestamps, code, agent trace logs**: MUST use `font-mono` (JetBrains Mono / `--font-jetbrains-mono`).
   - **NEVER** substitute typography classes with system standard fonts.
3. **No Pure Black**: Text and backgrounds must never use `#000000`. Use `#222222` for high-contrast display text, `#0a0a0a` only as an extreme dark-mode fallback, and `#181e25` for dark solid/gradient surfaces. Shadows follow the same rule — see §7, all shadows are navy-tinted (`rgba(24,30,37,x)`), never pure black.
4. **Rounding Consistency**: Primary action buttons are pill-shaped (`rounded-full` / `9999px`). Data cards range from `rounded-xl` to `rounded-3xl` (`rounded-[20px]` / `rounded-[28px]`).
5. **Motion is restrained, not decorative.** Motion exists to explain a state change (loading, agent reasoning, success) — never as ambient flourish. Full tokens in §9.
6. **Color is never the only signal.** Every status pill pairs a color with an icon and a text label (see §4.4, §11) — required for colorblind safety and clinical accuracy.

---

## 1. Typography System

### 1.1 Type Roles

| Role | Family | Variable | Used For |
| :--- | :--- | :--- | :--- |
| **Display** | Outfit | `--font-outfit` | Headings, hero titles, big stat metrics, nav-pill active label |
| **Sans** | DM Sans | `--font-dm-sans` | Body copy, controls, tables, navigation, form labels |
| **Mono** | JetBrains Mono | `--font-jetbrains-mono` | Patient/record IDs, MRNs, dosages, timestamps, agent tool-call traces, code |

### 1.2 Next.js Font Loading

```ts
// app/fonts.ts
import { Outfit, DM_Sans, JetBrains_Mono } from 'next/font/google'

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
})
```

```tsx
// app/layout.tsx
import { outfit, dmSans, jetbrainsMono } from './fonts'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans bg-[#fafafa] text-[#222222] antialiased">
        {children}
      </body>
    </html>
  )
}
```

### 1.3 Fluid Type Scale

All display and heading sizes scale fluidly between a 375px and 1920px viewport using `clamp()`:

| Role | Mobile | Desktop | `clamp()` | Family | Weight | Line-height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Display 2XL (marketing hero) | 2.5rem / 40px | 4.5rem / 72px | `clamp(2.5rem, 1.9rem + 3vw, 4.5rem)` | display | 700 | 1.05 | -0.02em |
| Display XL (page hero) | 2rem / 32px | 3rem / 48px | `clamp(2rem, 1.7rem + 1.5vw, 3rem)` | display | 700 | 1.1 | -0.015em |
| Display L (section header / stat count) | 1.75rem / 28px | 2.25rem / 36px | `clamp(1.75rem, 1.6rem + 0.75vw, 2.25rem)` | display | 700 | 1.15 | -0.01em |
| H1 | 1.5rem / 24px | 1.875rem / 30px | `clamp(1.5rem, 1.4rem + 0.5vw, 1.875rem)` | display | 600 | 1.2 | -0.01em |
| H2 | 1.25rem / 20px | 1.5rem / 24px | `clamp(1.25rem, 1.2rem + 0.25vw, 1.5rem)` | display | 600 | 1.25 | 0 |
| H3 | 1.125rem / 18px | 1.25rem / 20px | — | display | 600 | 1.3 | 0 |
| H4 / Card title | 1rem / 16px | 1.125rem / 18px | — | display | 600 | 1.35 | 0 |
| Body L | 1.0625rem / 17px | 1.125rem / 18px | — | sans | 400 | 1.65 | 0 |
| Body M (default) | 0.9375rem / 15px | 1rem / 16px | — | sans | 400 | 1.6 | 0 |
| Body S | 0.8125rem / 13px | 0.875rem / 14px | — | sans | 500 | 1.55 | 0 |
| Caption | 0.75rem / 12px | 0.75rem / 12px | — | sans | 500 | 1.4 | 0.01em |
| Overline / eyebrow label | 0.6875rem / 11px | 0.6875rem / 11px | — | sans, uppercase | 600 | 1.3 | 0.08em |
| Data / mono (IDs, doses, timestamps) | 0.8125rem / 13px | 0.875rem / 14px | — | mono | 500 | 1.5 | 0 |

**Numeric rule:** Any numeric clinical or financial figure (stat cards, table columns, dosage fields, timestamps) MUST use `font-variant-numeric: tabular-nums` (automatic on `font-mono`, opt-in via `.tabular-nums` for `font-sans`).

---

## 2. Unified Color System & Design Tokens (Fixed Telephony Palette)

### 2.1 Canvas & Surface Tokens

| Token | Light Mode | Dark Mode | Tailwind (light) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Canvas** | `#fafafa` | `#14181d` | `bg-[#fafafa]` | Master dashboard & viewport background |
| **Foreground Baseline** | `#ffffff` | `#181e25` | `bg-white` | White solid containers, input backgrounds |
| **Glass Base** | `rgba(255,255,255,0.68)` | `rgba(255,255,255,0.06)` | `bg-white/70` | Default frosted card background |
| **Glass Subtle** | `rgba(255,255,255,0.38)` | `rgba(255,255,255,0.03)` | `bg-white/40` | Sub-containers, pipeline columns |
| **Glass Toolbar** | `rgba(255,255,255,0.50)` | `rgba(255,255,255,0.05)` | `bg-white/50` | Top header bar, tab bar containers |
| **Glass Edge (highlight)** | `rgba(255,255,255,0.90)` top border | `rgba(255,255,255,0.08)` top border | `border-t border-white/90` | Specular light highlight on glass edges |
| **Glass Border** | `rgba(24,30,37,0.07)` | `rgba(255,255,255,0.08)` | `border-[#e2e8f0]` | Clean structural boundary borders |

### 2.2 Navy-to-Slate Focal Gradients

```css
--navy-gradient: linear-gradient(135deg, #181e25 0%, #243342 50%, #2c3e50 100%);
--navy-pill:     linear-gradient(135deg, #181e25 0%, #2c3e50 100%);
```

Used exclusively for Hero banners, active navigation items, and dark elevated control surfaces.

### 2.3 Electric Blue & Telephony Stream Palette

```text
Blue-50   #eff6ff   Subtle tinted backgrounds (selected rows, active chips, stat icon boxes)
Blue-100  #dbeafe   Hover background on light surfaces
Blue-400  #60a5fa   Dark-surface link and active icon highlights
Blue-500  #3b82f6   Icons, progress rings, and live telephony stream channels
Blue-600  #2563eb   Telephony stream gradients & text-safe link accents (4.95:1 AA)
Blue-700  #1d4ed8   High-contrast status text on Blue-50 badges (6.4:1 AA)
Brand Primary #1456f0 Primary action buttons, active focus rings (5.56:1 AA)
```

### 2.4 Clinical Emerald (Verified & Live Status)

```text
Emerald-50   #ecfdf5   Verified badge background
Emerald-500  #10b981   Live pulse dot, healthy clinical icons (2.4:1 on light)
Emerald-700  #047857   Text-safe verified label on Emerald-50 badges (5.25:1 AAA)
```

### 2.5 Text Hierarchy Tokens

| Level | Light Token | Contrast on Canvas | Application |
| :--- | :--- | :--- | :--- |
| **Primary Display** | `#222222` | 15.2:1 — **AAA** | H1 headers, stat metric counts, hero titles |
| **Body / Nav** | `#45515e` | 7.8:1 — **AAA** | Table cells, nav labels, paragraph copy |
| **Secondary / Muted** | `#64748b` | 4.6:1 — **AA** | Subtitles, section descriptors, meta information |
| **Tertiary / Subtle** | `#94a3b8` | 2.5:1 — Decorative | Placeholder text, non-critical border cues |

---

## 3. Spacing & Layout Grid

Base unit is **4px**; section rhythm is prescribed explicitly:

| Breakpoint | Page padding (inline) | Card padding | Section gap |
| :--- | :--- | :--- | :--- |
| `xs` / `sm` (< 768px) | 16–20px | 16–20px | 32–40px |
| `md` (≥ 768px) | 24px | 24px | 48px |
| `lg` (≥ 1024px) | 32px | 28px | 56px |
| `xl` / `2xl` (≥ 1280px) | 40px | 28–32px | 64px |
| `3xl` (≥ 1920px) | 40px, capped at 1760px | 32px | 64px |

---

## 4. Responsive Breakpoints

| Breakpoint | Min-width | Typical Devices | Navigation Pattern |
| :--- | :--- | :--- | :--- |
| **xs / sm** | 0–640px | Mobile Phones | Bottom tab bar, 44px+ touch targets |
| **md** | 768px | Tablet Portrait | Collapsible 72px rail sidebar + top bar |
| **lg / xl** | 1024–1280px | Laptops & Standard Monitors | Full 264px persistent sidebar + 2-column split |
| **2xl / 3xl** | 1536–1920px | Clinical Workstations & Ultra-wide | 1760px max container with persistent split view |

---

## 5. Elevation, Blur & Glassmorphism

### 5.1 Blur Tokens
```css
--glass-blur-xs: 4px;    /* Tooltips & chips */
--glass-blur-sm: 8px;    /* Toolbars & tab bars */
--glass-blur-md: 16px;   /* Default card (Glass Base) */
--glass-blur-lg: 24px;   /* Modals & drawers */
--glass-blur-xl: 40px;   /* Full-page overlays */
```
Formula: `backdrop-filter: blur(var(--glass-blur-md)) saturate(160%);`

### 5.2 Navy-Tinted Shadows (Never Pure Black)
```css
--shadow-xs: 0 1px 2px rgba(24,30,37,0.04);
--shadow-sm: 0 2px 6px rgba(24,30,37,0.05), 0 1px 2px rgba(24,30,37,0.04);
--shadow-md: 0 8px 20px rgba(24,30,37,0.07), 0 2px 4px rgba(24,30,37,0.05);
--shadow-lg: 0 16px 40px rgba(24,30,37,0.10), 0 4px 8px rgba(24,30,37,0.06);
--shadow-xl: 0 28px 64px rgba(24,30,37,0.16);
--shadow-focus-blue: 0 0 0 4px rgba(20,86,240,0.15);
--shadow-cta-navy: 0 10px 28px rgba(24,30,37,0.28);
```

---

## 6. Border Radius Scale

| Token | Value | Usage |
| :--- | :--- | :--- |
| `radius-xs` | 6px | Chips, tags, checkboxes |
| `radius-sm` | 10px | Inputs, small buttons, small badges |
| `radius-md` | 14px | Dropdown menus, secondary cards |
| `radius-lg` | 20px | Standard data cards |
| `radius-xl` | 28px | Hero/feature cards, modals |
| `radius-full` | 9999px | Pill buttons, avatars, status dots |

---

## 7. Iconography

- **Library:** Lucide Icons.
- **Stroke:** 1.5px default, 2px at sizes ≤16px.
- **Sizes:** 14 / 16 / 20 / 24 / 32px.
- **Color:** Inherits `currentColor` automatically.

---

## 8. Motion & Animation Tokens

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--duration-fast: 160ms;
--duration-base: 240ms;
--duration-slow: 400ms;
--duration-agent-pulse: 1800ms;
```

---

## 9. Component Specifications

### 9.1 Buttons
- **Primary Pill**: `linear-gradient(135deg, #1456f0 0%, #2563eb 100%)`, white `DM Sans font-semibold` text, `--shadow-cta-navy`.
- **Secondary**: `bg-white/60`, 1px `#e2e8f0` border, `text-[#45515e]`.
- **Ghost**: Transparent, `text-[#45515e]`, hover `bg-blue-50 text-blue-600`.
- **Destructive**: Flat `red-600` fill (`#dc2626`).

### 9.2 Data & Stat Cards
`Glass Base` background, `radius-lg` (20px), `--shadow-sm` at rest → `--shadow-md` on hover. Metric in Outfit Display (`clamp(1.75rem, 1.6rem + 0.75vw, 2.25rem)`), tabular-nums. Supporting label in `text-slate-500` (13px).

### 9.3 Semantic Status Badge (Icon + Color + Text)
```tsx
<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
  Verified
</span>
```

### 9.4 Tables
Sticky header at `bg-white/95` + blur; row hover `bg-slate-50/80`. MRN, IDs, and financial columns use `font-mono tabular-nums`.

### 9.5 Forms & Inputs
White baseline background, `#e2e8f0` border, focus ring with `var(--shadow-focus-blue)` and border `#1456f0`. Error inputs use `#dc2626` border + inline warning icon + `red-700` message.

### 9.6 Navigation
- **Persistent Sidebar (264px)**: Frosted glass base with category dividers.
- **Active Nav Item**: Navy-to-slate gradient pill (`#181e25 → #2c3e50`), white text, blue active icon `#60a5fa`.

---

## 10. Agentic Interface Patterns

- **Agent Presence Ring**: Multi-color navy/blue/emerald continuous ring animation (`--duration-agent-pulse`) indicating active reasoning.
- **Thinking State with Plain Language**: Shimmer skeleton with descriptive text (*"Querying EHR medication records..."*).
- **Tool-Call Trace Chips**: Slate/blue chips (*"Queried EHR Record ✓"*, *"OCR Cashless Verified ✓"*).
- **Human-Confirmation Gate**: Clinical proposal card with mandatory **Approve / Edit / Decline** buttons for high-stakes medical/financial actions.
- **Streaming Caret**: 2px `blue-600` blinking caret (530ms).

---

## 11. Accessibility & Compliance

- **Contrast Floor**: 4.5:1 for body copy (WCAG AA), 15.2:1 for display headings (WCAG AAA).
- **Color is never the sole cue**: All statuses pair a colored background with a Lucide icon and text label.
- **Focus Rings**: Mandatory 2px `blue-600` ring (`--shadow-focus-blue`) on all interactive controls.
- **Reduced Motion**: Graceful static fallback under `@media (prefers-reduced-motion: reduce)`.

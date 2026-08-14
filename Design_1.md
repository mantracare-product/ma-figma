# MantraAssist Design System Specification (`DESIGN.md`)

---

## System Directives & Non-Negotiable Rules

1. **Strict Design Aesthetic**: Light, clinical glassmorphic canvas with warm-neutral backdrops (`#fafafa`), frosted-glass surfaces, dark navy-to-slate gradient focal points (`#181e25 → #2c3e50`), and electric blue accenting (`#1456f0` / `#3b82f6`).
2. **Typography Rules**:
   - **Body, Controls, Tables, Navigation**: MUST use `font-sans` (DM Sans / `--font-dm-sans`).
   - **Headings, Display Metrics, Hero Titles**: MUST use `font-display` (Outfit / `--font-outfit`).
   - **NEVER** substitute typography classes with system standard fonts.
3. **No Pure Black**: Text and backgrounds must never use `#000000`. Use `#222222` for high-contrast display text, `#0a0a0a` for dark mode fallback, and `#181e25` for dark solid/gradient surfaces.
4. **Rounding Consistency**: Primary action buttons are pill-shaped (`rounded-full`). Data cards range from `rounded-xl` to `rounded-3xl` or `rounded-4xl` (`rounded-[28px]` / `rounded-[1.5rem]`).

---

## 1. Color System & Design Tokens

### 1.1 Canvas & Surface Tokens

| Token                | CSS Variable / Hex         | Tailwind Equivalent | Primary Usage                                         |
| :------------------- | :------------------------- | :------------------ | :---------------------------------------------------- |
| **Page Canvas**      | `#fafafa`                  | `bg-[#fafafa]`      | Master dashboard & auth right-panel canvas background |
| **Foreground Dark**  | `#0a0a0a`                  | `text-[#0a0a0a]`    | Fallback for standard text in dark mode contexts      |
| **Foreground Light** | `#ffffff`                  | `bg-white`          | White baseline containers, input focus states         |
| **Glass Base**       | `rgba(255, 255, 255, 0.6)` | `bg-white/60`       | Default frosted card background                       |
| **Glass Subtle**     | `rgba(255, 255, 255, 0.3)` | `bg-white/30`       | Sub-containers, table backdrop fills                  |
| **Glass Toolbar**    | `rgba(255, 255, 255, 0.4)` | `bg-white/40`       | Secondary toolbars, tab bar containers                |

### 1.2 Text Hierarchy Tokens

| Level                 | Hex / Utility           | Tailwind String  | Application                                               |
| :-------------------- | :---------------------- | :--------------- | :-------------------------------------------------------- |
| **Primary Display**   | `#222222`               | `text-[#222222]` | Primary H1 headers, stat metric counts, key title text    |
| **Body / Nav**        | `#45515e`               | `text-[#45515e]` | Table body cells, default nav labels, main paragraph text |
| **Secondary / Muted** | `slate-500` (`#64748b`) | `text-slate-500` | Subtitles, section descriptors, meta info                 |
| **Tertiary / Subtle** | `slate-400` (`#94a3b8`) | `text-slate-400` | Placeholder text, stat labels, uppercase headers          |
| **Ultra-Muted**       | `#8e8e93`               | `text-[#8e8e93]` | Secondary-sidebar section group titles, tertiary text     |

### 1.3 Brand, Accent & Status Tokens

```text
Brand Blue Primary:  #1456f0  (text-[#1456f0] / bg-[#1456f0])
Brand Blue Accent:   #3b82f6  (blue-500 - Stat icons, standard accent)
Brand Blue Deep:     #2563eb  (blue-600 - Header text span accents)
Brand Blue Light:    #60a5fa  (blue-400 - Auth dark hero highlights)

Navy Gradient:       from-[#181e25] to-[#2c3e50] (Primary active nav pill, dark CTAs, hero)
Success Emerald:     #10b981 / #16a34a (Usage < 70%, success tags)
Warning Amber:       #f59e0b (Usage 70%-90%, credit icons)
Danger Red:          #ef4444 / #dc2626 (Usage > 90%, destructive CTAs, error alerts)
```
